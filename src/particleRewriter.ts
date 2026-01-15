// particleRewriter.ts
import type kuromoji from "kuromoji";
import type { Tokenizer } from "./tokenizer";
import { SpecialDictionary, SpecialDictionaryEntry } from "./dictionary";

// --------------------------
// local helper: toHiragana (protectedRanges는 hiraganaText 기준)
// --------------------------
function isKatakanaChar(ch: string) {
  const c = ch.codePointAt(0)!;
  return c >= 0x30a0 && c <= 0x30ff;
}
function toHiragana(s: string): string {
  const n = s.normalize("NFKC");
  return Array.from(n)
    .map((ch) => {
      if (!isKatakanaChar(ch)) return ch;
      return String.fromCodePoint(ch.codePointAt(0)! - 0x60);
    })
    .join("");
}

function dictKeysForHiraganaText(dict: SpecialDictionaryEntry[]): string[] {
  // hiraganaText에서 실제로 등장할 수 있는 키만 모으기:
  // - entry.word 자체는 넣어도 되고(못 찾으면 무해)
  // - hira:true면 toHiragana(word)를 추가로 넣는다
  const keys: string[] = [];
  for (const e of dict) {
    keys.push(e.word);
    if (e.hira) keys.push(toHiragana(e.word));
  }
  // 중복 제거
  return [...new Set(keys)].filter(Boolean);
}

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
function nextBoundaryOrEnd(
  tokens: kuromoji.IpadicFeatures[],
  i: number,
): boolean {
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
  // 코드포인트 배열로 변환 (kuromoji word_position이 코드포인트 기준)
  const hiraChars = Array.from(hiraganaText);
  const originChars = Array.from(originalText);

  // entry 기반
  const protectedRanges = buildProtectedRanges(
    hiraganaText,
    dictKeysForHiraganaText(SpecialDictionary),
  );

  let out = "";
  const spans: TokenSpan[] = [];

  let cursorInText = 0;

  for (let i = 0; i < tokenizerTokens.length; i += 1) {
    const tok = tokenizerTokens[i];
    const wp = (tok as any).word_position as number | undefined;
    const surf = tok.surface_form;
    const surfCpLen = [...surf].length; // 코드포인트 길이

    // kuromoji word_position은 코드포인트 기준 (1-based)
    const start = typeof wp === "number" ? wp - 1 : cursorInText;
    const end = start + surfCpLen;
    cursorInText = end;

    const hiraSurf = hiraChars.slice(start, end).join("");
    const originSurf = originChars.slice(start, end).join("");

    const originHadKatakana = /[\u30A0-\u30FF]/.test(originSurf);

    // ✅ 불필요하고 위험한 isProtected(튜플 기반 + includes 난사) 제거
    // protectedRanges 기반으로만 판단
    if (isProtectedSpan(protectedRanges, start, end)) {
      const outCpStart = [...out].length;
      out += hiraSurf;
      spans.push({
        start: outCpStart,
        end: [...out].length,
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
      } else if (
        i + 1 < tokenizerTokens.length &&
        tokenizerTokens[i + 1].surface_form === "は"
      ) {
        // keep
      } else {
        const prevIdx = prevContentIdx(tokenizerTokens, i);
        if (prevIdx >= 0) {
          const nextIdx = nextContentIdx(tokenizerTokens, i);
          const hasNextContent = nextIdx >= 0;
          const isEndOrPunct = nextBoundaryOrEnd(tokenizerTokens, i);

          const prevTok = tokenizerTokens[prevIdx];
          const prevWpHa = (prevTok as any).word_position as number | undefined;
          const prevStartHa = typeof prevWpHa === "number" ? prevWpHa - 1 : 0;
          const prevEndHa = prevStartHa + [...prevTok.surface_form].length;
          const prevHira = hiraChars.slice(prevStartHa, prevEndHa).join("");

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
      // 바로 왼쪽이 공백이면 keep (코드포인트 배열 사용)
      if (start > 0) {
        const left = hiraChars[start - 1];
        if (
          left === " " ||
          left === "　" ||
          left === "\t" ||
          left === "\n" ||
          left === "\r"
        ) {
          // keep
        } else {
          const prevIdx = prevContentIdx(tokenizerTokens, i);
          if (prevIdx >= 0) {
            const prevTok = tokenizerTokens[prevIdx];
            const prevWp = (prevTok as any).word_position as number | undefined;
            const prevStart = typeof prevWp === "number" ? prevWp - 1 : 0;
            const prevEnd = prevStart + [...prevTok.surface_form].length;

            const prevHiraSurf = hiraChars.slice(prevStart, prevEnd).join("");

            if (
              LEXICAL_HE_ENDINGS.some((w) => (prevHiraSurf + "へ").endsWith(w))
            ) {
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

    const outCpStart = [...out].length;
    out += replaced;

    spans.push({
      start: outCpStart,
      end: [...out].length,
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
): {
  rewritten: string;
  spans: TokenSpan[];
  rawTokens: kuromoji.IpadicFeatures[];
} {
  const rawTokens = tokenizer.tokenize(originalText);
  //  console.log(rawTokens)
  const { rewritten, spans } = rewriteParticlesFromTokenization(
    originalText,
    hiraganaText,
    rawTokens,
  );
  return { rewritten, spans, rawTokens };
}
