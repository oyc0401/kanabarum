// particleRewriter.ts
import type kuromoji from "kuromoji";
import type { Tokenizer } from "./tokenizer";
import { SpecialDictionary } from "./dictionary";

type Range = { start: number; end: number }; // [start, end)

function rangesOverlap(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

function buildProtectedRanges(text: string, keys: string[]): Range[] {
  const sorted = [...new Set(keys)].sort((a, b) => b.length - a.length);
  const ranges: Range[] = [];

  for (const key of sorted) {
    if (!key) continue;
    let from = 0;
    while (true) {
      const idx = text.indexOf(key, from);
      if (idx === -1) break;

      const cand: Range = { start: idx, end: idx + key.length };
      if (!ranges.some((r) => rangesOverlap(r, cand))) {
        ranges.push(cand);
      }
      from = idx + 1;
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

function isProtectedSpan(protectedRanges: Range[], start: number, end: number) {
  for (const r of protectedRanges) {
    if (start < r.end && end > r.start) return true;
  }
  return false;
}

export const HARD_BOUNDARY_SURF = new Set([
  "。",
  "、",
  "！",
  "？",
  "!",
  "?",
  " ",
  "　",
]);
const HARD_BOUNDARY_DETAIL1 = new Set([
  "句点",
  "読点",
  "括弧開",
  "括弧閉",
  "空白",
]);

const LEXICAL_HE_ENDINGS = [
  "いにしへ",
  "おきへ",
  "もとへ",
  "すえへ",
  "すゑへ",
  "かみへ",
  "くにへ",
  "きしへ",
] as const;

function isHardBoundaryToken(t: kuromoji.IpadicFeatures): boolean {
  if (t.pos !== "記号") return false;
  if (HARD_BOUNDARY_SURF.has(t.surface_form)) return true;
  return HARD_BOUNDARY_DETAIL1.has(t.pos_detail_1 ?? "");
}
function isContentToken(t: kuromoji.IpadicFeatures): boolean {
  if (t.pos === "記号") return !isHardBoundaryToken(t);
  return true;
}

function prevContentIdx(tokens: kuromoji.IpadicFeatures[], i: number): number {
  for (let j = i - 1; j >= 0; j -= 1) if (isContentToken(tokens[j])) return j;
  return -1;
}
function nextContentIdx(tokens: kuromoji.IpadicFeatures[], i: number): number {
  for (let j = i + 1; j < tokens.length; j += 1)
    if (isContentToken(tokens[j])) return j;
  return -1;
}
function nextBoundaryOrEnd(tokens: kuromoji.IpadicFeatures[], i: number): boolean {
  for (let j = i + 1; j < tokens.length; j += 1) {
    if (isHardBoundaryToken(tokens[j])) continue;
    return false;
  }
  return true;
}

export type TokenSpan = {
  start: number; // rewritten 기준
  end: number; // rewritten 기준
  surface: string;

  pos?: string;
  pos1?: string;
  pos2?: string;
  pos3?: string;

  // ✅ 원문 기반 힌트: katakana 포함 여부(노ート 같은 케이스 차단용)
  originHadKatakana?: boolean;
};

/**
 * ✅ 핵심:
 * - 토큰화는 "prewrite 이전"에 수행 (원문/정규화 기준)
 * - prewrite는 "토큰 품사"를 쓰되, 실제 replace는 hiraganaText slice로 수행
 * - 결과로 rewrittenText + rewrittenTokenSpans를 만들어 core로 넘김
 *
 * 가정: hiraganaText와 originalText는 길이가 동일 (toHiragana는 1:1 치환)
 */
export function rewriteParticlesFromTokenization(
  originalText: string,
  hiraganaText: string,
  tokenizerTokens: kuromoji.IpadicFeatures[],
): { rewritten: string; spans: TokenSpan[] } {
  const protectedRanges = buildProtectedRanges(
    hiraganaText,
    SpecialDictionary.map(([k]) => k),
  );

  let out = "";
  const spans: TokenSpan[] = [];

  let cursorInText = 0;

  for (let i = 0; i < tokenizerTokens.length; i += 1) {
    const tok = tokenizerTokens[i];
    const wp = (tok as any).word_position as number | undefined;
    const surf = tok.surface_form;

    const start = typeof wp === "number" ? wp - 1 : cursorInText;
    const end = start + surf.length;
    cursorInText = end;

    // 토큰 사이 갭(혹시나)을 보존 + span도 채움(coverage 확보)
    if (start > cursorInText - surf.length) {
      // 이 케이스는 거의 안 나지만 안전장치로 둡니다.
    }
    // cursor tracking이 이미 end로 갔기 때문에, 갭은 별도로 계산
    // (kuromoji는 보통 연속이라 갭 없음)

    const hiraSurf = hiraganaText.slice(start, end);
    const originSurf = originalText.slice(start, end);

    const originHadKatakana = /[\u30A0-\u30FF]/.test(originSurf);

    // 보호 구간이면 리라이트 금지
    if (isProtectedSpan(protectedRanges, start, end)) {
      const outStart = out.length;
      out += hiraSurf;
      spans.push({
        start: outStart,
        end: out.length,
        surface: hiraSurf,
        pos: tok.pos,
        pos1: tok.pos_detail_1 ?? undefined,
        pos2: tok.pos_detail_2 ?? undefined,
        pos3: tok.pos_detail_3 ?? undefined,
        originHadKatakana,
      });
      continue;
    }

    let replaced = hiraSurf;

    // --- は -> わ (계조사) ---
    if (tok.pos === "助詞" && hiraSurf === "は") {
      if (i > 0 && tokenizerTokens[i - 1].surface_form === "は") {
        // keep
      } else if (i + 1 < tokenizerTokens.length && tokenizerTokens[i + 1].surface_form === "は") {
        // keep
      } else {
        const prevIdx = prevContentIdx(tokenizerTokens, i);
        if (prevIdx >= 0) {
          const nextIdx = nextContentIdx(tokenizerTokens, i);
          const hasNextContent = nextIdx >= 0;
          const isEndOrPunct = nextBoundaryOrEnd(tokenizerTokens, i);

          const prevTok = tokenizerTokens[prevIdx];
          const prevHira = hiraganaText.slice(
            (((prevTok as any).word_position as number | undefined) ?? 1) - 1,
            ((((prevTok as any).word_position as number | undefined) ?? 1) - 1) + prevTok.surface_form.length,
          );

          if (
            !prevHira.includes("っ") &&
            tok.pos_detail_1 === "係助詞" &&
            (hasNextContent || isEndOrPunct) &&
            prevTok.pos !== "助詞"
          ) {
            replaced = "わ";
          }
        }
      }
    }

    // --- へ -> え (격조사) ---
    if (tok.pos === "助詞" && hiraSurf === "へ") {
      // 바로 왼쪽이 공백이면 keep
      if (start > 0) {
        const left = hiraganaText[start - 1];
        if (left === " " || left === "　" || left === "\t" || left === "\n" || left === "\r") {
          // keep
        } else {
          const prevIdx = prevContentIdx(tokenizerTokens, i);
          if (prevIdx >= 0) {
            const prevTok = tokenizerTokens[prevIdx];
            const prevWp = (prevTok as any).word_position as number | undefined;
            const prevStart = typeof prevWp === "number" ? prevWp - 1 : 0;
            const prevEnd = prevStart + prevTok.surface_form.length;

            const prevHiraSurf = hiraganaText.slice(prevStart, prevEnd);

            if (LEXICAL_HE_ENDINGS.some((w) => (prevHiraSurf + "へ").endsWith(w))) {
              // keep lexical endings
            } else if (prevHiraSurf.endsWith("の")) {
              // keep "...のへ"
            } else if (tok.pos_detail_1 === "格助詞") {
              replaced = "え";
            }
          }
        }
      }
    }

    const outStart = out.length;
    out += replaced;

    spans.push({
      start: outStart,
      end: out.length,
      surface: replaced,
      pos: tok.pos,
      pos1: tok.pos_detail_1 ?? undefined,
      pos2: tok.pos_detail_2 ?? undefined,
      pos3: tok.pos_detail_3 ?? undefined,
      originHadKatakana,
    });
  }

  return { rewritten: out, spans };
}

/**
 * 외부에서 쓰기 편한 래퍼:
 * - originalText를 tokenizer로 먼저 tokenize
 * - hiraganaText는 호출자가 넘겨줌(길이 동일 가정)
 */
export function tokenizeAndRewriteParticles(
  originalText: string,
  hiraganaText: string,
  tokenizer: Tokenizer,
): { rewritten: string; spans: TokenSpan[]; rawTokens: kuromoji.IpadicFeatures[] } {
  const rawTokens = tokenizer.tokenize(originalText);
  //  console.log(rawTokens)
  const { rewritten, spans } = rewriteParticlesFromTokenization(
    originalText,
    hiraganaText,
    rawTokens,
  );
  return { rewritten, spans, rawTokens };
}