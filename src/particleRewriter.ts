import type kuromoji from "kuromoji";
import type { Tokenizer } from "./tokenizer";
import { SpecialDictionary } from "./dictionary";

type Range = { start: number; end: number }; // [start, end)

function rangesOverlap(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

function buildProtectedRanges(text: string, keys: string[]): Range[] {
  // 긴 키부터 잡아두면 짧은 키가 내부에서 겹치며 끼어드는 걸 자연스럽게 방지할 수 있습니다.
  const sorted = [...new Set(keys)].sort((a, b) => b.length - a.length);
  const ranges: Range[] = [];

  for (const key of sorted) {
    if (!key) continue;
    let from = 0;
    while (true) {
      const idx = text.indexOf(key, from);
      if (idx === -1) break;

      const cand: Range = { start: idx, end: idx + key.length };
      // 이미 보호 중인 range와 겹치면(대개 더 긴 키가 먼저 들어가 있음) 스킵
      if (!ranges.some((r) => rangesOverlap(r, cand))) {
        ranges.push(cand);
      }

      from = idx + 1;
    }
  }

  // 탐색용이라 정렬해두면 디버깅이 편합니다.
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

function isProtectedSpan(protectedRanges: Range[], start: number, end: number) {
  // 토큰이 보호 구간과 조금이라도 겹치면 보호 처리
  for (const r of protectedRanges) {
    if (start < r.end && end > r.start) return true;
  }
  return false;
}

const HARD_BOUNDARY_SURF = new Set(["。", "、", "！", "？", "!", "?", " ", "　"]);
const HARD_BOUNDARY_DETAIL1 = new Set(["句点", "読点", "括弧開", "括弧閉", "空白"]);

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

export function rewriteParticlesWithKuromoji(
  text: string,
  tokenizer: Tokenizer,
): string {
  const tokens = tokenizer.tokenize(text);

  // ✅ 특수사전 키가 등장하는 원문 구간을 먼저 보호합니다.
  const protectedRanges = buildProtectedRanges(
    text,
    SpecialDictionary.map(([k]) => k),
  );

  let out = "";
  let cursor = 0; // word_position 없을 때 fallback

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const surf = token.surface_form;

    // 토큰의 원문 내 위치 계산 (kuromoji는 보통 word_position 제공)
    const wp = (token as any).word_position as number | undefined;
    const start = typeof wp === "number" ? wp - 1 : cursor;
    const end = start + surf.length;
    cursor = end;

    // ✅ 보호 구간이면 조사 변환을 아예 하지 않고 원문 그대로 출력
    if (isProtectedSpan(protectedRanges, start, end)) {
      out += surf;
      continue;
    }

    let replaced = surf;

    if (token.pos === "助詞" && surf === "は") {
      if (i > 0 && tokens[i - 1].surface_form === "は") {
        out += surf;
        continue;
      }
      if (i + 1 < tokens.length && tokens[i + 1].surface_form === "は") {
        out += surf;
        continue;
      }

      const prevIdx = prevContentIdx(tokens, i);
      if (prevIdx >= 0) {
        const nextIdx = nextContentIdx(tokens, i);
        const hasNextContent = nextIdx >= 0;
        const isEndOrPunct = nextBoundaryOrEnd(tokens, i);

        const prev = tokens[prevIdx];
        if (
          !prev.surface_form.includes("っ") &&
          token.pos_detail_1 === "係助詞" &&
          (hasNextContent || isEndOrPunct) &&
          prev.pos !== "助詞"
        ) {
          out += "わ";
          continue;
        }
      }
      out += surf;
      continue;
    }

    if (token.pos === "助詞" && surf === "へ") {

      // 바로 왼쪽이 공백(half/full)이면 'え'로 안 바꿈
      if (start > 0) {
        const left = text[start - 1];
        if (
          left === " " ||  // half-width space
          left === "　" || // full-width space
          left === "\t" || // tab
          left === "\n" || // LF
          left === "\r"    // CR (Windows line ending)
        ) {
          out += surf; // keep "へ"
          continue;
        }
      }
      const prevIdx = prevContentIdx(tokens, i);
      if (prevIdx >= 0) {
        const nextIdx = nextContentIdx(tokens, i);
        const hasNextContent = nextIdx >= 0;
        const isEndOrPunct = nextBoundaryOrEnd(tokens, i);

        const prevSurf = tokens[prevIdx].surface_form;
        if (LEXICAL_HE_ENDINGS.some((w) => (prevSurf + "へ").endsWith(w))) {
          // keep lexical endings
        } else if (prevSurf.endsWith("の")) {
          // "...のへ" pattern
        } else if (token.pos_detail_1 === "格助詞") {
          replaced = "え";
        }
      }
    }

    out += replaced;
  }

  return out;
}

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
