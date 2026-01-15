// coreConverter.ts
import { SpecialDictionary, SpecialDictionaryEntry } from "./dictionary";
import { HARD_BOUNDARY_SURF, TokenSpan } from "./particleRewriter";
 import{ConsClass, MoraInfo, SINGLE,YOUON, LOAN, SMALL_Y, SMALL_V, U_DROP_KEYS} from "./mora"

 // --------------------------
// Kana normalize helpers
// --------------------------
function isHiraganaChar(ch: string) {
  const c = ch.codePointAt(0)!;
  return c >= 0x3040 && c <= 0x309f;
}
function isKatakanaChar(ch: string) {
  const c = ch.codePointAt(0)!;
  return c >= 0x30a0 && c <= 0x30ff;
}
function toHiraganaKey(s: string): string {
  const n = s.normalize("NFKC");
  return Array.from(n).map((ch) => (isKatakanaChar(ch) ? String.fromCodePoint(ch.codePointAt(0)! - 0x60) : ch)).join("");
}
function toKatakanaKey(s: string): string {
  const n = s.normalize("NFKC");
  return Array.from(n).map((ch) => (isHiraganaChar(ch) ? String.fromCodePoint(ch.codePointAt(0)! + 0x60) : ch)).join("");
}

type DictStream = "orig" | "rewritten";
type CompiledDictItem = { keyChars: string[]; answer: string; stream: DictStream };

function compileSpecialDictionary(dict: SpecialDictionaryEntry[]): CompiledDictItem[] {
  const items: CompiledDictItem[] = [];

  for (const e of dict) {
    // 기본: exact word는 원본에서만
    items.push({ keyChars: Array.from(e.word), answer: e.answer, stream: "orig" });

    // hira:true => hiragana 스트림에서만 (입력 전체가 히라로 바뀌는 파이프라인이기 때문)
    if (e.hira) {
      const k = toHiraganaKey(e.word);
      items.push({ keyChars: Array.from(k), answer: e.answer, stream: "rewritten" });
    }

    // kata:true => 원본에서만
    if (e.kata) {
      const k = toKatakanaKey(e.word);
      items.push({ keyChars: Array.from(k), answer: e.answer, stream: "orig" });
    }
  }

  // 긴 키 우선
  items.sort((a, b) => b.keyChars.length - a.keyChars.length);
  return items;
}

const COMPILED_SPECIAL_DICT = compileSpecialDictionary(SpecialDictionary);


function isHiragana(ch: string): boolean {
    const c = ch.codePointAt(0)!;
    return c >= 0x3040 && c <= 0x309f;
  }

  function isKana(ch: string): boolean {
    return isHiragana(ch) || ch === "ー";
  }

export function coreKanaToHangulConvert(
  s: string,
  opts?: { tokens?: TokenSpan[]; original?: string },
): string {
  // 코드포인트 배열로 변환 (surrogate pair 문제 해결)
  const chars = Array.from(s);
  const origChars = Array.from(opts?.original ?? s);
  
  // --- Hangul utilities ---
  const HANGUL_BASE = 0xac00;
  const HANGUL_END = 0xd7a3;

  function isHangulSyllable(ch: string): boolean {
    const c = ch.codePointAt(0)!;
    return c >= HANGUL_BASE && c <= HANGUL_END;
  }

  const JONG = {
    NONE: 0,
    G: 1, // ㄱ
    N: 4, // ㄴ
    M: 16, // ㅁ
    B: 17, // ㅂ
    S: 19, // ㅅ
    NG: 21, // ㅇ
  } as const;

  function addFinal(syl: string, jong: number): string {
    if (!isHangulSyllable(syl)) return syl;
    const code = syl.codePointAt(0)! - HANGUL_BASE;
    const cho = Math.floor(code / 588);
    const jung = Math.floor((code % 588) / 28);
    return String.fromCodePoint(HANGUL_BASE + cho * 588 + jung * 28 + jong);
  }

  function replaceLastHangul(out: string, jong: number): string {
    if (!out) return out;
    const last = out[out.length - 1];
    if (!isHangulSyllable(last)) return out;
    return out.slice(0, -1) + addFinal(last, jong);
  }

  // --- Kana classification ---
  function isHiragana(ch: string): boolean {
    const c = ch.codePointAt(0)!;
    return c >= 0x3040 && c <= 0x309f;
  }
  function isKana(ch: string): boolean {
    return isHiragana(ch) || ch === "ー";
  }

  
  type ReadMora = { key: string; len: number; info?: MoraInfo } | null;

  function readMoraAt(idx: number): ReadMora {
    if (idx >= chars.length) return null;

    const c0 = chars[idx];
    const c1 = chars[idx + 1];

    if (c1 && SMALL_V.has(c1)) {
      const key2 = c0 + c1;
      const info = LOAN[key2];
      if (info) return { key: key2, len: 2, info };
    }

    if (c1 && SMALL_Y.has(c1)) {
      const key2 = c0 + c1;
      const info = YOUON[key2];
      if (info) return { key: key2, len: 2, info };
    }

    const info = SINGLE[c0];
    if (info) return { key: c0, len: 1, info };

    return { key: c0, len: 1, info: undefined };
  }

  function isLabialStart(cons: ConsClass): boolean {
    return cons === "m" || cons === "b" || cons === "p";
  }

  // 토큰 컨텍스트 탐색용
  const tokens = opts?.tokens ?? null;
  let tokIdx = 0;

  function syncTokenIndex(charIndex: number) {
    if (!tokens) return;
    while (tokIdx + 1 < tokens.length && tokens[tokIdx].end <= charIndex) {
      tokIdx++;
    }
  }

  function curToken(charIndex: number): TokenSpan | null {
    if (!tokens) return null;
    syncTokenIndex(charIndex);
    const t = tokens[tokIdx];
    if (t && t.start <= charIndex && charIndex < t.end) return t;
    return null;
  }

  function prevToken(): TokenSpan | null {
    if (!tokens) return null;
    return tokIdx - 1 >= 0 ? tokens[tokIdx - 1] : null;
  }
  function nextToken(): TokenSpan | null {
    if (!tokens) return null;
    return tokIdx + 1 < tokens.length ? tokens[tokIdx + 1] : null;
  }

  // ✅ 유성화 차단 next
  const INITIAL_VOICING_BLOCK_NEXT = new Set(["い", "ひ", "ん", "て"]);

  function peekNextMoraKeySkippingChoonpu(fromIdx: number): string | null {
    let j = fromIdx;
    while (j < chars.length && chars[j] === "ー") j++;
    const m = readMoraAt(j);
    return m?.key ?? null;
  }

  // ✅ "-san" 판별 (코드포인트 인덱스 기준)
  const SAN_PARTICLES = new Set(["は", "わ", "へ", "え", "を", "お"]);
  function isSanHonorificAt(cpIdx: number): boolean {
    const t = curToken(cpIdx);
    if (!t) return false;
    if (cpIdx < 1 || chars[cpIdx - 1] !== "さ") return false;

    // t.start는 코드포인트 인덱스, chars.slice 사용
    const local = chars.slice(t.start, cpIdx + 1).join("");
    if (!local.endsWith("さん")) return false;

    const hasPrefixInsideToken = (cpIdx - 1) > t.start;
    const p = prevToken();
    const prevIsAttachable =
      !!p && p.end === t.start && p.surface.length > 0 && !HARD_BOUNDARY_SURF.has(p.surface);

    if (!hasPrefixInsideToken && !prevIsAttachable) return false;

    const n = nextToken();
    if (!n) return true;
    if (n.pos === "記号" && HARD_BOUNDARY_SURF.has(n.surface)) return true;
    if (n.pos === "助詞" && SAN_PARTICLES.has(n.surface)) return true;
    return false;
  }

  let out = "";
  let i = 0;

  let lastMora: MoraInfo | null = null;

  while (i < chars.length) {
    // 토큰 기반 "단어 시작" 정의: i가 content 토큰 start면 true
     let atTokenStart = false;
    let tokForI: TokenSpan | null = null;

    if (tokens) {
      tokForI = curToken(i);
      // ✅ 토큰 시작이면 일단 단어 시작 후보로 인정
      atTokenStart = !!tokForI && tokForI.start === i;

      // ✅ 유성화/단어시작 판정에서 "기호"와 "원문 카타카나 토큰"만 컷
      if (tokForI?.pos === "記号") atTokenStart = false;
    } else {
      atTokenStart = i === 0;
    }

    // --------------------------
    // ✅ SpecialDictionary (entry 기반 + hira/kata 옵션)
    // --------------------------
    let matchedSpecial = false;

    // 긴 키부터 순회하므로, 앞에서 걸리면 끝
    for (const it of COMPILED_SPECIAL_DICT) {
    const src = it.stream === "orig" ? origChars : chars; // chars=rewritten
    const len = it.keyChars.length;
    if (i + len > src.length) continue;

    let ok = true;
    for (let k = 0; k < len; k++) {
      if (src[i + k] !== it.keyChars[k]) { ok = false; break; }
    }
    if (!ok) continue;

    out += it.answer;
    i += len;

    // 사전 치환은 단어 단위 => 상태 초기화
    lastMora = null;

    matchedSpecial = true;
    break;
  }
    if (matchedSpecial) continue;

    if (chars.slice(i, i + 3).join("") === "ちゃん") {
      out += "쨩";
      i += 3;
      lastMora = { out: "쨩", vowelMain: "a", consClass: "t", wasYouon: true };
      continue;
    }

    const ch = chars[i];

    if (ch === "ー") {
      i += 1;
      continue;
    }



    if (ch === "っ") {
       if (!out || !isHangulSyllable(out[out.length - 1])) {
    out += "ッ";
    i += 1;
    lastMora = null;
    continue;
  }

      const next = readMoraAt(i + 1);

      const prevV = lastMora?.vowelMain ?? "a";
      const nextInfo = next?.info;
      const nextCons: ConsClass = nextInfo?.consClass ?? "t";

      let jong: number = JONG.S;
      if (nextCons === "p" || nextCons === "b") jong = JONG.B;
      else if (nextCons === "k" || nextCons === "g") {
        jong = prevV === "e" || prevV === "i" ? JONG.S : JONG.G;
      } else {
        jong = JONG.S;
      }

      out = replaceLastHangul(out, jong);
      i += 1;
      continue;
    }

    // 비가나: 그대로
    if (!isKana(ch)) {
      out += ch;
      i += 1;
      lastMora = null;
      continue;
    }

    // おお...
    if (ch === "お" && chars[i + 1] === "お") {
      let j = i;
      while (chars[j] === "お") j++;
      out += "오";
      i = j;
      lastMora = {
        out: "오",
        vowelMain: "o",
        consClass: "vowel",
        vowelOnly: true,
      };
      continue;
    }

    const mora = readMoraAt(i);
    if (!mora) {
      out += chars[i];
      i += 1;
      lastMora = null;
      continue;
    }

    // ん
    if (mora.key === "ん") {
      const next = readMoraAt(i + 1);
      const nextInfo = next?.info;

      const hasPrevHangul =
        out.length > 0 && isHangulSyllable(out[out.length - 1]);
      if (!hasPrevHangul) {
        out += "ㄴ";
        i += 1;
        lastMora = null;
        continue;
      }

      // ✅ 토큰 컨텍스트 기반 "-san" → '상'
      if (lastMora?.out === "사" && isSanHonorificAt(i)) {
        out = replaceLastHangul(out, JONG.NG);
        i += 1;
        continue;
      }

      // --- 기존 ん 동화 규칙 ---
      let jong: number = JONG.N;
      if (!next || !nextInfo || !isKana(next.key[0])) {
        jong = lastMora?.wasYouon ? JONG.NG : JONG.N;
      } else {
        const nc = nextInfo.consClass;
        if (nc === "k" || nc === "g") {
          jong = JONG.NG;
        } else if (nc === "vowel" || nc === "y" || nc === "w") {
          jong = JONG.N;
        } else if (isLabialStart(nc)) {
          if (lastMora?.vowelOnly) jong = JONG.N;
          else jong = JONG.M;
        } else {
          jong = JONG.N;
        }
      }

      out = replaceLastHangul(out, jong);
      i += 1;
      continue;
    }

    const info = mora.info;
    if (!info) {
      out += mora.key;
      i += mora.len;
      lastMora = null;
      continue;
    }

    // ✅ 단어(토큰) 시작 유성화: と/こ만 + 예외(이/히/ん/테) + (앞이 っ이면 금지)
    let outSyl = info.out;
    if (atTokenStart && (mora.key === "と" || mora.key === "こ")) {
      const prevIsSokuon = i > 0 && chars[i - 1] === "っ";

      const nextKey = peekNextMoraKeySkippingChoonpu(i + mora.len);
      const blockedByNext =
        !!nextKey && INITIAL_VOICING_BLOCK_NEXT.has(nextKey);

      const isKou = mora.key === "こ" && chars[i + mora.len] === "う";

      // ✅ 추가: "진짜 조사 と/こ"로 쓰인 경우만 유성화 차단
      // - 현재 토큰이 1글자 'と'/'こ'이고,
      // - 이전 토큰이 내용어(명사/동사/형용사 등)면 => 조사로 판단 => 유성화 금지
      let blockedByParticleUsage = false;
      if (tokens && tokForI) {
        const isSingleCharToken = tokForI.surface.length === 1;
        const tokenMatchesMora = tokForI.surface === mora.key;

        if (isSingleCharToken && tokenMatchesMora) {
          const p = prevToken(); // curToken(i) 호출로 tokIdx는 sync된 상태
          const prevLooksLikeContent =
            !!p &&
            p.pos !== "記号" &&
            p.pos !== "助詞" &&
            p.pos !== "助動詞" &&
            !HARD_BOUNDARY_SURF.has(p.surface);

          if (prevLooksLikeContent) blockedByParticleUsage = true;
        }
      }

  const allowVoicing =
    !prevIsSokuon &&
    !blockedByNext &&
    !isKou &&
    !blockedByParticleUsage;

  if (allowVoicing) {
    if (mora.key === "と") outSyl = "도";
    else if (mora.key === "こ") outSyl = "고";
  }
}

    out += outSyl;
    lastMora = { ...info, out: outSyl };

    const next1 = chars[i + mora.len];
    const afterLen = chars[i + mora.len + 1];

    // o + う 드랍
    if (next1 === "う" && info.vowelMain === "o") {
      i += mora.len + 1;
      continue;
    }

    if (next1 === "う" && (mora.key === "ゆ" || U_DROP_KEYS.has(mora.key))) {
      i += mora.len + 1;
      continue;
    }

    if (next1 === "い") {
      if (mora.key === "せ") {
        if (afterLen !== "な" && afterLen !== "か") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "け") {
        if (afterLen !== "と") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "え") {
        if (afterLen !== "こ" && afterLen !== "く" && afterLen !== "き") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "じ") {
        i += mora.len + 1;
        continue;
      } else if (mora.key === "き") {
        if (!afterLen) {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "し") {
        i += mora.len + 1;
        continue;
      }
    }

    if (next1 === "え" && mora.key === "ね") {
      i += mora.len + 1;
      continue;
    }

    i += mora.len;
  }

  return out;
}



function hiraToKata(hira: string): string {
  const c = hira.codePointAt(0)!;
  if (c >= 0x3041 && c <= 0x3096) {
    return String.fromCodePoint(c + 0x60);
  }
  return hira;
}
