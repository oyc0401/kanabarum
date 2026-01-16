import { beforeAll, describe, expect, it } from "vitest";

import { Kanabarum } from "./kanaBarum";

const kanabarum = new Kanabarum();

beforeAll(async () => {
  await kanabarum.init();
});

describe("kanaToHangul", () => {
  it("hiragana", () => {
    expect(kanabarum.kanaToHangul("東京とりんご")).toBe("도쿄토링고");
  });
});
