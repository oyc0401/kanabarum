// coreConverter.ts
import { SpecialDictionary } from "./dictionary";
import { HARD_BOUNDARY_SURF, TokenSpan } from "./particleRewriter";


export function coreKanaToHangulConvert(
  s: string,
  opts?: { tokens?: TokenSpan[] },
): string {
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

  // --- Tables (당신 코드 그대로) ---
  type VowelMain = "a" | "i" | "u" | "e" | "o";
  type ConsClass =
    | "vowel"
    | "k"
    | "s"
    | "t"
    | "n"
    | "h"
    | "m"
    | "y"
    | "r"
    | "w"
    | "g"
    | "z"
    | "d"
    | "b"
    | "p";

  type MoraInfo = {
    out: string;
    vowelMain: VowelMain;
    consClass: ConsClass;
    vowelOnly?: boolean;
    wasYouon?: boolean;
  };

  const SINGLE: Record<string, MoraInfo> = {
    あ: { out: "아", vowelMain: "a", consClass: "vowel", vowelOnly: true },
    い: { out: "이", vowelMain: "i", consClass: "vowel", vowelOnly: true },
    う: { out: "우", vowelMain: "u", consClass: "vowel", vowelOnly: true },
    え: { out: "에", vowelMain: "e", consClass: "vowel", vowelOnly: true },
    お: { out: "오", vowelMain: "o", consClass: "vowel", vowelOnly: true },

    か: { out: "카", vowelMain: "a", consClass: "k" },
    き: { out: "키", vowelMain: "i", consClass: "k" },
    く: { out: "쿠", vowelMain: "u", consClass: "k" },
    け: { out: "케", vowelMain: "e", consClass: "k" },
    こ: { out: "코", vowelMain: "o", consClass: "k" },

    さ: { out: "사", vowelMain: "a", consClass: "s" },
    し: { out: "시", vowelMain: "i", consClass: "s" },
    す: { out: "스", vowelMain: "u", consClass: "s" },
    せ: { out: "세", vowelMain: "e", consClass: "s" },
    そ: { out: "소", vowelMain: "o", consClass: "s" },

    た: { out: "타", vowelMain: "a", consClass: "t" },
    ち: { out: "치", vowelMain: "i", consClass: "t" },
    つ: { out: "츠", vowelMain: "u", consClass: "t" },
    て: { out: "테", vowelMain: "e", consClass: "t" },
    と: { out: "토", vowelMain: "o", consClass: "t" },

    な: { out: "나", vowelMain: "a", consClass: "n" },
    に: { out: "니", vowelMain: "i", consClass: "n" },
    ぬ: { out: "누", vowelMain: "u", consClass: "n" },
    ね: { out: "네", vowelMain: "e", consClass: "n" },
    の: { out: "노", vowelMain: "o", consClass: "n" },

    は: { out: "하", vowelMain: "a", consClass: "h" },
    ひ: { out: "히", vowelMain: "i", consClass: "h" },
    ふ: { out: "후", vowelMain: "u", consClass: "h" },
    へ: { out: "헤", vowelMain: "e", consClass: "h" },
    ほ: { out: "호", vowelMain: "o", consClass: "h" },

    ま: { out: "마", vowelMain: "a", consClass: "m" },
    み: { out: "미", vowelMain: "i", consClass: "m" },
    む: { out: "무", vowelMain: "u", consClass: "m" },
    め: { out: "메", vowelMain: "e", consClass: "m" },
    も: { out: "모", vowelMain: "o", consClass: "m" },

    や: { out: "야", vowelMain: "a", consClass: "y" },
    ゆ: { out: "유", vowelMain: "u", consClass: "y" },
    よ: { out: "요", vowelMain: "o", consClass: "y" },

    ら: { out: "라", vowelMain: "a", consClass: "r" },
    り: { out: "리", vowelMain: "i", consClass: "r" },
    る: { out: "루", vowelMain: "u", consClass: "r" },
    れ: { out: "레", vowelMain: "e", consClass: "r" },
    ろ: { out: "로", vowelMain: "o", consClass: "r" },

    わ: { out: "와", vowelMain: "a", consClass: "w" },
    を: { out: "오", vowelMain: "o", consClass: "w" },

    が: { out: "가", vowelMain: "a", consClass: "g" },
    ぎ: { out: "기", vowelMain: "i", consClass: "g" },
    ぐ: { out: "구", vowelMain: "u", consClass: "g" },
    げ: { out: "게", vowelMain: "e", consClass: "g" },
    ご: { out: "고", vowelMain: "o", consClass: "g" },

    ざ: { out: "자", vowelMain: "a", consClass: "z" },
    じ: { out: "지", vowelMain: "i", consClass: "z" },
    ず: { out: "즈", vowelMain: "u", consClass: "z" },
    ぜ: { out: "제", vowelMain: "e", consClass: "z" },
    ぞ: { out: "조", vowelMain: "o", consClass: "z" },

    だ: { out: "다", vowelMain: "a", consClass: "d" },
    ぢ: { out: "지", vowelMain: "i", consClass: "d" },
    づ: { out: "즈", vowelMain: "u", consClass: "d" },
    で: { out: "데", vowelMain: "e", consClass: "d" },
    ど: { out: "도", vowelMain: "o", consClass: "d" },

    ば: { out: "바", vowelMain: "a", consClass: "b" },
    び: { out: "비", vowelMain: "i", consClass: "b" },
    ぶ: { out: "부", vowelMain: "u", consClass: "b" },
    べ: { out: "베", vowelMain: "e", consClass: "b" },
    ぼ: { out: "보", vowelMain: "o", consClass: "b" },

    ぱ: { out: "파", vowelMain: "a", consClass: "p" },
    ぴ: { out: "피", vowelMain: "i", consClass: "p" },
    ぷ: { out: "푸", vowelMain: "u", consClass: "p" },
    ぺ: { out: "페", vowelMain: "e", consClass: "p" },
    ぽ: { out: "포", vowelMain: "o", consClass: "p" },

    ゔ: { out: "부", vowelMain: "u", consClass: "b" },
  };

  const YOUON: Record<string, MoraInfo> = {
    きゃ: { out: "캬", vowelMain: "a", consClass: "k", wasYouon: true },
    きゅ: { out: "큐", vowelMain: "u", consClass: "k", wasYouon: true },
    きょ: { out: "쿄", vowelMain: "o", consClass: "k", wasYouon: true },

    しゃ: { out: "샤", vowelMain: "a", consClass: "s", wasYouon: true },
    しゅ: { out: "슈", vowelMain: "u", consClass: "s", wasYouon: true },
    しょ: { out: "쇼", vowelMain: "o", consClass: "s", wasYouon: true },

    ちゃ: { out: "챠", vowelMain: "a", consClass: "t", wasYouon: true },
    ちゅ: { out: "츄", vowelMain: "u", consClass: "t", wasYouon: true },
    ちょ: { out: "쵸", vowelMain: "o", consClass: "t", wasYouon: true },
    てゅ: { out: "튜", vowelMain: "u", consClass: "t", wasYouon: true },
    でゅ: { out: "듀", vowelMain: "u", consClass: "d", wasYouon: true },

    にゃ: { out: "냐", vowelMain: "a", consClass: "n", wasYouon: true },
    にゅ: { out: "뉴", vowelMain: "u", consClass: "n", wasYouon: true },
    にょ: { out: "뇨", vowelMain: "o", consClass: "n", wasYouon: true },

    ひゃ: { out: "햐", vowelMain: "a", consClass: "h", wasYouon: true },
    ひゅ: { out: "휴", vowelMain: "u", consClass: "h", wasYouon: true },
    ひょ: { out: "효", vowelMain: "o", consClass: "h", wasYouon: true },
    ふゃ: { out: "퍄", vowelMain: "a", consClass: "p", wasYouon: true },
    ふゅ: { out: "퓨", vowelMain: "u", consClass: "p", wasYouon: true },
    ふょ: { out: "표", vowelMain: "o", consClass: "p", wasYouon: true },

    みゃ: { out: "먀", vowelMain: "a", consClass: "m", wasYouon: true },
    みゅ: { out: "뮤", vowelMain: "u", consClass: "m", wasYouon: true },
    みょ: { out: "묘", vowelMain: "o", consClass: "m", wasYouon: true },

    りゃ: { out: "랴", vowelMain: "a", consClass: "r", wasYouon: true },
    りゅ: { out: "류", vowelMain: "u", consClass: "r", wasYouon: true },
    りょ: { out: "료", vowelMain: "o", consClass: "r", wasYouon: true },

    ぎゃ: { out: "갸", vowelMain: "a", consClass: "g", wasYouon: true },
    ぎゅ: { out: "규", vowelMain: "u", consClass: "g", wasYouon: true },
    ぎょ: { out: "교", vowelMain: "o", consClass: "g", wasYouon: true },

    じゃ: { out: "쟈", vowelMain: "a", consClass: "z", wasYouon: true },
    じゅ: { out: "쥬", vowelMain: "u", consClass: "z", wasYouon: true },
    じょ: { out: "죠", vowelMain: "o", consClass: "z", wasYouon: true },

    びゃ: { out: "뱌", vowelMain: "a", consClass: "b", wasYouon: true },
    びゅ: { out: "뷰", vowelMain: "u", consClass: "b", wasYouon: true },
    びょ: { out: "뵤", vowelMain: "o", consClass: "b", wasYouon: true },

    ぴゃ: { out: "퍄", vowelMain: "a", consClass: "p", wasYouon: true },
    ぴゅ: { out: "퓨", vowelMain: "u", consClass: "p", wasYouon: true },
    ぴょ: { out: "표", vowelMain: "o", consClass: "p", wasYouon: true },
  };

  const LOAN: Record<string, MoraInfo> = {
    てぃ: { out: "티", vowelMain: "i", consClass: "t" },
    でぃ: { out: "디", vowelMain: "i", consClass: "d" },
    ちぇ: { out: "체", vowelMain: "e", consClass: "t" },
    しぇ: { out: "셰", vowelMain: "e", consClass: "s" },
    じぇ: { out: "제", vowelMain: "e", consClass: "z" },
    つぁ: { out: "차", vowelMain: "a", consClass: "t" },
    つぃ: { out: "치", vowelMain: "i", consClass: "t" },
    つぇ: { out: "체", vowelMain: "e", consClass: "t" },
    つぉ: { out: "초", vowelMain: "o", consClass: "t" },
    ふぁ: { out: "파", vowelMain: "a", consClass: "p" },
    ふぃ: { out: "피", vowelMain: "i", consClass: "p" },
    ふぇ: { out: "페", vowelMain: "e", consClass: "p" },
    ふぉ: { out: "포", vowelMain: "o", consClass: "p" },
    ぐぁ: { out: "과", vowelMain: "a", consClass: "g" },
    ぐぃ: { out: "귀", vowelMain: "i", consClass: "g" },
    ぐぇ: { out: "궤", vowelMain: "e", consClass: "g" },
    ぐぉ: { out: "궈", vowelMain: "o", consClass: "g" },
    くぁ: { out: "콰", vowelMain: "a", consClass: "k" },
    くぃ: { out: "퀴", vowelMain: "i", consClass: "k" },
    くぇ: { out: "퀘", vowelMain: "e", consClass: "k" },
    くぉ: { out: "쿼", vowelMain: "o", consClass: "k" },
    どぁ: { out: "돠", vowelMain: "a", consClass: "d" },
    どぅ: { out: "두", vowelMain: "u", consClass: "d" },
    どぉ: { out: "둬", vowelMain: "o", consClass: "d" },
    ゔぁ: { out: "바", vowelMain: "a", consClass: "b" },
    ゔぃ: { out: "비", vowelMain: "i", consClass: "b" },
    ゔぇ: { out: "베", vowelMain: "e", consClass: "b" },
    ゔぉ: { out: "보", vowelMain: "o", consClass: "b" },
  };

  const SMALL_Y = new Set(["ゃ", "ゅ", "ょ"]);
  const SMALL_V = new Set(["ぁ", "ぃ", "ぅ", "ぇ", "ぉ"]);

  const U_DROP_KEYS = new Set([
    "ゆ",
    "きゅ",
    "しゅ",
    "ちゅ",
    "にゅ",
    "ひゅ",
    "みゅ",
    "りゅ",
    "ぎゅ",
    "じゅ",
    "びゅ",
    "ぴゅ",
  ]);

  type ReadMora = { key: string; len: number; info?: MoraInfo } | null;

  function readMoraAt(idx: number): ReadMora {
    if (idx >= s.length) return null;

    const c0 = s[idx];
    const c1 = s[idx + 1];

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
    while (j < s.length && s[j] === "ー") j++;
    const m = readMoraAt(j);
    return m?.key ?? null;
  }

  // ✅ "-san" 판별(당신 코드 그대로 유지)
  const SAN_PARTICLES = new Set(["は", "わ", "へ", "え", "を", "お"]);
  function isSanHonorificAt(idxN: number): boolean {
    const t = curToken(idxN);
    if (!t) return false;
    if (idxN < 1 || s[idxN - 1] !== "さ") return false;

    const local = s.slice(t.start, idxN + 1);
    if (!local.endsWith("さん")) return false;

    const hasPrefixInsideToken = (idxN - 1) > t.start;
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

  // ✅ 새로 추가: 유성화 대상 토큰인지 판정
  function isVoicingEligibleTokenStart(t: TokenSpan | null): boolean {
    if (!t) return false;
    // 기호/조사/조동사에는 유성화 절대 금지 (京都(きょうと)에서 'と'가 助詞로 뜨는 케이스 방지)
    if (t.pos === "記号") return false;
    if (t.pos === "助詞") return false;
    if (t.pos === "助動詞") return false;

    // 원문이 카타카나(대개 외래어)이면 유성화 금지 (ノート 등)
    if (t.originHadKatakana) return false;

    return true;
  }

  let out = "";
  let i = 0;

  let lastMora: MoraInfo | null = null;
  let leadingSokuon = false;

  while (i < s.length) {
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

    // SpecialDictionary
     let matchedSpecial = false;
    for (const [k, v] of SpecialDictionary) {
      if (s.startsWith(k, i)) {
        out += v;
        i += k.length;
        lastMora = null;
        matchedSpecial = true;
        break;
      }
    }
    if (matchedSpecial) continue;

    if (s.startsWith("ちゃん", i)) {
      out += "쨩";
      i += 3;
      lastMora = { out: "쨩", vowelMain: "a", consClass: "t", wasYouon: true };
      continue;
    }

    const ch = s[i];

    if (ch === "ー") {
      i += 1;
      continue;
    }

    if (leadingSokuon) {
      if (isHiragana(ch)) {
        out += hiraToKata(ch);
        i += 1;
        leadingSokuon = false;
        lastMora = null;
        continue;
      } else {
        leadingSokuon = false;
      }
    }

    if (ch === "っ") {
      if (!out || !isHangulSyllable(out[out.length - 1])) {
        out += "ッ";
        i += 1;
        leadingSokuon = true;
        lastMora = null;
        continue;
      }

      const next = readMoraAt(i + 1);
      if (lastMora && lastMora.out === "지" && next && next.key === "く") {
        i += 1;
        continue;
      }

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
    if (ch === "お" && s[i + 1] === "お") {
      let j = i;
      while (s[j] === "お") j++;
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
      out += s[i];
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
      const prevIsSokuon = i > 0 && s[i - 1] === "っ";

      const nextKey = peekNextMoraKeySkippingChoonpu(i + mora.len);
      const blockedByNext =
        !!nextKey && INITIAL_VOICING_BLOCK_NEXT.has(nextKey);

      const isKou = mora.key === "こ" && s[i + mora.len] === "う";

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

    const next1 = s[i + mora.len];
    const afterLen = s[i + mora.len + 1];

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
