import type { KanaToHangul } from "./kanaToHangul";
import { createKanaToHangul } from "./kanaToHangul";
import { getTokenizer } from "./tokenizer";

let instance: KanaToHangul | null = null;
let initPromise: Promise<KanaToHangul> | null = null;

async function initKanaToHangul(): Promise<KanaToHangul> {
  if (instance) return instance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const tokenizer = await getTokenizer();
    const converter = createKanaToHangul(tokenizer);
    instance = converter;
    return converter;
  })();

  return initPromise;
}

export async function kanaToHangul(input: string): Promise<string> {
  const converter = await initKanaToHangul();
  return converter(input);
}

export const KanaBarum = Object.freeze({
  init: initKanaToHangul,
});

export type { KanaToHangul };
