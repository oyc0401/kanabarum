// kanaToHangul.ts
// 전체 변환 파이프라인을 orchestration만 담당하도록 정리했습니다.
import type { Tokenizer } from "./tokenizer";
import { normalizeInputText, toHiragana } from "./normalizer";
import { tokenizeAndRewriteParticles } from "./particleRewriter";
import { coreKanaToHangulConvert } from "./coreConverter";

export type KanaToHangul = (input: string) => string;

export function createKanaToHangul(tokenizer: Tokenizer): KanaToHangul {
  return (input: string) => convertWithTokenizer(input, tokenizer);
}

export function convertWithTokenizer(input: string, tokenizer: Tokenizer): string {
  const normalized = normalizeInputText(input);

  // ✅ 길이 1:1 보장되는 kana 변환을 먼저 수행(스팬 유지)
  const hiragana = toHiragana(normalized);

  // ✅ 핵심: prewrite 이전에 토큰화(=normalized 기준), prewrite는 토큰(pos)을 사용하되 slice는 hiragana 기준
  const { rewritten, spans } = tokenizeAndRewriteParticles(normalized, hiragana, tokenizer);

  // ✅ rewritten + rewritten spans 로 core
  return coreKanaToHangulConvert(rewritten, { tokens: spans });
}
