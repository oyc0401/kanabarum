export function normalizeInputText(input: string): string {
  // 1) NFD 결합문자(が/ぱ 등) 합성
  let normalized = input.normalize("NFC");

  // 2) 반각 가타카나만 전각으로 (구두점/특수문자 최대한 보존)
  normalized = normalizeHalfwidthKatakanaOnly(normalized);

  // 3) 장음 기호 변종 최소 치환
  // - U+2015 HORIZONTAL BAR
  // - U+2500 BOX DRAWINGS LIGHT HORIZONTAL
  return normalized.replace(/[\u2015\u2500]/g, "ー");
}

function normalizeHalfwidthKatakanaOnly(s: string): string {
  // ✅ 반각 가타카나 + 탁점/반탁점(ﾞﾟ) + 반각 장음(ｰ)까지 함께 NFKC
  return s.replace(/[\uFF66-\uFF9F\uFF70]+/g, (chunk) =>
    chunk.normalize("NFKC"),
  );
}

export function toHiragana(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    // カタカナ → ひらがな
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60);
      continue;
    }
    if (ch === "ー") {
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}
