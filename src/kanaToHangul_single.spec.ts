import { beforeAll, describe, expect, it } from "vitest";

import { KanaBarum, type KanaToHangul } from "./kanaBarum";

let converter: KanaToHangul;

beforeAll(async () => {
  converter = await KanaBarum.init();
});

describe("kanaToHangul", () => {
  it("hiragana", () => {
    expect(converter("東京とりんご")).toBe("도쿄토링고");
  });
});
// describe("kanaToHangul", () => {
//   it("hiragana", () => {
//     // expect(converter("😀をみる")).toBe("😀오미루");
//     // expect(converter("りんごとりんご")).toBe("링고토링고");
//   });
// });
