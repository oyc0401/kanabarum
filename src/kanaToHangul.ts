// lib/kanaToHangul.ts
// 전체 변환 파이프라인을 orchestration만 담당하도록 정리했습니다.
import type { Tokenizer } from "./tokenizer";
import { normalizeInputText, toHiragana } from "./normalizer";
import { rewriteParticlesWithKuromoji } from "./particleRewriter";
import { coreKanaToHangulConvert } from "./coreConverter";

export type KanaToHangul = (input: string) => string;

export function createKanaToHangul(tokenizer: Tokenizer): KanaToHangul {
  return (input: string) => convertWithTokenizer(input, tokenizer);
}

function convertWithTokenizer(input: string, tokenizer: Tokenizer): string {
  const normalized = normalizeInputText(input);
  const hiragana = toHiragana(normalized);
  const rewritten = rewriteParticlesWithKuromoji(hiragana, tokenizer);
  return coreKanaToHangulConvert(rewritten);
}
