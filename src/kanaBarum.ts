import type { KanaToHangul } from "./kanaToHangul";
import { createKanaToHangul } from "./kanaToHangul";
import { getTokenizer } from "./tokenizer";

/**
 * Lazy-initialized public API wrapper.
 * 토크나이저를 빌드/캐시하고, 외부에서는 await kanaToHangul(...)만 호출하면 됩니다.
 */

let cachedConverter: KanaToHangul | null = null;
let pendingInit: Promise<KanaToHangul> | null = null;

async function initKanaToHangul(): Promise<KanaToHangul> {
  if (cachedConverter) return cachedConverter;
  if (pendingInit) return pendingInit;

  pendingInit = (async () => {
    const tokenizer = await getTokenizer();
    const converter = createKanaToHangul(tokenizer);
    cachedConverter = converter;
    return converter;
  })();

  return pendingInit;
}

export async function kanaToHangul(input: string): Promise<string> {
  const converter = await initKanaToHangul();
  return converter(input);
}

export const KanaBarum = Object.freeze({
  init: initKanaToHangul,
});

export type { KanaToHangul };
