import { beforeAll, describe, expect, it } from "vitest";

import {
  KanaBarum,
  kanaToHangul
  type KanaToHangul,
} from "./kanaToHangul";

let converter: KanaToHangul;

beforeAll(async () => {
  converter = await KanaBarum.init();
});

describe("lazy init helper", () => {
  it("allows awaiting direct calls without manual init", async () => {
    await expect(kanaToHangul("さようなら")).resolves.toBe("사요나라");
    await expect(kanaToHangul("ありがとう")).resolves.toBe("아리가토");
  });
});

describe("kanaToHangul", () => {
  it("basic hiragana", () => {
    expect(converter("さようなら")).toBe("사요나라"); // おう/よう 장음은 제거
    expect(converter("ありがとう")).toBe("아리가토"); // とう -> と
    expect(converter("おはよう")).toBe("오하요"); // よう -> よ
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(converter("きゃく")).toBe("캬쿠");
    expect(converter("しゅくだい")).toBe("슈쿠다이");
    expect(converter("ちょっと")).toBe("춋토");
    expect(converter("きゅう")).toBe("큐"); // きゅ + う drop
    expect(converter("きょう")).toBe("쿄"); // きょ + う drop
    expect(converter("しょくどう")).toBe("쇼쿠도"); // どう -> ど
    expect(converter("にゃん")).toBe("냥");
    expect(converter("にゅうがく")).toBe("뉴가쿠"); // う drop
    expect(converter("みゅーじっく")).toBe("뮤지쿠"); // ー drop
    expect(converter("びょういん")).toBe("뵤인"); // びょ + う drop
    expect(converter("ぴょん")).toBe("푱"); // ん 규칙 결합
    expect(converter("りょこう")).toBe("료코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(converter("かった")).toBe("캇타");
    expect(converter("きって")).toBe("킷테");
    expect(converter("いって")).toBe("잇테");
    expect(converter("がっこう")).toBe("각코"); // こう -> こ
    expect(converter("ろっく")).toBe("록쿠");
    expect(converter("けっこん")).toBe("켓콘");
    expect(converter("ざっし")).toBe("잣시");
    expect(converter("きっぷ")).toBe("킵푸");
    expect(converter("まっすぐ")).toBe("맛스구");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(converter("さようなら")).toBe("사요나라"); // よ + [う drop]
    expect(converter("せんせい")).toBe("센세"); // せ + [い drop]
    expect(converter("おおきい")).toBe("오키"); // おお -> お, きい -> き
    expect(converter("おねえさん")).toBe("오네상"); // ねえ -> ね
    expect(converter("えいご")).toBe("에고"); // えい -> え
    expect(converter("けいさつ")).toBe("케사츠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(converter("カタカナ")).toBe("카타카나");
    expect(converter("コーヒー")).toBe("코히");
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(converter("パーティー")).toBe("파티");
    expect(converter("ティッシュ")).toBe("팃슈");
    expect(converter("フォーク")).toBe("포쿠");
  });

  it("dakuten/handakuten basics", () => {
    expect(converter("がくせい")).toBe("가쿠세"); // せい -> せ
    expect(converter("ぐんたい")).toBe("군타이");
    expect(converter("げんき")).toBe("겡키");
    expect(converter("ごはん")).toBe("고한");
  });

  it("unknown chars pass-through", () => {
    expect(converter("誕生日(たんじょうび)")).toBe("誕生日(탄죠비)");
    expect(converter("第3回(だいさんかい)")).toBe("第3回(다이상카이)");
    expect(converter("!?(びっくり)")).toBe("!?(빗쿠리)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(converter("とうきょう")).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(converter("あいみょん")).toBe("아이묭");
    expect(converter("いんまん")).toBe("인만");
    expect(converter("あれくん")).toBe("아레쿤");
    expect(converter("りろん")).toBe("리론");
    expect(converter("りんね")).toBe("린네");
    expect(converter("りんご")).toBe("링고");
    expect(converter("さんぽ")).toBe("삼포"); // ん->ㅁ
    expect(converter("しんぶん")).toBe("심분"); // ん->ㅁ
    expect(converter("てんぷら")).toBe("템푸라"); // ん->ㅁ
    expect(converter("かんぱい")).toBe("캄파이"); // ん->ㅁ
    expect(converter("しんまい")).toBe("심마이"); // ん->ㅁ
    expect(converter("まんいち")).toBe("만이치"); // 모음 앞이면 ㄴ 유지
    expect(converter("てんいん")).toBe("텐인");
    expect(converter("かんおん")).toBe("칸온");
    expect(converter("げんき")).toBe("겡키");
    expect(converter("あんがい")).toBe("앙가이"); // ん + が(velar) -> ㅇ 느낌
    expect(converter("りんかい")).toBe("링카이");
    expect(converter("ほんと")).toBe("혼토");
    expect(converter("にゃんこ")).toBe("냥코"); // にゃ + ん + こ
  });

  it("ちゃん", () => {
    expect(converter("めいちゃん")).toBe("메이쨩");
    expect(converter("あかちゃん")).toBe("아카쨩");
    expect(converter("おじいちゃん")).toBe("오지쨩"); // じい drop
    expect(converter("ねえちゃん")).toBe("네쨩"); // ねえ drop
    expect(converter("みっちゃん")).toBe("밋쨩");
    expect(converter("まーちゃん")).toBe("마쨩");
  });

  it("つ", () => {
    expect(converter("つき")).toBe("츠키");
  });

  it("장음 아닌것", () => {
    expect(converter("せいな")).toBe("세이나");
    expect(converter("せいか")).toBe("세이카");
    expect(converter("けいと")).toBe("케이토");
    expect(converter("れいな")).toBe("레이나");
    expect(converter("めいこ")).toBe("메이코");
    expect(converter("えいこ")).toBe("에이코");
    expect(converter("こい")).toBe("코이"); // 단순 こ + い
    expect(converter("あい")).toBe("아이");
    expect(converter("うい")).toBe("우이");
    expect(converter("おいしい")).toBe("오이시이"); // しい는 요음 아님
    expect(converter("おいで")).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(converter("コーヒー, ください。")).toBe("코히, 쿠다사이。");
    expect(converter("「きょう」")).toBe("「쿄」");
    expect(converter("（がっこう）")).toBe("（각코）");
    expect(converter("  すし  ")).toBe("  스시  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(converter("わたしはがくせいです")).toBe("와타시와가쿠세데스"); // せい drop
      expect(converter("これはペンです")).toBe("코레와펜데스");
      expect(converter("きょうはあつい")).toBe("쿄와아츠이"); // きょう -> きょ
      expect(converter("こんにちは")).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(converter("がっこうへいく")).toBe("각코에이쿠"); // こう drop
      expect(converter("うちへかえる")).toBe("우치에카에루");
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(converter("すしをたべる")).toBe("스시오타베루");
      expect(converter("みずをのむ")).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(converter("だって")).toBe("닷테");
    expect(converter("って")).toBe("ッテ" as any); // 구현이 단독 っ 처리 못 하면 pass-through 가능: 정책 정해서 고치세요
    expect(converter("ってば")).toBe("ッテ바" as any);
    expect(converter("いった")).toBe("잇타");
    expect(converter("おもった")).toBe("오못타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(converter("それじゃ")).toBe("소레쟈");
    expect(converter("じゃない")).toBe("쟈나이");
    expect(converter("じゃなかった")).toBe("쟈나캇타");

    // ては → ちゃ (tewa → cha)
    expect(converter("たべちゃう")).toBe("타베챠우"); // う drop 정책이면 타베챠
    expect(converter("みちゃった")).toBe("미챳타");
    expect(converter("しちゃう")).toBe("시챠우"); // う drop 정책이면 시챠
    expect(converter("やっちゃった")).toBe("얏챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    // でしょう: でしょ + う(drop) = でしょ
    expect(converter("そうでしょう")).toBe("소데쇼");
    expect(converter("いいでしょうか")).toBe("이데쇼카");
    // ましょう: ましょ + う(drop) = ましょ
    expect(converter("いきましょう")).toBe("이키마쇼");
    expect(converter("やりましょうか")).toBe("야리마쇼카");
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    // ている는 '테이루'가 자연스럽고, てい를 장음처럼 날려버리면 체감 품질 급락
    expect(converter("たべている")).toBe("타베테이루");
    expect(converter("みている")).toBe("미테이루");
    expect(converter("している")).toBe("시테이루");

    // ておく(=해 두다): おう/えい 룰과 혼동 없는지
    expect(converter("かっておく")).toBe("캇테오쿠");
    expect(converter("やっておく")).toBe("얏테오쿠");

    // てしまう: 축약(ちゃう)랑 같이 있을 때도 안정적으로
    expect(converter("たべてしまう")).toBe("타베테시마우"); // う drop 정책이면 타베테시마
    expect(converter("やってしまった")).toBe("얏테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(converter("そうなんです")).toBe("소난데스");
    expect(converter("なんですか")).toBe("난데스카");
    expect(converter("だめなんです")).toBe("다메난데스");
    expect(converter("しんぱいなんです")).toBe("심파이난데스"); // ん->ㅁ before ぱ
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(converter("いかない")).toBe("이카나이");
    expect(converter("たべない")).toBe("타베나이");
    expect(converter("しない")).toBe("시나이");
    expect(converter("いかなかった")).toBe("이카나캇타");
    expect(converter("たべなかった")).toBe("타베나캇타");
    expect(converter("しなかった")).toBe("시나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(converter("いったら")).toBe("잇타라");
    expect(converter("やったら")).toBe("얏타라");
    expect(converter("かったら")).toBe("캇타라");

    expect(converter("いくなら")).toBe("이쿠나라");
    expect(converter("するなら")).toBe("스루나라");

    expect(converter("いっても")).toBe("잇테모");
    expect(converter("やっても")).toBe("얏테모");
  });

  it("grammar: question/ending particles (ね/よ/かな/かい) keep them intact", () => {
    expect(converter("いいね")).toBe("이이네");
    expect(converter("いいよ")).toBe("이이요");
    expect(converter("いいかな")).toBe("이이카나");
    expect(converter("いいかい")).toBe("이이카이");
    expect(converter("いく？")).toBe("이쿠？");
  });

  it("grammar: small っ at start or isolated should not crash (policy check)", () => {
    // 이런 입력은 보통 비정상이지만, 라이브러리는 크래시 없이 정책대로 처리해야 함
    expect(() => converter("っ")).not.toThrow();
    expect(() => converter("っあ")).not.toThrow();
    expect(() => converter("っか")).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(converter("おおおお")).toBe("오");
    expect(converter("えいえい")).toBe("에에"); // 각 えい -> え
    expect(converter("ようよう")).toBe("요요"); // 각 よう -> よ
    expect(converter("こうこう")).toBe("코코"); // 각 こう -> こ
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(converter("しんゆう")).toBe("신유"); // ゆう drop
    expect(converter("てんきゃく")).toBe("텡캬쿠"); // ん + きゃ
    expect(converter("さんちょく")).toBe("산쵸쿠"); // ん + ちょ
    expect(converter("まんちょっと")).toBe("만춋토"); // ん + ちょっ
  });
});

describe("kanaToHangul2", () => {
  it("basic hiragana", () => {
    expect(converter("ようこそ")).toBe("요코소"); // よう -> よ
    expect(converter("おめでとう")).toBe("오메데토"); // とう -> と
    expect(converter("おはようさん")).toBe("오하요상"); // よう -> よ, さん -> 상(관용)
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(converter("きゃんぷ")).toBe("캼푸"); // きゃ + ん(ㅁ before ぷ) + ぷ
    expect(converter("しゅっぱつ")).toBe("슙파츠"); // しゅ + っ(ㅂ before ぱ) + ぱつ
    expect(converter("ちょっぴり")).toBe("춉피리"); // ちょ + っ(ㅂ before ぴ) + ぴり
    expect(converter("ぎゅう")).toBe("규"); // ぎゅ + う drop
    expect(converter("りょう")).toBe("료"); // りょ + う drop
    expect(converter("ちょうど")).toBe("쵸도"); // ちょ + う drop
    expect(converter("にゃんこ")).toBe("냥코"); // にゃ + ん + こ
    expect(converter("りゅうがく")).toBe("류가쿠"); // りゅ + う drop
    expect(converter("にゅーす")).toBe("뉴스"); // ー drop
    expect(converter("びょうき")).toBe("뵤키"); // びょ + う drop
    expect(converter("にょん")).toBe("뇽"); // 요음 + ん(어말) => ㅇ
    expect(converter("ぎょこう")).toBe("교코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(converter("さっき")).toBe("삭키");
    expect(converter("まって")).toBe("맛테");
    expect(converter("のって")).toBe("놋테");
    expect(converter("けっこう")).toBe("켓코"); // こう -> こ
    expect(converter("まっく")).toBe("막쿠");
    expect(converter("ざっか")).toBe("작카");
    expect(converter("さっし")).toBe("삿시");
    expect(converter("しっぽ")).toBe("십포");
    expect(converter("まっさか")).toBe("맛사카");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(converter("ようふく")).toBe("요후쿠"); // よう -> よ
    expect(converter("せいふく")).toBe("세후쿠"); // せい -> せ
    expect(converter("おおきいな")).toBe("오키이나"); // おお -> お,
    expect(converter("ねえさん")).toBe("네상"); // ねえ -> ね, さん -> 상
    expect(converter("えいが")).toBe("에가"); // えい -> え
    expect(converter("けいかく")).toBe("케카쿠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(converter("テレビ")).toBe("테레비");
    expect(converter("ジュース")).toBe("쥬스"); // ー 없음, normalize + 요음 그대로
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(converter("ティー")).toBe("티"); // ー drop
    expect(converter("ファイル")).toBe("파이루"); // ふぁ + い + る
    expect(converter("フォト")).toBe("포토"); // ふぉ + と
  });

  it("dakuten/handakuten basics", () => {
    expect(converter("ぎんこう")).toBe("깅코"); // こう -> こ
    expect(converter("げんだい")).toBe("겐다이");
    expect(converter("ごぜん")).toBe("고젠");
    expect(converter("ばくはつ")).toBe("바쿠하츠");
  });

  it("unknown chars pass-through", () => {
    expect(converter("記録(きろく)")).toBe("記録(키로쿠)");
    expect(converter("第2章(だいにしょう)")).toBe("第2章(다이니쇼)");
    expect(converter("!?(まっか)")).toBe("!?(막카)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(converter("とうきょう")).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(converter("しょん")).toBe("숑"); // 요음 + ん(어말) => ㅇ
    expect(converter("うんまん")).toBe("운만"); // 모음 단독(う) 뒤 ん + ま => ㄴ 유지
    expect(converter("たろうくん")).toBe("타로쿤"); // ろう -> ろ, くん
    expect(converter("かろん")).toBe("카론"); // …ろん
    expect(converter("ほんね")).toBe("혼네"); // ん + ね
    expect(converter("まんが")).toBe("망가"); // ん + が => ㅇ
    expect(converter("さんぷる")).toBe("삼푸루"); // ん->ㅁ before ぷ
    expect(converter("しんぱん")).toBe("심판"); // ん->ㅁ before ぱ, 그리고 ぱん(어말 ん) => 판
    expect(converter("てんぷき")).toBe("템푸키"); // ん->ㅁ before ぷ
    expect(converter("かんぱく")).toBe("캄파쿠"); // ん->ㅁ before ぱ
    expect(converter("まんい")).toBe("만이"); // 모음 앞이면 ㄴ 유지
    expect(converter("てんいき")).toBe("텐이키"); // 모음 앞 ㄴ 유지
    expect(converter("かんおと")).toBe("칸오토"); // 모음 앞 ㄴ 유지
    expect(converter("あんがく")).toBe("앙가쿠"); // ん + が => ㅇ
    expect(converter("りんこう")).toBe("링코"); // r + (k/g) => ㅇ + こう drop
    expect(converter("ほんとに")).toBe("혼토니");
  });

  it("ちゃん", () => {
    expect(converter("れいちゃん")).toBe("레이쨩");
    expect(converter("みかちゃん")).toBe("미카쨩");
    expect(converter("じいちゃん")).toBe("지쨩"); // じい drop
    expect(converter("おねえちゃん")).toBe("오네쨩"); // ねえ drop
    expect(converter("りっちゃん")).toBe("릿쨩");
    expect(converter("さーちゃん")).toBe("사쨩"); // ー drop
  });

  it("つ", () => {
    expect(converter("つめ")).toBe("츠메");
  });

  it("장음 아닌것", () => {
    expect(converter("せいな")).toBe("세이나");
    expect(converter("せいか")).toBe("세이카");
    expect(converter("けいと")).toBe("케이토");
    expect(converter("れいな")).toBe("레이나");
    expect(converter("めいこ")).toBe("메이코");
    expect(converter("えいこ")).toBe("에이코");
    expect(converter("こい")).toBe("코이");
    expect(converter("あい")).toBe("아이");
    expect(converter("うい")).toBe("우이");
    expect(converter("おいしい")).toBe("오이시이");
    expect(converter("おいで")).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(converter("ジュース, おねがい。")).toBe("쥬스, 오네가이。");
    expect(converter("「りょう」")).toBe("「료」");
    expect(converter("（けっこう）")).toBe("（켓코）");
    expect(converter("  たこ  ")).toBe("  타코  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(converter("あなたはせいふくです")).toBe("아나타와세후쿠데스"); // せい drop
      expect(converter("それはノートです")).toBe("소레와노토데스"); // ー drop
      expect(converter("あしたはさむい")).toBe("아시타와사무이");
      expect(converter("こんにちは")).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(converter("としょかんへいく")).toBe("토쇼칸에이쿠"); // へ->え, えいく drop 금지
      expect(converter("いえへかえる")).toBe("이에에카에루");
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(converter("パンをたべる")).toBe("판오타베루");
      expect(converter("みずをのむ")).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(converter("だってさ")).toBe("닷테사");
    expect(converter("って")).toBe("ッテ" as any);
    expect(converter("ってば")).toBe("ッテ바" as any);
    expect(converter("やった")).toBe("얏타");
    expect(converter("しった")).toBe("싯타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(converter("ここじゃ")).toBe("코코쟈");
    expect(converter("ここじゃない")).toBe("코코쟈나이");
    expect(converter("ほんとじゃなかった")).toBe("혼토쟈나캇타");

    // ては → ちゃ (tewa → cha)
    expect(converter("いっちゃう")).toBe("잇챠우");
    expect(converter("かっちゃった")).toBe("캇챳타");
    expect(converter("やっちゃう")).toBe("얏챠우");
    expect(converter("いっちゃった")).toBe("잇챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    expect(converter("いやでしょう")).toBe("이야데쇼");
    expect(converter("だめでしょうか")).toBe("다메데쇼카");
    expect(converter("のみましょう")).toBe("노미마쇼");
    expect(converter("かえりましょうか")).toBe("카에리마쇼카");
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    expect(converter("よんでいる")).toBe("욘데이루");
    expect(converter("はなしている")).toBe("하나시테이루");
    expect(converter("まっている")).toBe("맛테이루");

    expect(converter("とっておく")).toBe("톳테오쿠");
    expect(converter("うっておく")).toBe("웃테오쿠");

    expect(converter("のんでしまう")).toBe("논데시마우");
    expect(converter("いってしまった")).toBe("잇테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(converter("そうなんです")).toBe("소난데스");
    expect(converter("なんですか")).toBe("난데스카");
    expect(converter("むりなんです")).toBe("무리난데스");
    expect(converter("しんぱいなんです")).toBe("심파이난데스");
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(converter("いかない")).toBe("이카나이");
    expect(converter("のまない")).toBe("노마나이");
    expect(converter("いわない")).toBe("이와나이");
    expect(converter("いかなかった")).toBe("이카나캇타");
    expect(converter("のまなかった")).toBe("노마나캇타");
    expect(converter("いわなかった")).toBe("이와나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(converter("やったら")).toBe("얏타라");
    expect(converter("いったら")).toBe("잇타라");
    expect(converter("まったら")).toBe("맛타라");

    expect(converter("いくなら")).toBe("이쿠나라");
    expect(converter("のむなら")).toBe("노무나라");

    expect(converter("いっても")).toBe("잇테모");
    expect(converter("やっても")).toBe("얏테모");
  });

  it("grammar: question/ending particles (ね/よ/かな/かい) keep them intact", () => {
    expect(converter("いいね")).toBe("이이네");
    expect(converter("いいよ")).toBe("이이요");
    expect(converter("いいかな")).toBe("이이카나");
    expect(converter("いいかい")).toBe("이이카이");
    expect(converter("いく？")).toBe("이쿠？");
  });

  it("grammar: small っ at start or isolated should not crash (policy check)", () => {
    expect(() => converter("っ")).not.toThrow();
    expect(() => converter("っあ")).not.toThrow();
    expect(() => converter("っか")).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(converter("おおおお")).toBe("오");
    expect(converter("えいえい")).toBe("에에");
    expect(converter("ようよう")).toBe("요요");
    expect(converter("こうこう")).toBe("코코");
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(converter("しんゆう")).toBe("신유"); // ゆう drop
    expect(converter("てんきゃく")).toBe("텡캬쿠");
    expect(converter("まんちょく")).toBe("만쵸쿠");
    expect(converter("さんちょっと")).toBe("산춋토");
  });
});

describe("kanaToHangul (extra)", () => {
  // --------------------
  // youon coverage 확대
  // --------------------
  it("youon variety (りゃ/ぎょ/ぴゅ etc.)", () => {
    expect(converter("りゃく")).toBe("랴쿠");
    expect(converter("ぎょざ")).toBe("교자");
    expect(converter("ぴゅあ")).toBe("퓨아");
    expect(converter("びゃく")).toBe("뱌쿠");
    expect(converter("みょん")).toBe("묭"); // 요음 + ん(어말) => ㅇ
    expect(converter("にゃんか")).toBe("냥카"); // 요음 + ん + k => ㅇ (규칙)
  });

  // --------------------
  // sokuon edge 확대
  // --------------------
  it("sokuon with different following consonant classes", () => {
    expect(converter("はっぴょう")).toBe("합표"); // っ + ぴ => ㅂ 종성
    expect(converter("がっき")).toBe("각키"); // っ + k
    expect(converter("けっきょく")).toBe("켓쿄쿠"); // けっ(=ㅅ) + きょ
    expect(converter("きゃっきゃ")).toBe("캭캬"); // っ 처리 + 요음
  });

  // --------------------
  // 장음 드롭 패턴 확대
  // --------------------
  it("long-vowel-like drops (more patterns)", () => {
    expect(converter("どうぞ")).toBe("도조"); // どう -> ど
    expect(converter("こうこう")).toBe("코코"); // 각 こう -> こ
    expect(converter("せいせい")).toBe("세세"); // 각 せい -> せ (예외 아닌 경우)
    expect(converter("えいえん")).toBe("에엔"); // えい -> え, えん -> 엔(기본 ㄴ)
  });

  // --------------------
  // 장음 아닌 것(예외) 확대
  // --------------------
  it("non-long-vowel exceptions should remain (えいこ/けいと/せいな/せいか)", () => {
    expect(converter("えいこ")).toBe("에이코");
    expect(converter("けいと")).toBe("케이토");
    expect(converter("せいな")).toBe("세이나");
    expect(converter("せいか")).toBe("세이카");
    expect(converter("えいく")).toBe("에이쿠"); // particle へ→え + いく 대응 (드롭 금지)
  });

  // --------------------
  // ん 동화 더 때리기
  // --------------------
  it("moraic nasal ん assimilation more cases", () => {
    expect(converter("さんび")).toBe("삼비"); // ん + び => ㅁ
    expect(converter("しんぽ")).toBe("심포"); // ん + ぽ => ㅁ
    expect(converter("てんぷ")).toBe("템푸"); // ん + ぷ => ㅁ
    expect(converter("あんこ")).toBe("앙코"); // ん + こ(k) => (규칙에 따라 ㅇ)
    expect(converter("にゃんこ")).toBe("냥코"); // 요음 + ん + k => ㅇ
    expect(converter("りんぐ")).toBe("링구"); // r + g => ㅇ (규칙)
    expect(converter("しんゆう")).toBe("신유"); // ゆう drop
  });

  // --------------------
  // honorific さん
  // --------------------
  it("honorific さん should become 상 at end", () => {
    expect(converter("たなかさん")).toBe("타나카상");
    expect(converter("すずきさん")).toBe("스즈키상");
  });

  // --------------------
  // particles は / へ / を (heuristic)
  // --------------------
  it("particles heuristics (は/へ/を)", () => {
    expect(converter("ぼくはがくせいです")).toBe("보쿠와가쿠세데스"); // せい drop + は->わ
    expect(converter("ここはさむい")).toBe("코코와사무이"); // は->わ
    expect(converter("うみへいく")).toBe("우미에이쿠"); // へ->え + えいく 유지
    expect(converter("みずをのむ")).toBe("미즈오노무"); // を->오
  });

  // --------------------
  // contractions じゃ / ちゃ + sokuon 안정성
  // --------------------
  it("contractions stability (じゃ/ちゃ) with boundaries", () => {
    expect(converter("それじゃだめ")).toBe("소레쟈다메");
    expect(converter("いっちゃだめ")).toBe("잇챠다메");
    expect(converter("やっちゃった")).toBe("얏챳타");
    expect(converter("じゃなかった")).toBe("쟈나캇타");
  });

  // --------------------
  // mixed scripts, punctuation robustness
  // --------------------
  it("mixed scripts + punctuation robustness", () => {
    expect(converter("「コーヒーをください」")).toBe("「코히오쿠다사이」");
    expect(converter("  (にゃんこ)  ")).toBe("  (냥코)  ");
  });

  // --------------------
  // weird inputs: isolated small chars
  // --------------------
  it("weird inputs should not crash and keep policy", () => {
    expect(() => converter("ゃ")).not.toThrow();
    expect(() => converter("ゅ")).not.toThrow();
    expect(() => converter("ょ")).not.toThrow();
    expect(() => converter("ぁ")).not.toThrow();
    expect(() => converter("っ")).not.toThrow();
    expect(converter("っ")).toBe("ッ" as any); // 정책: 단독 っ은 "ッ"
  });
});

describe("kanaToHangul - h row (は/ひ/ふ/へ/ほ + ひゃ/ひゅ/ひょ) stress", () => {
  it("basic h-row mapping", () => {
    expect(converter("は")).toBe("하");
    expect(converter("ひ")).toBe("히");
    expect(converter("ふ")).toBe("후");
    expect(converter("へ")).toBe("헤");
    expect(converter("ほ")).toBe("호");

    expect(converter("はひふへほ")).toBe("하히후헤호");
    expect(converter("は ひ ふ へ ほ")).toBe("하 히 후 헤 호");
  });

  it("youon: ひゃ/ひゅ/ひょ -> 햐/휴/효", () => {
    expect(converter("ひゃ")).toBe("햐");
    expect(converter("ひゅ")).toBe("휴");
    expect(converter("ひょ")).toBe("효");

    expect(converter("ひゃく")).toBe("햐쿠");
    expect(converter("ひゅう")).toBe("휴"); // ひゅ + う drop (U_DROP)
    expect(converter("ひょう")).toBe("효"); // ひょ + う drop (o+う drop)
  });

  it("h-row + long-vowel-like drops around it", () => {
    expect(converter("ほう")).toBe("호"); // おう 계열(o+う drop)
    expect(converter("ひょうき")).toBe("효키"); // ひょ + う drop, き keep
    expect(converter("ひゅうが")).toBe("휴가"); // う drop + が
    expect(converter("はよう")).toBe("하요"); // よう -> よ (o+う drop)
  });

  it("sokuon with h-row (っ + は/ひ/ふ/へ/ほ)", () => {
    // っ + h-행은 보통 ㅅ 받침으로 구현될 것(현 로직 default=ㅅ)
    expect(converter("きっは")).toBe("킷하");
    expect(converter("きっひ")).toBe("킷히");
    expect(converter("きっふ")).toBe("킷후");
    expect(converter("きっほ")).toBe("킷호");

    // 요음 앞에서도 안정성
    expect(converter("きっひゃ")).toBe("킷햐");
    expect(converter("きっひょ")).toBe("킷효");
  });

  it("moraic nasal ん + h-row", () => {
    // ん + は/ひ/ふ/へ/ほ : 기본은 ㄴ 유지
    expect(converter("さんは")).toBe("산와"); // (조사 は→わ 휴리스틱이 걸리면 달라질 수 있으니 'さんは'는 사용 금지) -> 그래서 아래처럼 단어 형태로만 테스트
    expect(converter("あんひ")).toBe("안히");
    expect(converter("しんふ")).toBe("신후");
    expect(converter("おきへ")).toBe("오키헤");
    expect(converter("こんほ")).toBe("콘호");

    // 요음 뒤 + ん + h-행: 요음 규칙이 ㅇ으로 강제되면 안 됨(현재는 k/g에만 적용)
    expect(converter("ひゃんひ")).toBe("햔히");
  });

  it("katakana normalization for h-row + youon", () => {
    expect(converter("ホ")).toBe("호");
    expect(converter("ヒ")).toBe("히");
    expect(converter("フ")).toBe("후");
    expect(converter("ヘ")).toBe("헤");
    expect(converter("ハ")).toBe("하");

    expect(converter("ヒャク")).toBe("햐쿠");
    expect(converter("ヒョウ")).toBe("효"); // ひょ + う drop
  });

  it("mixed scripts/punctuation around h-row", () => {
    expect(converter("（ひゃく）")).toBe("（햐쿠）");
    expect(converter("ヒョウ、ヒュウ。")).toBe("효、휴。");
    expect(converter("AひB")).toBe("A히B");
  });

  it("direction particle へ -> え should not break nearby h-row mappings", () => {
    // へ as direction marker: え
    expect(converter("ほてるへいく")).toBe("호테루에이쿠"); // へ->え, えいく drop 금지
    // 일반 へ는 헤
    expect(converter("へや")).toBe("헤야");
  });

  it("topic particle は -> わ should not break 'は/ひ/ふ/へ/ほ' core mapping elsewhere", () => {
    // 단독/일반 は는 하
    expect(converter("はは")).toBe("하하");
  });
});

describe("particle: へ as 'e' (direction) - verb coverage", () => {
  it("へ + movement verbs (common)", () => {
    // 行く
    expect(converter("がっこうへいく")).toBe("각코에이쿠"); // こう -> こ + へ->え + えいく 유지
    // 来る
    expect(converter("うちへくる")).toBe("우치에쿠루");
    // 帰る
    expect(converter("いえへかえる")).toBe("이에에카에루");
    // 向かう
    expect(converter("がっこうへむかう")).toBe("각코에무카우");
    // 進む
    expect(converter("まえへすすむ")).toBe("마에에스스무");
    // 出かける
    expect(converter("まちへでかける")).toBe("마치에데카케루");
    // 出る
    expect(converter("そとへでる")).toBe("소토에데루");
    // 入る
    expect(converter("へやへはいる")).toBe("헤야에하이루"); // 첫 へ야는 단어(헤야), 두 번째 へ는 조사(에)
    // 移る
    expect(converter("あちらへうつる")).toBe("아치라에우츠루");
    // 渡る
    expect(converter("むこうへわたる")).toBe("무코에와타루"); // こう drop
    // 上る
    expect(converter("うえへのぼる")).toBe("우에에노보루");
    // 歩く / 走る
    expect(converter("あっちへあるく")).toBe("앗치에아루쿠");
    expect(converter("あっちへはしる")).toBe("앗치에하시루");
  });

  it("へ without a verb: treat as direction at end/punctuation", () => {
    expect(converter("東京(とうきょう)へ！")).toBe("東京(도쿄)에！");
    expect(converter("東京(とうきょう)へ")).toBe("東京(도쿄)에");
    expect(converter("（とうきょう）へ。")).toBe("（도쿄）에。");
  });

  it("sokuon with h-row (っ + は/ひ/ふ/ほ) - stable", () => {
    expect(converter("きっは")).toBe("킷하");
    expect(converter("きっひ")).toBe("킷히");
    expect(converter("きっふ")).toBe("킷후");
    expect(converter("きっほ")).toBe("킷호");
  });

  it("へ as word vs particle - separation", () => {
    expect(converter("へや")).toBe("헤야"); // word
    expect(converter("がっこうへいく")).toBe("각코에이쿠"); // particle
    expect(converter("東京(とうきょう)へ！")).toBe("東京(도쿄)에！"); // particle w/ punctuation
  });
});
describe("kanaToHangul - lexical words ending with へ (must end with 헤)", () => {
  it("archaic/lexical 〜へ words (real)", () => {
    // いにしへ(고어 표기) = 옛날/먼 옛날
    expect(converter("いにしへ")).toBe("이니시헤"); // ※ 현대 표기는 보통 いにしえ :contentReference[oaicite:1]{index=1}

    // 沖辺(おきへ) : 바다 쪽/먼바다 쪽 (문어) :contentReference[oaicite:2]{index=2}
    expect(converter("おきへ")).toBe("오키헤");

    // 本辺(もとへ) : 밑/근처/기슭 쪽 (문어) :contentReference[oaicite:3]{index=3}
    expect(converter("もとへ")).toBe("모토헤");

    // 末辺(すゑへ/すえへ) : 끝/꼭대기 쪽 (문어) :contentReference[oaicite:4]{index=4}
    expect(converter("すえへ")).toBe("스에헤");

    // 上辺(かみへ) : 상류/위쪽 (고어) :contentReference[oaicite:5]{index=5}
    expect(converter("かみへ")).toBe("카미헤");

    // 国辺(고어로 くにへ) : 나라 쪽/고향 쪽 (고어 표기) :contentReference[oaicite:6]{index=6}
    expect(converter("くにへ")).toBe("쿠니헤");

    // 岸辺의 고어 표기 예문에 'きしへ'가 등장 (고어 표기 테스트용) :contentReference[oaicite:7]{index=7}
    expect(converter("きしへ")).toBe("키시헤");
  });

  it("must NOT be rewritten as particle へ→え inside these lexical words", () => {
    // 끝이 へ인 단어는 '...에'가 되면 안 됨
    expect(converter("おきへ")).not.toBe("오키에");
    expect(converter("もとへ")).not.toBe("모토에");
    expect(converter("すえへ")).not.toBe("스에에");
    expect(converter("かみへ")).not.toBe("카미에");
    expect(converter("くにへ")).not.toBe("쿠니에");
  });
});
describe("kanaToHangul - unicode normalization edge cases", () => {
  it("NFD dakuten should behave like NFC", () => {
    // がっこう = がっこう (NFD)
    expect(converter("か\u3099っこう")).toBe("각코");
    // ぱ = ぱ (NFD handakuten)
    expect(converter("は\u309aん")).toBe("판");
  });

  it("halfwidth katakana should normalize", () => {
    expect(converter("ﾊﾝｶｸｶﾀｶﾅ")).toBe("항카쿠카타카나");
  });
});

describe("kanaToHangul - prolonged sound mark variants", () => {
  it("various dash-like marks should be treated like ー (drop)", () => {
    expect(converter("みゅｰじっく")).toBe("뮤지쿠"); // 'ｰ' U+FF70
    expect(converter("コ―ヒ―")).toBe("코히"); // '―' U+2015
  });
});
describe("kanaToHangul - stray small kana", () => {
  it("stray small kana should not crash and should be pass-through or policy-based", () => {
    expect(() => converter("ゃゅょ")).not.toThrow();
    expect(() => converter("ぁぃぅぇぉ")).not.toThrow();
    expect(converter("ゃ")).toBe("ゃ" as any); // 정책: 그대로 통과(권장)
  });

  it("small kana after non-i-row should not form youon incorrectly", () => {
    // 예: かゃ 같은 건 보통 입력 오류 -> 그대로 처리하거나 최소한 크래시 금지
    expect(() => converter("かゃ")).not.toThrow();
  });
});
describe("kanaToHangul - sokuon weird positions", () => {
  it("sokuon at start or after punctuation should not crash", () => {
    expect(() => converter("っ")).not.toThrow();
    expect(() => converter("！っか")).not.toThrow();
    expect(() => converter("「っ」")).not.toThrow();
  });

  it("multiple sokuon should be stable", () => {
    expect(() => converter("っっっか")).not.toThrow();
  });
});
describe("kanaToHangul - nasal boundary weirdness", () => {
  it("ん before sokuon should be stable", () => {
    expect(() => converter("なんっか")).not.toThrow();
    expect(() => converter("こんっちは")).not.toThrow(); // こんにちは 변형 입력
  });

  it("double ん should not produce broken jamo", () => {
    expect(() => converter("んん")).not.toThrow();
    expect(() => converter("こんんな")).not.toThrow();
  });
});
describe("kanaToHangul - particle false positives", () => {
  it("へ in 'へや' must stay '헤' (not particle)", () => {
    expect(converter("へや")).toBe("헤야");
    expect(converter("へやへいく")).toBe("헤야에이쿠"); // 첫 へ: 단어, 둘째 へ: 조사
  });

  it("〜のへ pattern should stay '노헤' (placename-like)", () => {
    expect(converter("はちのへ")).toBe("하치노헤");
    expect(converter("さんのへ")).toBe("산노헤");
  });

  it("lexical …へ must not be rewritten even before punctuation", () => {
    expect(converter("いにしへ！")).toBe("이니시헤！");
    expect(converter("おきへ。")).toBe("오키헤。");
  });
});
describe("kanaToHangul - loanword hard cases", () => {
  it("combo + sokuon + long mark", () => {
    expect(converter("ファッション")).toBe("팟숑"); // っ + しょ + ん(어말) 규칙에 따라 달라질 수 있음
    expect(converter("ティッシュー")).toBe("팃슈"); // ー drop
    expect(converter("フォー")).toBe("포"); // ー drop
  });
});
describe("kanaToHangul - more edge cases", () => {
  // --------------------
  // Unicode normalization (NFD/NFC) + punctuation preservation
  // --------------------
  it("NFD dakuten/handakuten should work (NFC normalize inside)", () => {
    // がっこう (NFD)
    expect(converter("か\u3099っこう")).toBe("각코");
    // ぱん (NFD)
    expect(converter("は\u309aん")).toBe("판");
  });

  it("should preserve non-Japanese punctuation/emoji as-is", () => {
    expect(converter("いにしへ！")).toBe("이니시헤！"); // 전각 ! 유지
    expect(converter("（おはよう）")).toBe("（오하요）"); // 전각 괄호 유지
    expect(converter("すごい👍")).toBe("스고이👍"); // 이모지 보존
    expect(converter("「へや」")).toBe("「헤야」"); // 단어 へや는 '헤'
  });

  // --------------------
  // Halfwidth katakana: normalize only those chunks
  // --------------------
  it("halfwidth katakana should normalize (and apply nasal assimilation)", () => {
    // ﾊﾝｶｸｶﾀｶﾅ => ハンカクカタカナ
    // ン + カ(k) => ㅇ 느낌 => 항카쿠...
    expect(converter("ﾊﾝｶｸｶﾀｶﾅ")).toBe("항카쿠카타카나");
  });

  it("halfwidth with handakuten should normalize too (ﾊﾟ etc.)", () => {
    // ﾊﾟﾝｹｰｷ => パンケーキ
    // ン + ケ(k) => ㅇ => 팡..., ー drop
    expect(converter("ﾊﾟﾝｹｰｷ")).toBe("팡케키");
    expect(converter("パンケーキ")).toBe("팡케키");
  });

  // --------------------
  // Prolonged sound mark variants
  // --------------------
  it("prolonged-sound variants should behave like ー (drop)", () => {
    // FF70 'ｰ' should be treated like ー (drop)
    expect(converter("みゅｰじっく")).toBe("뮤지쿠");
    // U+2015 '―' treated like ー (drop)
    expect(converter("コ―ヒ―")).toBe("코히");
  });

  // --------------------
  // Particle false positives (へ)
  // --------------------
  it("へ in a lexical word should stay '헤' even with punctuation", () => {
    expect(converter("いにしへ。")).toBe("이니시헤。");
    expect(converter("もとへ、")).toBe("모토헤、");
  });

  it("へや must not be rewritten to えや", () => {
    expect(converter("へや")).toBe("헤야");
    // first へ(へや)=헤, second へ(particle)=에
    expect(converter("へやへいく")).toBe("헤야에이쿠");
  });

  it("〜のへ should be protected as placename-like (optional policy)", () => {
    expect(converter("はちのへ")).toBe("하치노헤");
    expect(converter("さんのへ")).toBe("산노헤");
  });

  // --------------------
  // ん assimilation torture (k/g, p/b/m, vowel boundary)
  // --------------------
  it("ん before k/g should lean to ㅇ (NG)", () => {
    expect(converter("しんがぽーる")).toBe("싱가포루"); // ん+が => ㅇ, ー drop
    expect(converter("りんぐ")).toBe("링구"); // ん+ぐ
    expect(converter("あんこ")).toBe("앙코"); // ん+こ
  });

  it("ん before p/b/m should become ㅁ (M) except vowelOnly policy", () => {
    expect(converter("しんぱい")).toBe("심파이"); // ん+ぱ => ㅁ
    expect(converter("さんぷる")).toBe("삼푸루"); // ん+ぷ => ㅁ
    expect(converter("しんぶん")).toBe("심분"); // ん+ぶ => ㅁ
  });

  it("ん before vowel/y/w should stay ㄴ (N)", () => {
    expect(converter("てんいん")).toBe("텐인");
    expect(converter("かんおん")).toBe("칸온");
    expect(converter("まんいち")).toBe("만이치");
  });

  // --------------------
  // Small kana / weird sequences robustness
  // --------------------
  it("stray small kana should not crash and should be pass-through (policy)", () => {
    expect(() => converter("ゃ")).not.toThrow();
    expect(() => converter("ゅ")).not.toThrow();
    expect(() => converter("ょ")).not.toThrow();
    expect(() => converter("ぁぃぅぇぉ")).not.toThrow();

    // 정책: 단독 small kana는 그대로 통과(원하면 바꿔도 됨)
    expect(converter("ゃ")).toBe("ゃ" as any);
  });

  it("iteration marks should not crash (usually pass-through)", () => {
    expect(() => converter("ゝゞヽヾ")).not.toThrow();
    expect(converter("ゝゞ")).toBe("ゝゞ" as any);
  });

  // --------------------
  // Stress: long input should not hang (no infinite loops)
  // --------------------
  it("long repeated input should finish", () => {
    const s = "がっこうへいく。".repeat(200); // 적당히 길게
    expect(() => converter(s)).not.toThrow();
  });

  it("output should not contain combining dakuten/handakuten", () => {
    const out = converter("か\u3099っこう は\u309aん");
    expect(out).not.toMatch(/[\u3099\u309A]/);
  });
});

describe("kanaToHangul - grammar extreme edge cases", () => {
  // --------------------
  // 1) Particles with boundaries: quotes / parentheses / punctuation
  // --------------------
  it("particle は (wa) with boundaries", () => {
    expect(converter("（きょうはあつい）")).toBe("（쿄와아츠이）");
    expect(converter("それは。")).toBe("소레와。");
  });

  it("particle へ (e) when phrase ends with punctuation", () => {
    expect(converter("がっこうへ。")).toBe("각코에。");
    expect(converter("東京へ！")).toBe("東京에！"); // 한자 보존 + へ만 변환
    expect(converter("（がっこうへ）いく")).toBe("（각코에）이쿠");
  });

  it("particle を (o) with punctuation and spacing", () => {
    expect(converter("すしを、たべる")).toBe("스시오、타베루");
    expect(converter("みずを  のむ")).toBe("미즈오  노무");
    expect(converter("「パンを」たべる")).toBe("「판오」타베루");
  });

  // --------------------
  // 2) ている / ておく / ていく : don't mis-drop てい
  // --------------------
  it("ている family should keep てい (not treated as long-vowel drop)", () => {
    expect(converter("たべている")).toBe("타베테이루");
    expect(converter("よんでいる")).toBe("욘데이루");
    expect(converter("している")).toBe("시테이루");
  });

  it("ていく / ておく boundaries", () => {
    expect(converter("もっていく")).toBe("못테이쿠"); // って + いく (い drop 금지!)
    expect(converter("かっておく")).toBe("캇테오쿠");
    expect(converter("やっておく")).toBe("얏테오쿠");
  });

  // --------------------
  // 3) polite auxiliary: でしょう / ましょう : drop the trailing う only in those patterns
  // --------------------
  it("でしょう / ましょう should drop trailing う", () => {
    expect(converter("そうでしょう")).toBe("소데쇼");
    expect(converter("いいでしょうか")).toBe("이데쇼카");
    expect(converter("いきましょう")).toBe("이키마쇼");
    expect(converter("やりましょうか")).toBe("야리마쇼카");
  });

  // --------------------
  // 4) Contractions / colloquial
  // --------------------
  it("てしまう / ちゃう / ちゃった (keep stable with sokuon)", () => {
    expect(converter("たべてしまう")).toBe("타베테시마우"); // う drop 정책이면 타베테시마
    expect(converter("たべちゃう")).toBe("타베챠우");
    expect(converter("みちゃった")).toBe("미챳타");
    expect(converter("やっちゃった")).toBe("얏챳타");
  });

  it("じゃ / じゃない / じゃん (dewa contraction family)", () => {
    expect(converter("それじゃ")).toBe("소레쟈");
    expect(converter("じゃない")).toBe("쟈나이");
    expect(converter("じゃなかった")).toBe("쟈나캇타");
    expect(converter("じゃん")).toBe("쟝"); // ん 어말 정책(ㄴ/ㅇ)은 구현에 맞춰 조정 가능
  });

  it("っす / っけ / っぽい / ってさ (very colloquial)", () => {
    // 여기선 '정확 발음'이 아니라 '크래시/경계 안정'이 목표
    expect(() => converter("おつかれっす")).not.toThrow();
    expect(() => converter("どこだっけ")).not.toThrow();
    expect(() => converter("それっぽい")).not.toThrow();
    expect(() => converter("ってさ")).not.toThrow();
  });

  // --------------------
  // 5) Negative forms with sokuon and boundaries
  // --------------------
  it("negatives: ない / なかった / なくて with sokuon stability", () => {
    expect(converter("いかない")).toBe("이카나이");
    expect(converter("いかなかった")).toBe("이카나캇타");
    expect(converter("いかなくて")).toBe("이카나쿠테");
    expect(converter("やらなかった")).toBe("야라나캇타");
  });

  // --------------------
  // 6) Conditionals / connectors: たら / なら / ても / たり / ながら
  // --------------------
  it("conditionals/connectors should keep boundaries stable", () => {
    expect(converter("いったら")).toBe("잇타라");
    expect(converter("いくなら")).toBe("이쿠나라");
    expect(converter("いっても")).toBe("잇테모");
    expect(converter("たべたりのんだり")).toBe("타베타리논다리");
    expect(converter("あるきながら")).toBe("아루키나가라");
  });

  // --------------------
  // 7) Sentence-final particles: ね/よ/かな/かい/さ/な
  // --------------------
  it("ending particles remain intact", () => {
    expect(converter("いいね")).toBe("이이네");
    expect(converter("いいよ")).toBe("이이요");
    expect(converter("いいかな")).toBe("이이카나");
    expect(converter("いいかい")).toBe("이이카이");
    expect(converter("そうさ")).toBe("소사");
    expect(converter("だめだな")).toBe("다메다나");
  });

  // --------------------
  // 8) Tricky mora boundaries: ん + youon / ん + sokuon / ん + ちょっ
  // --------------------
  it("tricky boundaries with ん + youon/sokuon", () => {
    expect(converter("てんきゃく")).toBe("텡캬쿠");
    expect(converter("さんちょく")).toBe("산쵸쿠");
    expect(converter("まんちょっと")).toBe("만춋토");
    expect(() => converter("なんっか")).not.toThrow();
  });

  // --------------------
  // 9) Mixed scripts: kanji + kana + particles + quotes
  // --------------------
  it("mixed scripts with particles should behave", () => {
    expect(converter("第3回(だいさんかい)へいく")).toBe(
      "第3回(다이상카이)에이쿠",
    );
    expect(converter("誕生日(たんじょうび)を祝う")).toBe(
      "誕生日(탄죠비)오祝우",
    ); // 한자 보존
  });

  // --------------------
  // 10) "っ" isolated policy: never crash
  // --------------------
  it("isolated small っ should not crash", () => {
    expect(() => converter("っ")).not.toThrow();
    expect(() => converter("っあ")).not.toThrow();
    expect(() => converter("「っ」")).not.toThrow();
  });
});
describe("kanaToHangul - particles stress (は/へ/を)", () => {
  // =========================================================
  // は -> わ (topic marker)
  // =========================================================
  describe("particle は -> わ (topic marker) : boundary torture", () => {
    it("basic: should convert only when it's a particle", () => {
      expect(converter("ぼくはがくせいです")).toBe("보쿠와가쿠세데스");
      expect(converter("あなたはせんせいです")).toBe("아나타와센세데스"); // せい drop
      expect(converter("これはほんです")).toBe("코레와혼데스");
      expect(converter("きょうはあめです")).toBe("쿄와아메데스"); // きょう -> きょ
      expect(converter("あしたはやすみです")).toBe("아시타와야스미데스");
    });

    it("punctuation/quotes/parentheses around は", () => {
      expect(converter("それは、ほんと？")).toBe("소레와、혼토？");
      expect(converter("それは。")).toBe("소레와。");
      expect(converter("「それはほん」")).toBe("「소레와혼」");
      expect(converter("（それはほん）")).toBe("（소레와혼）");
      expect(converter("それは!")).toBe("소레와!");
    });

    it("mixed scripts: kanji/number/emoji boundaries", () => {
      expect(converter("第3回はきょうです")).toBe("第3回와쿄데스");
      expect(converter("東京(とうきょう)はさむい")).toBe(
        "東京(도쿄)와사무이",
      );
      expect(converter("AはBです")).toBe("A와B데스");
    });

    it("multiple は in one sentence", () => {
      expect(converter("これはそれはあれはほんです")).toBe(
        "코레와소레와아레와혼데스",
      );
      expect(converter("ぼくはがっこうへいく")).toBe("보쿠와각코에이쿠");
    });

    it("false positives: は inside lexical words must stay ハ-row mapping", () => {
      // 단어 내부 'は'는 '하'로 남아야 함
      expect(converter("はな")).toBe("하나");
      expect(converter("はなはきれい")).toBe("하나와키레이"); // 앞 'はな' 유지, 뒤 particle만 わ

      expect(converter("はし")).toBe("하시");
      expect(converter("はしはながい")).toBe("하시와나가이");

      // "はは" (엄마) 같은 반복도 조사로 오인하면 안 됨
      expect(converter("はは")).toBe("하하");
      // expect(kanaToHangul("はははげんき")).toBe("하하와겡키"); // 근데 이건 하하하 건강해요 라고 해석 가능함.

      // "こんにちは/こんばんは" 같은 고정 표현
      expect(converter("こんばんは")).toBe("콤방와"); // ん + ば => ㅁ, は->わ
      expect(converter("こんにちは")).toBe("콘니치와");
    });

    it("particle は next to small/long-vowel patterns", () => {
      expect(converter("きょうはいい")).toBe("쿄와이이");
      expect(converter("おねえさんはやさしい")).toBe("오네상와야사시이"); // ねえ drop + は->わ
    });
  });

  // =========================================================
  // へ -> え (direction marker)
  // =========================================================
  describe("particle へ -> え (direction marker) : boundary torture", () => {
    it("basic movement verbs", () => {
      expect(converter("がっこうへいく")).toBe("각코에이쿠");
      expect(converter("うちへかえる")).toBe("우치에카에루");
      expect(converter("まちへでかける")).toBe("마치에데카케루");
      expect(converter("そとへでる")).toBe("소토에데루");
      expect(converter("あっちへあるく")).toBe("앗치에아루쿠");
    });

    it("punctuation / end-of-phrase へ", () => {
      expect(converter("がっこうへ。")).toBe("각코에。");
      expect(converter("がっこうへ！")).toBe("각코에！");
      expect(converter("（がっこうへ）いく")).toBe("（각코에）이쿠");
      expect(converter("「がっこうへ」")).toBe("「각코에」");
    });

    it("mixed scripts around へ", () => {
      expect(converter("東京(とうきょう)へいく")).toBe("東京(도쿄)에이쿠");
      expect(converter("第3回へいく")).toBe("第3回에이쿠");
      expect(converter("Aへいく")).toBe("A에이쿠");
      expect(converter("😀へいく")).toBe("😀에이쿠");
    });

    it("double へ : word vs particle separation", () => {
      // へや(방) = lexical word => '헤야'
      // へ(조사) = '에'
      expect(converter("へやへいく")).toBe("헤야에이쿠");
      expect(converter("へやへかえる")).toBe("헤야에카에루");
    });

    it("false positives: へ inside lexical words / placenames must stay '헤'", () => {
      expect(converter("へや")).toBe("헤야");
      expect(converter("はちのへ")).toBe("하치노헤");
      expect(converter("さんのへ")).toBe("산노헤");

      // 뒤에 구두점이 붙어도 '단어로 끝나는 へ'면 바뀌면 안 되는 케이스(정책 테스트)
      // (이건 구현 정책에 따라 on/off 하셔도 됩니다)
      expect(converter("はちのへ。")).toBe("하치노헤。");
      expect(converter("へや。")).toBe("헤야。");
    });

    it("へ + いく 계열에서 えい(=え+い)를 장음으로 오인하지 말기", () => {
      // 핵심: へ->え 한 뒤에 "いく"의 い를 드롭하면 망함
      expect(converter("がっこうへいく")).toBe("각코에이쿠");
      expect(converter("としょかんへいく")).toBe("토쇼칸에이쿠");
      expect(converter("ほてるへいく")).toBe("호테루에이쿠");
    });
  });

  // =========================================================
  // を -> お (object marker)
  // =========================================================
  describe("particle を -> お (object marker) : boundary torture", () => {
    it("basic objects", () => {
      expect(converter("ほんをよむ")).toBe("혼오요무");
      expect(converter("みずをのむ")).toBe("미즈오노무");
      expect(converter("すしをたべる")).toBe("스시오타베루");
      expect(converter("パンをたべる")).toBe("판오타베루");
    });

    it("punctuation/spaces around を", () => {
      expect(converter("すしを、たべる")).toBe("스시오、타베루");
      expect(converter("みずを  のむ")).toBe("미즈오  노무");
      expect(converter("「パンを」たべる")).toBe("「판오」타베루");
      expect(converter("（ほんを）よむ")).toBe("（혼오）요무");
    });

    it("mixed scripts around を", () => {
      expect(converter("誕生日(たんじょうび)をいわう")).toBe(
        "誕生日(탄죠비)오이와우",
      );
      expect(converter("第3回をみる")).toBe("第3回오미루");
      expect(converter("AをBにする")).toBe("A오B니스루");
      expect(converter("😀をみる")).toBe("😀오미루");
    });

    it("multiple objects and chained particles", () => {
      expect(converter("パンをコーヒーをください")).toBe(
        "판오코히오쿠다사이",
      );
      expect(converter("すしをみずをのむ")).toBe("스시오미즈오노무");
      expect(converter("ほんをよんでいる")).toBe("혼오욘데이루"); // てい 보호
    });

    it("を right before vowel-starting word", () => {
      expect(converter("おちゃをのむ")).toBe("오챠오노무");
      expect(converter("えをえらぶ")).toBe("에오에라부"); // を가 끼면 えい 룰과 헷갈리기 쉬움
    });
  });

  // =========================================================
  // Combined: は/へ/を all together in one sentence
  // =========================================================
  describe("particles combined (は/へ/を) : nested & repeated", () => {
    it("simple combined sentences", () => {
      expect(converter("ぼくはがっこうへいく")).toBe("보쿠와각코에이쿠");
      expect(converter("これはほんをよむ")).toBe("코레와혼오요무");
      expect(converter("あなたはうちへかえる")).toBe("아나타와우치에카에루");
    });

    it("hard combined with punctuation/quotes", () => {
      expect(converter("「ぼくはパンをたべる」")).toBe(
        "「보쿠와판오타베루」",
      );
      expect(converter("（これはほんをよむ）よ")).toBe(
        "（코레와혼오요무）요",
      );
      expect(converter("それは、がっこうへいく？")).toBe(
        "소레와、각코에이쿠？",
      );
    });

    it("double topics + object + direction", () => {
      expect(converter("ぼくはほんをがっこうへもっていく")).toBe(
        "보쿠와혼오각코에못테이쿠",
      );
    });
  });
});
describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
  it("particle: は as 'wa' when used as topic marker", () => {
    expect(converter("あなたはせいふくです")).toBe("아나타와세후쿠데스"); // せい drop
    expect(converter("それはノートです")).toBe("소레와노토데스"); // ー drop
    expect(converter("あしたはさむい")).toBe("아시타와사무이");
    expect(converter("こんにちは")).toBe("콘니치와"); // 実発音
  });
});

describe("numbers & '-san' edge cases", () => {
  it("numbers: keep ASCII digits as-is", () => {
    expect(converter("12345")).toBe("12345");
    expect(converter("3")).toBe("3"); // 특히 3
    expect(converter("0")).toBe("0");
  });

  it("honorific: さん -> 상 (should not conflict with digit '3')", () => {
    expect(converter("おじさん")).toBe("오지상");
    expect(converter("おかあさん")).toBe("오카아상");
    expect(converter("かおるさん")).toBe("카오루상"); // '카루상' 계열 테스트(카오루)
    expect(converter("3さん")).toBe("3상");
    expect(converter("さん3")).toBe("산3");
  });

  it("mix: -san + particle は", () => {
    expect(converter("おじさんはやさしい")).toBe("오지상와야사시이");
    expect(converter("おかあさんはげんき")).toBe("오카아상와겡키");
  });
});

describe("word-final は vs particle は", () => {
  it("word-final は inside a word should stay 'ha' (not 'wa')", () => {
    expect(converter("いろは")).toBe("이로하");
    expect(converter("いろはです")).toBe("이로하데스");
  });

  it("particle は at the end / before predicate should be 'wa'", () => {
    expect(converter("わたしは")).toBe("와타시와");
    expect(converter("わたしはがくせい")).toBe("와타시와가쿠세");
  });
});

describe("ハロ / ハロー ending words", () => {
  it("katakana 'ハロ' family + long vowel mark drop", () => {
    expect(converter("ハロ")).toBe("하로");
    expect(converter("ハロー")).toBe("하로"); // ー drop
    expect(converter("ハローさん")).toBe("하로상"); // ー drop + さん
  });

  it("ハロー + particle は", () => {
    expect(converter("ハローさんはあいさつです")).toBe(
      "하로상와아이사츠데스",
    );
  });
});
