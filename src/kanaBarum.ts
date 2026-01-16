import type { KanaToHangul } from "./kanaToHangul";
import { createKanaToHangul } from "./kanaToHangul";
import { getTokenizer } from "./tokenizer";

/**
 * Kanabarum - 일본어 가나를 한글로 변환하는 클래스
 *
 * @example
 * const kanabarum = new Kanabarum();
 * await kanabarum.init();
 * kanabarum.kanaToHangul("こんにちは"); // "곤니치와"
 */
export class Kanabarum {
  private converter: KanaToHangul | null = null;

  /**
   * 토크나이저를 초기화합니다. 변환 전에 반드시 호출해야 합니다.
   */
  async init(): Promise<void> {
    const tokenizer = await getTokenizer();
    this.converter = createKanaToHangul(tokenizer);
  }

  /**
   * 일본어 가나를 한글로 변환합니다.
   * @param input 변환할 일본어 문자열
   * @returns 한글로 변환된 문자열
   * @throws init()이 호출되지 않은 경우 에러
   */
  kanaToHangul(input: string): string {
    if (!this.converter) {
      throw new Error("Kanabarum is not initialized. Call init() first.");
    }
    return this.converter(input);
  }
}

// ============================================
// Async helper (기존 API 호환)
// ============================================

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

/**
 * 일본어 가나를 한글로 변환합니다. (async helper)
 * init 없이 바로 호출 가능합니다.
 *
 * @example
 * await kanaToHangul("こんにちは"); // "곤니치와"
 */
export async function kanaToHangul(input: string): Promise<string> {
  const converter = await initKanaToHangul();
  return converter(input);
}

export type { KanaToHangul };
