import type { KanaToHangul } from "./kanaToHangul";
import { createKanaToHangul } from "./kanaToHangul";
import { getTokenizer } from "./tokenizer.browser";

export class Kanabarum {
  private converter: KanaToHangul | null = null;

  async init(): Promise<void> {
    const tokenizer = await getTokenizer();
    this.converter = createKanaToHangul(tokenizer);
  }

  kanaToHangul(input: string): string {
    if (!this.converter) {
      throw new Error("Kanabarum is not initialized. Call init() first.");
    }
    return this.converter(input);
  }
}

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

export type { KanaToHangul };
