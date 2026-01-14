import kuromoji from 'kuromoji';
import path from 'path';
import { createRequire } from 'module';

// src/kanaToHangul.ts
var require2 = createRequire(import.meta.url);
async function buildTokenizer() {
  return new Promise((resolve, reject) => {
    const dicPath = path.join(require2.resolve("kuromoji"), "..", "..", "dict");
    kuromoji.builder({ dicPath }).build((err, tk) => {
      if (err || !tk)
        reject(err);
      else
        resolve(tk);
    });
  });
}
var _tokenizer = null;
async function getTokenizer() {
  if (_tokenizer)
    return _tokenizer;
  _tokenizer = await buildTokenizer();
  return _tokenizer;
}
var _kanaToHangulInstance = null;
var _kanaToHangulInitPromise = null;
async function initKanaToHangul() {
  if (_kanaToHangulInstance)
    return _kanaToHangulInstance;
  if (_kanaToHangulInitPromise)
    return _kanaToHangulInitPromise;
  _kanaToHangulInitPromise = (async () => {
    const tk = await getTokenizer();
    const convert = (input) => kanaToHangulWithTokenizer(input, tk);
    _kanaToHangulInstance = convert;
    return convert;
  })();
  return _kanaToHangulInitPromise;
}
async function kanaToHangul(input) {
  const converter = await initKanaToHangul();
  return converter(input);
}
var KanaBarum = Object.freeze({
  init: initKanaToHangul
});
function kanaToHangulWithTokenizer(input, tokenizer) {
  input = normalizeInput(input);
  let s = normalizeToHiragana(input);
  s = rewriteParticlesWithKuromoji(s, tokenizer);
  return coreKanaToHangulConvert(s);
}
function normalizeInput(input) {
  input = input.normalize("NFC");
  input = normalizeHalfwidthKatakanaOnly(input);
  input = input.replace(/[\u2015\u2500]/g, "\u30FC");
  return input;
}
function normalizeHalfwidthKatakanaOnly(s) {
  return s.replace(
    /[\uFF66-\uFF9F\uFF70]+/g,
    (chunk) => chunk.normalize("NFKC")
  );
}
function normalizeToHiragana(str) {
  let out = "";
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c >= 12449 && c <= 12534) {
      out += String.fromCodePoint(c - 96);
      continue;
    }
    if (ch === "\u30FC") {
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}
function hiraToKata(hira) {
  const c = hira.codePointAt(0);
  if (c >= 12353 && c <= 12438) {
    return String.fromCodePoint(c + 96);
  }
  return hira;
}
var HARD_BOUNDARY_SURF = /* @__PURE__ */ new Set([
  "\u3002",
  "\u3001",
  "\uFF01",
  "\uFF1F",
  "!",
  "?",
  " ",
  "\u3000"
]);
var HARD_BOUNDARY_DETAIL1 = /* @__PURE__ */ new Set([
  "\u53E5\u70B9",
  "\u8AAD\u70B9",
  "\u62EC\u5F27\u958B",
  "\u62EC\u5F27\u9589",
  "\u7A7A\u767D"
]);
function isHardBoundaryToken(t) {
  if (t.pos !== "\u8A18\u53F7")
    return false;
  if (HARD_BOUNDARY_SURF.has(t.surface_form))
    return true;
  return HARD_BOUNDARY_DETAIL1.has(t.pos_detail_1 ?? "");
}
function isContentToken(t) {
  if (t.pos === "\u8A18\u53F7")
    return !isHardBoundaryToken(t);
  return true;
}
function prevContentIdx(tokens, i) {
  for (let j = i - 1; j >= 0; j--)
    if (isContentToken(tokens[j]))
      return j;
  return -1;
}
function nextContentIdx(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++)
    if (isContentToken(tokens[j]))
      return j;
  return -1;
}
function nextBoundaryOrEnd(tokens, i) {
  for (let j = i + 1; j < tokens.length; j++) {
    if (isHardBoundaryToken(tokens[j]))
      continue;
    return false;
  }
  return true;
}
var LEXICAL_HE_ENDINGS = [
  "\u3044\u306B\u3057\u3078",
  "\u304A\u304D\u3078",
  "\u3082\u3068\u3078",
  "\u3059\u3048\u3078",
  "\u3059\u3091\u3078",
  "\u304B\u307F\u3078",
  "\u304F\u306B\u3078",
  "\u304D\u3057\u3078"
];
function rewriteParticlesWithKuromoji(s, tokenizer) {
  const tokens = tokenizer.tokenize(s);
  let out = "";
  const isSingleKana = (x) => x.length === 1 && /^[\u3040-\u309F\u30A0-\u30FF]$/.test(x);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const surf = t.surface_form;
    let replaced = surf;
    if (t.pos === "\u52A9\u8A5E" && surf === "\u306F") {
      if (i > 0 && tokens[i - 1].surface_form === "\u306F") {
        out += surf;
        continue;
      }
      if (i + 1 < tokens.length && tokens[i + 1].surface_form === "\u306F") {
        out += surf;
        continue;
      }
      const p = prevContentIdx(tokens, i);
      if (p >= 0) {
        const n = nextContentIdx(tokens, i);
        const hasNextContent = n >= 0;
        const isEndOrPunct = nextBoundaryOrEnd(tokens, i);
        const prev = tokens[p];
        const prevSurf = prev.surface_form;
        if (!prevSurf.includes("\u3063")) {
          if (t.pos_detail_1 === "\u4FC2\u52A9\u8A5E") {
            if (hasNextContent || isEndOrPunct) {
              if (prev.pos !== "\u52A9\u8A5E") {
                out += "\u308F";
                continue;
              }
            }
          }
        }
      }
      out += surf;
      continue;
    }
    if (t.pos === "\u52A9\u8A5E" && surf === "\u3078") {
      const p = prevContentIdx(tokens, i);
      if (p >= 0) {
        const n = nextContentIdx(tokens, i);
        const hasNextContent = n >= 0;
        const isEndOrPunct = nextBoundaryOrEnd(tokens, i);
        const prevSurf = tokens[p].surface_form;
        if (LEXICAL_HE_ENDINGS.some((w) => (prevSurf + "\u3078").endsWith(w))) ; else if (prevSurf.endsWith("\u306E")) ; else if (t.pos_detail_1 === "\u683C\u52A9\u8A5E") {
          const nextPos = hasNextContent ? tokens[n].pos : "";
          const looksDirectionalByVerb = nextPos === "\u52D5\u8A5E" || nextPos === "\u52A9\u52D5\u8A5E";
          const nextSurf = hasNextContent ? tokens[n].surface_form : "";
          const nextIsSingleKana = hasNextContent && isSingleKana(nextSurf);
          if (!nextIsSingleKana && (looksDirectionalByVerb || isEndOrPunct)) {
            replaced = "\u3048";
          }
        }
      }
    }
    out += replaced;
  }
  return out;
}
function coreKanaToHangulConvert(s) {
  const SPECIAL = [
    ["\u3068\u3046\u304D\u3087\u3046", "\uB3C4\uCFC4"],
    ["\u3044\u3044\u3067\u3057\u3087\u3046\u304B", "\uC774\uB370\uC1FC\uCE74"],
    ["\u3044\u3044\u3067\u3057\u3087\u3046", "\uC774\uB370\uC1FC"],
    ["\u3053\u3093\u306B\u3061\u306F", "\uCF58\uB2C8\uCE58\uC640"],
    ["\u3053\u3093\u3070\u3093\u306F", "\uCF64\uBC29\uC640"]
  ];
  const HANGUL_BASE = 44032;
  const HANGUL_END = 55203;
  function isHangulSyllable(ch) {
    const c = ch.codePointAt(0);
    return c >= HANGUL_BASE && c <= HANGUL_END;
  }
  const JONG = {
    G: 1,
    // ㄱ
    N: 4,
    // ㄴ
    M: 16,
    // ㅁ
    B: 17,
    // ㅂ
    S: 19,
    // ㅅ
    NG: 21
    // ㅇ
  };
  function addFinal(syl, jong) {
    if (!isHangulSyllable(syl))
      return syl;
    const code = syl.codePointAt(0) - HANGUL_BASE;
    const cho = Math.floor(code / 588);
    const jung = Math.floor(code % 588 / 28);
    return String.fromCodePoint(HANGUL_BASE + cho * 588 + jung * 28 + jong);
  }
  function replaceLastHangul(out2, jong) {
    if (!out2)
      return out2;
    const last = out2[out2.length - 1];
    if (!isHangulSyllable(last))
      return out2;
    return out2.slice(0, -1) + addFinal(last, jong);
  }
  function isHiragana(ch) {
    const c = ch.codePointAt(0);
    return c >= 12352 && c <= 12447;
  }
  function isKana(ch) {
    return isHiragana(ch) || ch === "\u30FC";
  }
  const SINGLE = {
    \u3042: { out: "\uC544", vowelMain: "a", consClass: "vowel", vowelOnly: true },
    \u3044: { out: "\uC774", vowelMain: "i", consClass: "vowel", vowelOnly: true },
    \u3046: { out: "\uC6B0", vowelMain: "u", consClass: "vowel", vowelOnly: true },
    \u3048: { out: "\uC5D0", vowelMain: "e", consClass: "vowel", vowelOnly: true },
    \u304A: { out: "\uC624", vowelMain: "o", consClass: "vowel", vowelOnly: true },
    \u304B: { out: "\uCE74", vowelMain: "a", consClass: "k" },
    \u304D: { out: "\uD0A4", vowelMain: "i", consClass: "k" },
    \u304F: { out: "\uCFE0", vowelMain: "u", consClass: "k" },
    \u3051: { out: "\uCF00", vowelMain: "e", consClass: "k" },
    \u3053: { out: "\uCF54", vowelMain: "o", consClass: "k" },
    \u3055: { out: "\uC0AC", vowelMain: "a", consClass: "s" },
    \u3057: { out: "\uC2DC", vowelMain: "i", consClass: "s" },
    \u3059: { out: "\uC2A4", vowelMain: "u", consClass: "s" },
    \u305B: { out: "\uC138", vowelMain: "e", consClass: "s" },
    \u305D: { out: "\uC18C", vowelMain: "o", consClass: "s" },
    \u305F: { out: "\uD0C0", vowelMain: "a", consClass: "t" },
    \u3061: { out: "\uCE58", vowelMain: "i", consClass: "t" },
    \u3064: { out: "\uCE20", vowelMain: "u", consClass: "t" },
    \u3066: { out: "\uD14C", vowelMain: "e", consClass: "t" },
    \u3068: { out: "\uD1A0", vowelMain: "o", consClass: "t" },
    \u306A: { out: "\uB098", vowelMain: "a", consClass: "n" },
    \u306B: { out: "\uB2C8", vowelMain: "i", consClass: "n" },
    \u306C: { out: "\uB204", vowelMain: "u", consClass: "n" },
    \u306D: { out: "\uB124", vowelMain: "e", consClass: "n" },
    \u306E: { out: "\uB178", vowelMain: "o", consClass: "n" },
    \u306F: { out: "\uD558", vowelMain: "a", consClass: "h" },
    \u3072: { out: "\uD788", vowelMain: "i", consClass: "h" },
    \u3075: { out: "\uD6C4", vowelMain: "u", consClass: "h" },
    \u3078: { out: "\uD5E4", vowelMain: "e", consClass: "h" },
    \u307B: { out: "\uD638", vowelMain: "o", consClass: "h" },
    \u307E: { out: "\uB9C8", vowelMain: "a", consClass: "m" },
    \u307F: { out: "\uBBF8", vowelMain: "i", consClass: "m" },
    \u3080: { out: "\uBB34", vowelMain: "u", consClass: "m" },
    \u3081: { out: "\uBA54", vowelMain: "e", consClass: "m" },
    \u3082: { out: "\uBAA8", vowelMain: "o", consClass: "m" },
    \u3084: { out: "\uC57C", vowelMain: "a", consClass: "y" },
    \u3086: { out: "\uC720", vowelMain: "u", consClass: "y" },
    \u3088: { out: "\uC694", vowelMain: "o", consClass: "y" },
    \u3089: { out: "\uB77C", vowelMain: "a", consClass: "r" },
    \u308A: { out: "\uB9AC", vowelMain: "i", consClass: "r" },
    \u308B: { out: "\uB8E8", vowelMain: "u", consClass: "r" },
    \u308C: { out: "\uB808", vowelMain: "e", consClass: "r" },
    \u308D: { out: "\uB85C", vowelMain: "o", consClass: "r" },
    \u308F: { out: "\uC640", vowelMain: "a", consClass: "w" },
    \u3092: { out: "\uC624", vowelMain: "o", consClass: "w" },
    \u304C: { out: "\uAC00", vowelMain: "a", consClass: "g" },
    \u304E: { out: "\uAE30", vowelMain: "i", consClass: "g" },
    \u3050: { out: "\uAD6C", vowelMain: "u", consClass: "g" },
    \u3052: { out: "\uAC8C", vowelMain: "e", consClass: "g" },
    \u3054: { out: "\uACE0", vowelMain: "o", consClass: "g" },
    \u3056: { out: "\uC790", vowelMain: "a", consClass: "z" },
    \u3058: { out: "\uC9C0", vowelMain: "i", consClass: "z" },
    \u305A: { out: "\uC988", vowelMain: "u", consClass: "z" },
    \u305C: { out: "\uC81C", vowelMain: "e", consClass: "z" },
    \u305E: { out: "\uC870", vowelMain: "o", consClass: "z" },
    \u3060: { out: "\uB2E4", vowelMain: "a", consClass: "d" },
    \u3062: { out: "\uC9C0", vowelMain: "i", consClass: "d" },
    \u3065: { out: "\uC988", vowelMain: "u", consClass: "d" },
    \u3067: { out: "\uB370", vowelMain: "e", consClass: "d" },
    \u3069: { out: "\uB3C4", vowelMain: "o", consClass: "d" },
    \u3070: { out: "\uBC14", vowelMain: "a", consClass: "b" },
    \u3073: { out: "\uBE44", vowelMain: "i", consClass: "b" },
    \u3076: { out: "\uBD80", vowelMain: "u", consClass: "b" },
    \u3079: { out: "\uBCA0", vowelMain: "e", consClass: "b" },
    \u307C: { out: "\uBCF4", vowelMain: "o", consClass: "b" },
    \u3071: { out: "\uD30C", vowelMain: "a", consClass: "p" },
    \u3074: { out: "\uD53C", vowelMain: "i", consClass: "p" },
    \u3077: { out: "\uD478", vowelMain: "u", consClass: "p" },
    \u307A: { out: "\uD398", vowelMain: "e", consClass: "p" },
    \u307D: { out: "\uD3EC", vowelMain: "o", consClass: "p" }
  };
  const YOUON = {
    \u304D\u3083: { out: "\uCEAC", vowelMain: "a", consClass: "k", wasYouon: true },
    \u304D\u3085: { out: "\uD050", vowelMain: "u", consClass: "k", wasYouon: true },
    \u304D\u3087: { out: "\uCFC4", vowelMain: "o", consClass: "k", wasYouon: true },
    \u3057\u3083: { out: "\uC0E4", vowelMain: "a", consClass: "s", wasYouon: true },
    \u3057\u3085: { out: "\uC288", vowelMain: "u", consClass: "s", wasYouon: true },
    \u3057\u3087: { out: "\uC1FC", vowelMain: "o", consClass: "s", wasYouon: true },
    \u3061\u3083: { out: "\uCC60", vowelMain: "a", consClass: "t", wasYouon: true },
    \u3061\u3085: { out: "\uCE04", vowelMain: "u", consClass: "t", wasYouon: true },
    \u3061\u3087: { out: "\uCD78", vowelMain: "o", consClass: "t", wasYouon: true },
    \u306B\u3083: { out: "\uB0D0", vowelMain: "a", consClass: "n", wasYouon: true },
    \u306B\u3085: { out: "\uB274", vowelMain: "u", consClass: "n", wasYouon: true },
    \u306B\u3087: { out: "\uB1E8", vowelMain: "o", consClass: "n", wasYouon: true },
    \u3072\u3083: { out: "\uD590", vowelMain: "a", consClass: "h", wasYouon: true },
    \u3072\u3085: { out: "\uD734", vowelMain: "u", consClass: "h", wasYouon: true },
    \u3072\u3087: { out: "\uD6A8", vowelMain: "o", consClass: "h", wasYouon: true },
    \u307F\u3083: { out: "\uBA00", vowelMain: "a", consClass: "m", wasYouon: true },
    \u307F\u3085: { out: "\uBBA4", vowelMain: "u", consClass: "m", wasYouon: true },
    \u307F\u3087: { out: "\uBB18", vowelMain: "o", consClass: "m", wasYouon: true },
    \u308A\u3083: { out: "\uB7B4", vowelMain: "a", consClass: "r", wasYouon: true },
    \u308A\u3085: { out: "\uB958", vowelMain: "u", consClass: "r", wasYouon: true },
    \u308A\u3087: { out: "\uB8CC", vowelMain: "o", consClass: "r", wasYouon: true },
    \u304E\u3083: { out: "\uAC38", vowelMain: "a", consClass: "g", wasYouon: true },
    \u304E\u3085: { out: "\uADDC", vowelMain: "u", consClass: "g", wasYouon: true },
    \u304E\u3087: { out: "\uAD50", vowelMain: "o", consClass: "g", wasYouon: true },
    \u3058\u3083: { out: "\uC7C8", vowelMain: "a", consClass: "z", wasYouon: true },
    \u3058\u3085: { out: "\uC96C", vowelMain: "u", consClass: "z", wasYouon: true },
    \u3058\u3087: { out: "\uC8E0", vowelMain: "o", consClass: "z", wasYouon: true },
    \u3073\u3083: { out: "\uBC4C", vowelMain: "a", consClass: "b", wasYouon: true },
    \u3073\u3085: { out: "\uBDF0", vowelMain: "u", consClass: "b", wasYouon: true },
    \u3073\u3087: { out: "\uBD64", vowelMain: "o", consClass: "b", wasYouon: true },
    \u3074\u3083: { out: "\uD344", vowelMain: "a", consClass: "p", wasYouon: true },
    \u3074\u3085: { out: "\uD4E8", vowelMain: "u", consClass: "p", wasYouon: true },
    \u3074\u3087: { out: "\uD45C", vowelMain: "o", consClass: "p", wasYouon: true }
  };
  const LOAN = {
    \u3066\u3043: { out: "\uD2F0", vowelMain: "i", consClass: "t" },
    \u3067\u3043: { out: "\uB514", vowelMain: "i", consClass: "d" },
    \u3075\u3041: { out: "\uD30C", vowelMain: "a", consClass: "p" },
    \u3075\u3043: { out: "\uD53C", vowelMain: "i", consClass: "p" },
    \u3075\u3047: { out: "\uD398", vowelMain: "e", consClass: "p" },
    \u3075\u3049: { out: "\uD3EC", vowelMain: "o", consClass: "p" }
  };
  const SMALL_Y = /* @__PURE__ */ new Set(["\u3083", "\u3085", "\u3087"]);
  const SMALL_V = /* @__PURE__ */ new Set(["\u3041", "\u3043", "\u3045", "\u3047", "\u3049"]);
  const U_DROP_KEYS = /* @__PURE__ */ new Set([
    "\u3086",
    "\u304D\u3085",
    "\u3057\u3085",
    "\u3061\u3085",
    "\u306B\u3085",
    "\u3072\u3085",
    "\u307F\u3085",
    "\u308A\u3085",
    "\u304E\u3085",
    "\u3058\u3085",
    "\u3073\u3085",
    "\u3074\u3085"
  ]);
  function readMoraAt(idx) {
    if (idx >= s.length)
      return null;
    const c0 = s[idx];
    const c1 = s[idx + 1];
    if (c1 && SMALL_V.has(c1)) {
      const key2 = c0 + c1;
      const info2 = LOAN[key2];
      if (info2)
        return { key: key2, len: 2, info: info2 };
    }
    if (c1 && SMALL_Y.has(c1)) {
      const key2 = c0 + c1;
      const info2 = YOUON[key2];
      if (info2)
        return { key: key2, len: 2, info: info2 };
    }
    const info = SINGLE[c0];
    if (info)
      return { key: c0, len: 1, info };
    return { key: c0, len: 1, info: void 0 };
  }
  function isLabialStart(cons) {
    return cons === "m" || cons === "b" || cons === "p";
  }
  const isBoundary = (ch) => {
    if (!ch)
      return true;
    return /\s|[、。！？!?\(\)\[\]{}「」『』（）【】]/.test(ch);
  };
  let out = "";
  let i = 0;
  let lastMora = null;
  let leadingSokuon = false;
  while (i < s.length) {
    let matchedSpecial = false;
    for (const [k, v] of SPECIAL) {
      if (s.startsWith(k, i)) {
        out += v.replaceAll("\u3053\u3093\u3070\u3093\u308F", "\uCF64\uBC29\uC640").replaceAll("\u3053\u3093\u306B\u3061\u308F", "\uCF58\uB2C8\uCE58\uC640");
        i += k.length;
        lastMora = null;
        matchedSpecial = true;
        break;
      }
    }
    if (matchedSpecial)
      continue;
    if (s.startsWith("\u3061\u3083\u3093", i)) {
      out += "\uCA29";
      i += 3;
      lastMora = { out: "\uCA29", vowelMain: "a", consClass: "t", wasYouon: true };
      continue;
    }
    const ch = s[i];
    if (ch === "\u30FC") {
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
    if (ch === "\u3063") {
      if (!out || !isHangulSyllable(out[out.length - 1])) {
        out += "\u30C3";
        i += 1;
        leadingSokuon = true;
        lastMora = null;
        continue;
      }
      const next = readMoraAt(i + 1);
      if (lastMora && lastMora.out === "\uC9C0" && next && next.key === "\u304F") {
        i += 1;
        continue;
      }
      const prevV = lastMora?.vowelMain ?? "a";
      const nextInfo = next?.info;
      const nextCons = nextInfo?.consClass ?? "t";
      let jong = JONG.S;
      if (nextCons === "p" || nextCons === "b")
        jong = JONG.B;
      else if (nextCons === "k" || nextCons === "g") {
        jong = prevV === "e" || prevV === "i" ? JONG.S : JONG.G;
      } else {
        jong = JONG.S;
      }
      out = replaceLastHangul(out, jong);
      i += 1;
      continue;
    }
    if (!isKana(ch)) {
      out += ch;
      i += 1;
      lastMora = null;
      continue;
    }
    if (ch === "\u304A" && s[i + 1] === "\u304A") {
      let j = i;
      while (s[j] === "\u304A")
        j++;
      out += "\uC624";
      i = j;
      lastMora = {
        out: "\uC624",
        vowelMain: "o",
        consClass: "vowel",
        vowelOnly: true
      };
      continue;
    }
    const mora = readMoraAt(i);
    if (!mora) {
      out += ch;
      i += 1;
      lastMora = null;
      continue;
    }
    if (mora.key === "\u3093") {
      const next = readMoraAt(i + 1);
      const nextInfo = next?.info;
      let jong = JONG.N;
      const hasPrevHangul = out.length > 0 && isHangulSyllable(out[out.length - 1]);
      if (!hasPrevHangul) {
        out += "\u3134";
        i += 1;
        lastMora = null;
        continue;
      }
      if (lastMora?.out === "\uC0AC") {
        const nextCh = s[i + 1];
        const isBoundaryOrEnd = !nextCh || /\s|[、。！？!?\(\)\[\]{}「」『』（）【】]/.test(nextCh);
        const isParticleAfterSan = nextCh === "\u306F" || nextCh === "\u3078" || nextCh === "\u3092" || nextCh === "\u308F" || nextCh === "\u3048" || nextCh === "\u304A";
        const hasPrefixBeforeSan = out.length >= 2;
        if (hasPrefixBeforeSan && (isBoundaryOrEnd || isParticleAfterSan)) {
          out = replaceLastHangul(out, JONG.NG);
          i += 1;
          continue;
        }
      }
      if (!next || !nextInfo || !isKana(next.key[0])) {
        jong = lastMora?.wasYouon ? JONG.NG : JONG.N;
      } else {
        const nc = nextInfo.consClass;
        if (nc === "k" || nc === "g") {
          jong = JONG.NG;
        } else if (nc === "vowel" || nc === "y" || nc === "w") {
          jong = JONG.N;
        } else if (isLabialStart(nc)) {
          if (lastMora?.vowelOnly)
            jong = JONG.N;
          else
            jong = JONG.M;
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
    out += info.out;
    lastMora = info;
    const next1 = s[i + mora.len];
    const afterLen = s[i + mora.len + 1];
    if (next1 === "\u3046" && info.vowelMain === "o") {
      i += mora.len + 1;
      continue;
    }
    if (next1 === "\u3046" && (mora.key === "\u3086" || U_DROP_KEYS.has(mora.key))) {
      i += mora.len + 1;
      continue;
    }
    if (next1 === "\u3044") {
      if (mora.key === "\u305B") {
        if (afterLen !== "\u306A" && afterLen !== "\u304B") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "\u3051") {
        if (afterLen !== "\u3068") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "\u3048") {
        if (afterLen !== "\u3053" && afterLen !== "\u304F" && afterLen !== "\u304D") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "\u3058") {
        i += mora.len + 1;
        continue;
      } else if (mora.key === "\u304D") {
        if (isBoundary(afterLen) || !afterLen) {
          i += mora.len + 1;
          continue;
        }
      }
    }
    if (next1 === "\u3048" && mora.key === "\u306D") {
      i += mora.len + 1;
      continue;
    }
    i += mora.len;
  }
  return out;
}

export { KanaBarum as KanaToHangulMaker, kanaToHangul };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map