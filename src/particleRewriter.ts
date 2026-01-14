import type kuromoji from "kuromoji";
import type { Tokenizer } from "./tokenizer";

const HARD_BOUNDARY_SURF = new Set([
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

const isSingleKana = (x: string) =>
  x.length === 1 && /^[\u3040-\u309F\u30A0-\u30FF]$/.test(x);

export function rewriteParticlesWithKuromoji(
  text: string,
  tokenizer: Tokenizer,
): string {
  const tokens = tokenizer.tokenize(text);
  let out = "";

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const surf = token.surface_form;
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
          const nextPos = hasNextContent ? tokens[nextIdx].pos : "";
          const looksDirectionalByVerb =
            nextPos === "動詞" || nextPos === "助動詞";

          const nextSurf = hasNextContent ? tokens[nextIdx].surface_form : "";
          const nextIsSingleKana = hasNextContent && isSingleKana(nextSurf);

          if (!nextIsSingleKana && (looksDirectionalByVerb || isEndOrPunct)) {
            replaced = "え";
          }
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

function prevContentIdx(
  tokens: kuromoji.IpadicFeatures[],
  i: number,
): number {
  for (let j = i - 1; j >= 0; j -= 1) if (isContentToken(tokens[j])) return j;
  return -1;
}

function nextContentIdx(
  tokens: kuromoji.IpadicFeatures[],
  i: number,
): number {
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
