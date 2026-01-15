import { beforeAll, describe, expect, it } from "vitest";

import { KanaBarum, kanaToHangul, type KanaToHangul } from "./kanaBarum";

let converter: KanaToHangul;

beforeAll(async () => {
  converter = await KanaBarum.init();
});

describe("KanaBarum - Kana→Hangul 변환 스펙", () => {
  // ---------------------------------------------------------
  // 0) Lazy init helper (API contract)
  // ---------------------------------------------------------
  describe("API 계약: lazy init helper", () => {
    it("직접 호출 헬퍼(kanaToHangul)는 init 없이도 await로 동작한다", async () => {
      await expect(kanaToHangul("さようなら")).resolves.toBe("사요나라");
      await expect(kanaToHangul("ありがとう")).resolves.toBe("아리가토");
    });
  });

  // =========================================================
  // 1) 정규화/전처리
  // =========================================================
  describe("정규화/전처리", () => {
    /**
     * 이 섹션은 “입력의 표기 흔들림”을 흡수하는 스펙이다.
     * - NFC/NFD(결합 탁점/반탁점)
     * - 반각 카타카나
     * - 장음 기호 및 유사 대시
     * - 공백/구두점/이모지/한자 보존
     */

    it("NFD 결합 탁점/반탁점 입력은 NFC처럼 처리된다", () => {
      // がっこう = がっこう (NFD)
      expect(converter("か\u3099っこう")).toBe("각코");
      // ぱ = ぱ (NFD handakuten)
      expect(converter("は\u309aん")).toBe("판");
    });

    it("반각 카타카나는 정규화되어 동일 규칙이 적용된다", () => {
      expect(converter("ﾊﾝｶｸｶﾀｶﾅ")).toBe("항카쿠카타카나");
      expect(converter("ﾊﾟﾝｹｰｷ")).toBe("팡케키");
      expect(converter("ｶﾀｶﾅ")).toBe("카타카나");
    });

    it("장음 기호(ー) 및 유사 대시들은 장음으로 취급되어 드롭된다", () => {
      expect(converter("コーヒー")).toBe("코히");
      // FF70 'ｰ'
      expect(converter("ミュージック")).toBe("뮤지쿠");
      // U+2015 '―'
      expect(converter("コ―ヒ―")).toBe("코히");
    });

    it("공백/구두점/전각 괄호/따옴표/이모지는 그대로 보존된다", () => {
      expect(converter("コーヒー, ください。")).toBe("코히, 쿠다사이。");
      expect(converter("「きょう」")).toBe("「쿄」");
      expect(converter("（がっこう）")).toBe("（각코）");
      expect(converter("  すし  ")).toBe("  스시  ");
      expect(converter("すごい👍")).toBe("스고이👍");
    });

    it("가나가 아닌 문자는 그대로 통과시키고, 괄호 속 후리가나만 변환한다", () => {
      expect(converter("誕生日(たんじょうび)")).toBe("誕生日(탄죠비)");
      expect(converter("第3回(だいさんかい)")).toBe("第3回(다이상카이)");
      expect(converter("京都(きょうと)")).toBe("京都(쿄토)");
      expect(converter("東京駅(とうきょうえき)")).toBe("東京駅(도쿄에키)");
      expect(converter("日本語(にほんご)")).toBe("日本語(니홍고)");
    });

    it("반복 기호/특이 기호 입력은 크래시 없이 통과(또는 정책 처리)된다", () => {
      expect(() => converter("ゝゞヽヾ")).not.toThrow();
      expect(converter("ゝゞ")).toBe("ゝゞ");
    });

    it("긴 반복 입력도 무한루프 없이 종료된다(회귀 방지)", () => {
      const s = "がっこうへいく。".repeat(200);
      expect(() => converter(s)).not.toThrow();
    });

    it("출력에는 결합 탁점/반탁점 코드포인트가 남지 않는다", () => {
      const out = converter("か\u3099っこう は\u309aん");
      expect(out).not.toMatch(/[\u3099\u309A]/);
    });
  });

  // =========================================================
  // 2) 모라 변환(기본/결합)
  // =========================================================
  describe("모라 변환(기본/결합)", () => {
    /**
     * 이 섹션은 “테이블 기반 모라 변환” 스펙이다.
     * - SINGLE(기본 모라)
     * - YOUON(요음 결합: SMALL_Y)
     * - LOAN(외래어 결합: SMALL_V)
     * - 특정 행(H행), つ 등 기본 매핑
     * - 비정상 작은 가나 입력의 안전성(크래시 금지/통과 정책)
     */

    it("기본 히라가나 변환(인삿말/자주 쓰는 단어)", () => {
      expect(converter("さようなら")).toBe("사요나라");
      expect(converter("ありがとう")).toBe("아리가토");
      expect(converter("おはよう")).toBe("오하요");
      expect(converter("こんばんは")).toBe("곰방와");
      expect(converter("すみません")).toBe("스미마셍");
    });

    it("요음 결합(きゃ/しゅ/ちょ 등)", () => {
      expect(converter("きゃく")).toBe("캬쿠");
      expect(converter("しゅくだい")).toBe("슈쿠다이");
      expect(converter("ちょっと")).toBe("춋토");
      expect(converter("きゅう")).toBe("큐");
      expect(converter("きょう")).toBe("쿄");
      expect(converter("しょくどう")).toBe("쇼쿠도");
      expect(converter("にゅうがく")).toBe("뉴가쿠");
      expect(converter("びょういん")).toBe("뵤인");
      expect(converter("ぴょん")).toBe("푱");
      expect(converter("りょこう")).toBe("료코");
    });

    it("외래어 결합(ティ/ファ/フォ 등) + 카타카나 정규화", () => {
      expect(converter("カタカナ")).toBe("카타카나");
      expect(converter("パーティー")).toBe("파티");
      expect(converter("ティッシュ")).toBe("팃슈");
      expect(converter("フォーク")).toBe("포쿠");
      expect(converter("ファイル")).toBe("파이루");
      expect(converter("フォト")).toBe("포토");
      expect(converter("フィギュア")).toBe("피규아");
      expect(converter("デュエル")).toBe("듀에루");
    });

    it("H행 기본 매핑 + 요음(ひゃ/ひゅ/ひょ)", () => {
      expect(converter("は")).toBe("하");
      expect(converter("ひ")).toBe("히");
      expect(converter("ふ")).toBe("후");
      expect(converter("へ")).toBe("헤");
      expect(converter("ほ")).toBe("호");
      expect(converter("はひふへほ")).toBe("하히후헤호");

      expect(converter("ひゃ")).toBe("햐");
      expect(converter("ひゅ")).toBe("휴");
      expect(converter("ひょ")).toBe("효");
      expect(converter("ひゃく")).toBe("햐쿠");
    });

    it("つ 계열", () => {
      expect(converter("つき")).toBe("츠키");
      expect(converter("つなみ")).toBe("쓰나미");
      expect(converter("つめ")).toBe("츠메");
    });

    it("특수 고정 패턴: ちゃん → 쨩", () => {
      expect(converter("めいちゃん")).toBe("메이쨩");
      expect(converter("あかちゃん")).toBe("아카쨩");
      expect(converter("みっちゃん")).toBe("밋쨩");
      expect(converter("まーちゃん")).toBe("마쨩");
    });

    it("비정상 작은 가나 단독 입력은 크래시 없이 정책대로 처리한다", () => {
      expect(() => converter("ゃ")).not.toThrow();
      expect(() => converter("ゅ")).not.toThrow();
      expect(() => converter("ょ")).not.toThrow();
      expect(() => converter("ぁぃぅぇぉ")).not.toThrow();

      // 정책: 단독 small kana는 그대로 통과(권장)
      expect(converter("ゃ")).toBe("ゃ");
    });

    it("미지원/혼합 문자도 크래시 없이 통과한다", () => {
      expect(converter("!?(びっくり)")).toBe("!?(빗쿠리)");
      expect(converter("AひB")).toBe("A히B");
    });
  });

  // =========================================================
  // 3) 촉음(っ)
  // =========================================================
  describe("촉음(っ)", () => {
    /**
     * 이 섹션은 촉음(っ) 처리 스펙이다.
     * - 다음 자음군에 따라 종성 선택(기본 ㅅ, p/b 계열이면 ㅂ, k/g는 상황별 ㄱ/ㅅ)
     * - 문장 시작/단독/구두점 뒤 촉음의 안전성(크래시 금지 + 정책 출력)
     */

    it("기본 촉음 변환(대표 케이스)", () => {
      expect(converter("かった")).toBe("캇타");
      expect(converter("きって")).toBe("킷테");
      expect(converter("いって")).toBe("잇테");
      expect(converter("がっこう")).toBe("각코");
      expect(converter("ろっく")).toBe("록쿠");
      expect(converter("けっこん")).toBe("켓콘");
      expect(converter("ざっし")).toBe("잣시");
      expect(converter("きっぷ")).toBe("킵푸");
      expect(converter("まっすぐ")).toBe("맛스구");
    });

    it("촉음 + p/b 계열이면 ㅂ 종성이 우선된다", () => {
      expect(converter("はっぴょう")).toBe("합표");
      expect(converter("しっぽ")).toBe("십포");
      expect(converter("しゅっぱつ")).toBe("슙파츠");
    });

    it("촉음 + 요음 경계도 안정적이다", () => {
      expect(converter("ちょっぴり")).toBe("춉피리");
      expect(converter("きゃっきゃ")).toBe("캭캬");
      expect(converter("けっきょく")).toBe("켓쿄쿠");
    });

    it("H행 앞 촉음도 안정적이다(기본 ㅅ 종성)", () => {
      expect(converter("きっは")).toBe("킷하");
      expect(converter("きっひ")).toBe("킷히");
      expect(converter("きっふ")).toBe("킷후");
      expect(converter("きっほ")).toBe("킷호");
      expect(converter("きっひゃ")).toBe("킷햐");
      expect(converter("きっひょ")).toBe("킷효");
    });

    it("미완성 촉음은 ッ으로 출력", () => {
      expect(converter("っ")).toBe("ッ");
      expect(converter("っっっか")).toBe("ッッッ카");
    });

    it("문장 시작/단독/구두점 뒤 촉음은 크래시 없이 정책대로 처리한다", () => {
      expect(converter("っ")).toBe("ッ");
      expect(converter("っあ")).toBe("ッ아");
      expect(converter("！っか")).toBe("！ッ카");
      expect(converter("「っ」")).toBe("「ッ」");
    });
  });

  // =========================================================
  // 4) 비음(ん) 및 -san
  // =========================================================
  describe("비음(ん) 및 -san", () => {
    /**
     * 이 섹션은 모라비음(ん) 종성 동화 및 -san 처리 스펙이다.
     * - k/g 앞: ㅇ(ng)
     * - p/b/m 앞: ㅁ(m)
     * - 모음/y/w 앞: ㄴ(n)
     * - 요음 뒤 어말 ん: ㅇ(ng) 정책
     * - さん: 상 (토큰 기반 판별)
     */

    it("기본: ん은 종성 ㄴ으로 처리된다(모음/y/w 앞 포함)", () => {
      expect(converter("てんいん")).toBe("텐인");
      expect(converter("かんおん")).toBe("칸온");
      expect(converter("まんいち")).toBe("만이치");
      expect(converter("ほんとに")).toBe("혼토니");
    });

    it("k/g 앞에서는 ㅇ으로 동화된다", () => {
      expect(converter("あんこ")).toBe("앙코");
      expect(converter("りんご")).toBe("링고");
      expect(converter("りんぐ")).toBe("링구");
      expect(converter("あんがい")).toBe("앙가이");
      expect(converter("りんかい")).toBe("링카이");
      expect(converter("しんがぽーる")).toBe("싱가포루");
    });

    it("p/b/m 앞에서는 ㅁ으로 동화된다", () => {
      expect(converter("さんぽ")).toBe("삼포");
      expect(converter("しんぶん")).toBe("심분");
      expect(converter("てんぷら")).toBe("템푸라");
      expect(converter("かんぱい")).toBe("캄파이");
      expect(converter("しんまい")).toBe("심마이");
      expect(converter("さんび")).toBe("삼비");
      expect(converter("しんぽ")).toBe("심포");
      expect(converter("てんぷ")).toBe("템푸");
    });

    it("요음 뒤 + 어말 ん은 ㅇ으로 처리된다(정책)", () => {
      expect(converter("にゃん")).toBe("냥");
      expect(converter("しょん")).toBe("숑");
      expect(converter("みょん")).toBe("묭");
      expect(converter("にょん")).toBe("뇽");
    });

    it("-san: さん은 상으로 변환된다(숫자 '3'과 충돌하지 않는다)", () => {
      expect(converter("たなかさん")).toBe("타나카상");
      expect(converter("すずきさん")).toBe("스즈키상");
      expect(converter("おじさん")).toBe("오지상");
      expect(converter("おかあさん")).toBe("오카아상");
      expect(converter("3さん")).toBe("3상");
      expect(converter("さん3")).toBe("산3");
    });

    it("-san + 조사/문장 결합에서도 안정적이다", () => {
      expect(converter("おじさんはやさしい")).toBe("오지상와야사시");
      expect(converter("おかあさんはげんき")).toBe("오카아상와겡키");
      expect(converter("ハローさんはあいさつです")).toBe(
        "하로상와아이사츠데스",
      );
    });
  });

  // =========================================================
  // 5) 장음 드롭 규칙
  // =========================================================
  describe("장음 드롭 규칙", () => {
    /**
     * 이 섹션은 “장음처럼 보이는 표기”를 드롭하는 스펙이다.
     * - o + う 계열: こう/とう/どう/よう → こ/と/ど/よ
     * - おお 반복 축약
     * - えい / せい / けい 등 い 드롭 + 예외(せいな/せいか/けいと/えいこ)
     * - ね + え 드롭
     * - でしょう / ましょう trailing う만 드롭
     * - 단, ている / ていく 등 문법 경계에서 てい를 잘못 드롭하면 안 됨(보호)
     */

    it("o+う 계열 드롭(こう/とう/どう/よう) 중간", () => {
      expect(converter("さようなら")).toBe("사요나라");
      expect(converter("どうぞ")).toBe("도조");
      expect(converter("ちょうど")).toBe("쵸도");
    });

    it("o+う 계열 드롭(こう/とう/どう/よう) 마지막", () => {
      expect(converter("おめでとう")).toBe("오메데토");
      expect(converter("りょこう")).toBe("료코");
      expect(converter("がっこう")).toBe("각코");
    });

    it("おお 반복은 축약된다", () => {
      expect(converter("おおきい")).toBe("오키이");
      expect(converter("おおさか")).toBe("오사카");
      expect(converter("おおおお")).toBe("오");
    });

    it("えい/せい/けい 계열 い 드롭 + 예외가 맞다", () => {
      expect(converter("えいご")).toBe("에고");
      expect(converter("けいさつ")).toBe("케사츠");
    });

    it("せい계열 い 드롭 ", () => {
      expect(converter("せんせい")).toBe("센세");
      expect(converter("せいかつ")).toBe("세카츠");
      expect(converter("せいぶつ")).toBe("세부츠");
      expect(converter("せいしん")).toBe("세신");
      expect(converter("せいり")).toBe("세리");
      expect(converter("せいこう")).toBe("세코");
      expect(converter("せいひん")).toBe("세힌");
    });

    it("えい/せい/けい 계열 い 드롭 예외", () => {
      // 예외(드롭 금지)
      expect(converter("がっこうへいく")).toBe("각코에이쿠");

      expect(converter("おおきいなすいか")).toBe("오키이나스이카");
      expect(converter("こい")).toBe("코이");
      expect(converter("あい")).toBe("아이");
      expect(converter("うい")).toBe("우이");
    });
    it("ねえ 드롭이 적용된다", () => {
      expect(converter("おねえさん")).toBe("오네상");
      expect(converter("ねえさん")).toBe("네상");
      expect(converter("ねえちゃん")).toBe("네쨩");
    });

    it("연속 장음 패턴도 안정적이다", () => {
      expect(converter("えいえい")).toBe("에에");
      expect(converter("ようよう")).toBe("요요");
      expect(converter("こうこう")).toBe("코코");
    });

    it("정중/보조 표현: でしょう/ましょう는 trailing う만 드롭된다", () => {
      expect(converter("そうでしょう")).toBe("소데쇼");
      expect(converter("いいでしょうか")).toBe("이이데쇼카");
      expect(converter("いきましょう")).toBe("이키마쇼");
      expect(converter("やりましょうか")).toBe("야리마쇼카");
    });

    it("문법 경계 보호: ている / ていく 에서 てい의 い는 드롭하면 안 된다", () => {
      expect(converter("たべている")).toBe("타베테이루");
      expect(converter("みている")).toBe("미테이루");
      expect(converter("している")).toBe("시테이루");

      // 핵심: 'もっていく'의 'ってい'를 장음처럼 오인해서 い를 드롭하면 품질 급락
      expect(converter("もっていく")).toBe("못테이쿠");
    });

    it("특별 사전 매핑(예: とうきょう)", () => {
      expect(converter("とうきょう")).toBe("도쿄");
      expect(converter("ﾄｰｷｮｰ")).toBe("도쿄");
    });
  });

  // =========================================================
  // 6) 문법/토큰 기반 휴리스틱 (조사/유성화)
  // =========================================================
  describe("문법/토큰 기반 휴리스틱 (조사/유성화)", () => {
    /**
     * 이 섹션은 “토큰/경계 기반 문법 휴리스틱” 스펙이다.
     * - 조사 발음 치환: は→わ, へ→え, を→お
     * - 단어 내부/지명/어휘는 오인 방지(へや, はちのへ, …へ)
     * - 단어 시작 유성화: と/こ가 조건부로 도/고가 될 수 있음
     *   - 단, 조사로 쓰인 と/こ는 유성화 금지(예: りんごとりんご)
     *   - 다음 모라 블록/앞이 촉음/こう 패턴 등 차단 규칙 존재
     */

    // --------------------
    // Particles: は / へ / を
    // --------------------
    describe("조사 발음 치환 (は/へ/を)", () => {
      it("は(주제 표지)는 '와'로 읽힌다", () => {
        expect(converter("わたしはがくせいです")).toBe("와타시와가쿠세데스");
        expect(converter("これはペンです")).toBe("고레와펜데스");
        expect(converter("これはともだちです")).toBe("고레와도모다치데스");
        expect(converter("きょうはあつい")).toBe("쿄와아츠이");
        expect(converter("こんにちは")).toBe("곤니치와");
      });

      it("へ(방향 표지)는 '에'로 읽힌다", () => {
        expect(converter("がっこうへいく")).toBe("각코에이쿠");
        expect(converter("うちへかえる")).toBe("우치에카에루");
        expect(converter("そとへでる")).toBe("소토에데루");
        expect(converter("まちへでかける")).toBe("마치에데카케루");
      });

      it("を(목적격)는 '오'로 읽힌다", () => {
        expect(converter("すしをたべる")).toBe("스시오타베루");
        expect(converter("みずをのむ")).toBe("미즈오노무");
        expect(converter("パンをたべる")).toBe("판오타베루");
      });
    });

    // --------------------
    // Boundary stress: punctuation/quotes/parentheses
    // --------------------
    describe("경계 스트레스 (구두점/괄호/따옴표/공백)", () => {
      it("조사 치환은 괄호/따옴표/구두점 경계에서도 안정적이다", () => {
        expect(converter("（きょうはあつい）")).toBe("（쿄와아츠이）");
        expect(converter("それは、ほんと？")).toBe("소레와、혼토？");
        expect(converter("「パンを」たべる")).toBe("「판오」타베루");
        expect(converter("（ほんを）よむ")).toBe("（혼오）요무");
        expect(converter("がっこうへ。")).toBe("각코에。");
        expect(converter("東京(とうきょう)へ！")).toBe("東京(도쿄)에！");
      });

      it("공백이 섞여도 조사 치환이 안정적이다", () => {
        expect(converter("みずを  のむ")).toBe("미즈오  노무");
        expect(converter("すしを、たべる")).toBe("스시오、타베루");
      });
    });

    // --------------------
    // False positives: lexical words must NOT be rewritten
    // --------------------
    describe("오인 방지: 단어 내부/지명/어휘는 조사로 치환되지 않는다", () => {
      it("へ야(へや)는 단어이므로 '헤야'로 남아야 한다", () => {
        expect(converter("へや")).toBe("헤야");
        // 첫 へ(단어)=헤, 두 번째 へ(조사)=에
        expect(converter("へやへいく")).toBe("헤야에이쿠");
      });

      it("…のへ 패턴은 지명/어휘로 취급되어 보호된다(정책)", () => {
        expect(converter("はちのへ")).toBe("하치노헤");
        expect(converter("さんのへ")).toBe("산노헤");
        expect(converter("はちのへ。")).toBe("하치노헤。");
      });

      it("어휘로 끝나는 …へ 는 조사 へ→え로 바뀌지 않는다(정책)", () => {
        expect(converter("いにしへ")).toBe("이니시헤");
        expect(converter("いにしへ！")).toBe("이니시헤！");
        expect(converter("おきへ")).toBe("오키헤");
        expect(converter("おきへ。")).toBe("오키헤。");
        expect(converter("もとへ")).toBe("모토헤");
        expect(converter("もとへ、")).toBe("모토헤、");
      });
    });

    // --------------------
    // Voicing heuristics: と / こ at token start
    // --------------------
    describe("단어 시작 유성화 휴리스틱 (と/こ)", () => {
      it("단어 시작 と/こ는 조건부로 도/고가 될 수 있다", () => {
        // 대표: としょかん(도서관)의 と는 단어 구성요소로 유성화 허용
        expect(converter("としょかんへいく")).toBe("도쇼칸에이쿠");
      });

      it("조사로 쓰인 と는 유성화되면 안 된다(토큰 기반 차단)", () => {
        expect(converter("りんごとりんご")).toBe("링고토링고");
      });

      it("복합 문장에서도 (조사/유성화/장음/촉음/비음)이 같이 안정적으로 동작한다", () => {
        expect(converter("ぼくはがっこうへいく")).toBe("보쿠와각코에이쿠");
        expect(converter("ぼくはほんをがっこうへもっていく")).toBe(
          "보쿠와혼오각코에못테이쿠",
        );
      });
    });

    // --------------------
    // Contractions / colloquial grammar
    // --------------------
    describe("구어 축약/문법 패턴(じゃ/ちゃ/って/だって 등) - 안정성/회귀 방지", () => {
      it("인용/강조/구어: だって/って/ってば", () => {
        expect(converter("だって")).toBe("닷테");
        // 단독 って 는 구현 정책에 따라 pass-through 가능. 현재 테스트는 '크래시 없이'를 보장.
        expect(() => converter("って")).not.toThrow();
        expect(() => converter("ってば")).not.toThrow();
        expect(converter("だってさ")).toBe("닷테사");
      });

      it("じゃ(では→じゃ), ちゃ(ては→ちゃ) 계열 축약", () => {
        expect(converter("それじゃ")).toBe("소레쟈");
        expect(converter("じゃない")).toBe("쟈나이");
        expect(converter("じゃなかった")).toBe("쟈나캇타");

        expect(converter("たべちゃう")).toBe("타베챠우");
        expect(converter("みちゃった")).toBe("미챳타");
        expect(converter("しちゃう")).toBe("시챠우");
        expect(converter("やっちゃった")).toBe("얏챳타");
      });
    });

    // --------------------
    // Negatives / conditionals / endings
    // --------------------
    describe("부정/조건/종결 어미 - 경계 안정성", () => {
      it("부정형(ない/なかった)", () => {
        expect(converter("いかない")).toBe("이카나이");
        expect(converter("たべない")).toBe("타베나이");
        expect(converter("しない")).toBe("시나이");
        expect(converter("いかなかった")).toBe("이카나캇타");
        expect(converter("たべなかった")).toBe("타베나캇타");
        expect(converter("しなかった")).toBe("시나캇타");
      });

      it("조건/접속(たら/なら/ても)", () => {
        expect(converter("いったら")).toBe("잇타라");
        expect(converter("やったら")).toBe("얏타라");
        expect(converter("かったら")).toBe("캇타라");

        expect(converter("いくなら")).toBe("이쿠나라");
        expect(converter("するなら")).toBe("스루나라");

        expect(converter("いっても")).toBe("잇테모");
        expect(converter("やっても")).toBe("얏테모");
      });

      it("종결 조사(ね/よ/かな/かい) 유지", () => {
        expect(converter("いいね")).toBe("이이네");
        expect(converter("いいよ")).toBe("이이요");
        expect(converter("いいかな")).toBe("이이카나");
        expect(converter("いいかい")).toBe("이이카이");
        expect(converter("いく？")).toBe("이쿠？");
      });

      it("〜んです 계열 + 비음 동화 안정성", () => {
        expect(converter("そうなんです")).toBe("소난데스");
        expect(converter("なんですか")).toBe("난데스카");
        expect(converter("だめなんです")).toBe("다메난데스");
        expect(converter("しんぱいなんです")).toBe("심파이난데스");
      });
    });

    // --------------------
    // Numbers / safe keeping
    // --------------------
    describe("숫자/기호 보존과 -san 충돌 방지", () => {
      it("ASCII 숫자는 그대로 유지된다", () => {
        expect(converter("12345")).toBe("12345");
        expect(converter("3")).toBe("3");
        expect(converter("0")).toBe("0");
      });

      it("숫자 + さん 케이스에서도 '3'과 혼동하지 않는다", () => {
        expect(converter("3さん")).toBe("3상");
        expect(converter("さん3")).toBe("산3");
      });
    });
  });
});

describe("실제 일본어 문장 예시", () => {
  it("표준 히라가나 문장(구두점 포함)", () => {
    expect(
      converter(
        "はじめまして。わたしはにほんごをべんきょうしています。どうぞよろしくおねがいします。",
      ),
    ).toBe(
      "하지메마시테。와타시와니홍고오벵쿄시테이마스。도조요로시쿠오네가이시마스。",
    );
    expect(converter("きょうはとてもいいてんきですね。")).toBe(
      "쿄와토테모이이텡키데스네。",
    );
    expect(
      converter(
        "きょうはとてもいいてんきですね。そとへさんぽにいきましょうか。おいしいコーヒーをのみたいです。",
      ),
    ).toBe(
      "쿄와토테모이이텡키데스네。소토에삼포니이키마쇼카。오이시코히오노미타이데스。",
    );
    expect(
      converter(
        "わたしはきのう、ともだちといっしょにえいがをみました。とてもおもしろかったです。またいきたいです。",
      ),
    ).toBe(
      "와타시와키노、도모다치토잇쇼니에가오미마시타。토테모오모시로캇타데스。마타이키타이데스。",
    );
  });
});
