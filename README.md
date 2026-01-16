# Kanabarum - 가나발음

일본어 히라가나/가타카나/한자 문자열을 한국어 발음 표기로 바꿔주는 TypeScript 라이브러리입니다.
`kuromoji` 품사 분석을 이용해 は/へ 같은 조사를 안전하게 치환하고, 한자는 발음으로 변환합니다.

## 설치

```bash
pnpm add kanabarum
# 또는
npm install kanabarum
```

## 사용법

### 간편 호출

초기화 없이 즉시 사용도 가능합니다.

```ts
import { kanaToHangul } from "kanabarum";

const text = await kanaToHangul("さようなら");
// => "사요나라"
```

### 클래스 기반 호출

```ts
import { Kanabarum } from "kanabarum";

const kanabarum = new Kanabarum();
await kanabarum.init();

// 인사말
kanabarum.kanaToHangul("おはよう"); // => "오하요"
kanabarum.kanaToHangul("こんにちは"); // => "곤니치와"
kanabarum.kanaToHangul("こんばんは"); // => "곰방와"
kanabarum.kanaToHangul("ありがとう"); // => "아리가토"
kanabarum.kanaToHangul("すみません"); // => "스미마셍"

// 요음
kanabarum.kanaToHangul("きゃく"); // => "캬쿠"
kanabarum.kanaToHangul("しゅくだい"); // => "슈쿠다이"
kanabarum.kanaToHangul("ちょっと"); // => "춋토"
kanabarum.kanaToHangul("きゅう"); // => "큐"
kanabarum.kanaToHangul("りょこう"); // => "료코"

// つ 발음
kanabarum.kanaToHangul("つき"); // => "츠키"
kanabarum.kanaToHangul("つなみ"); // => "쓰나미"

// 촉음
kanabarum.kanaToHangul("きって"); // => "킷테"
kanabarum.kanaToHangul("がっこう"); // => "각코"
kanabarum.kanaToHangul("けっこん"); // => "켓콘"
kanabarum.kanaToHangul("ざっし"); // => "잣시"
kanabarum.kanaToHangul("やっちゃった"); // => "얏챳타"

// ん 규칙
kanabarum.kanaToHangul("にゃんこ"); // => "냥코"
kanabarum.kanaToHangul("さんぽ"); // => "삼포"
kanabarum.kanaToHangul("しんぶん"); // => "심분"
kanabarum.kanaToHangul("りんご"); // => "링고"
kanabarum.kanaToHangul("まんいち"); // => "만이치"

// 조사치환 は → わ
kanabarum.kanaToHangul("わたしはがくせいです"); // => "와타시와가쿠세데스"
kanabarum.kanaToHangul("これはペンです"); // => "코레와펜데스"
kanabarum.kanaToHangul("きょうはあつい"); // => "쿄와아츠이"

// 조사치환 へ → え
kanabarum.kanaToHangul("がっこうへいく"); // => "각코에이쿠"
kanabarum.kanaToHangul("うちへかえる"); // => "우치에카에루"

// 장모음(おう/よう/えい) 축약
kanabarum.kanaToHangul("さようなら"); // => "사요나라"
kanabarum.kanaToHangul("せんせい"); // => "센세"
kanabarum.kanaToHangul("おおさか"); // => "오사카"

// 가타카나
kanabarum.kanaToHangul("カタカナ"); // => "카타카나"
kanabarum.kanaToHangul("コーヒー"); // => "코히"
kanabarum.kanaToHangul("アイドル"); // => "아이도루"

// 장음 기호 변형(ー variants)
kanabarum.kanaToHangul("コーヒー"); // => "코히"
kanabarum.kanaToHangul("パーティー"); // => "파티"
kanabarum.kanaToHangul("ゲーム"); // => "게무"

// 커스텀 사전
kanabarum.kanaToHangul("すみません"); // => "스미마셍"
kanabarum.kanaToHangul("かわいい"); // => "카와이"
kanabarum.kanaToHangul("はひふへほ"); // => "하히후헤호"

// 한자 (발음으로 자동 변환)
kanabarum.kanaToHangul("東京"); // => "도쿄"
kanabarum.kanaToHangul("日本語"); // => "니홍고"
kanabarum.kanaToHangul("東京とりんご"); // => "도쿄토링고"

// 한자 + 후리가나
kanabarum.kanaToHangul("誕生日(たんじょうび)"); // => "탄죠비(탄죠비)"
kanabarum.kanaToHangul("京都(きょうと)"); // => "쿄토(쿄토)"

// 특수문자, 마침표
kanabarum.kanaToHangul("コーヒー, ください。"); // => "코히, 쿠다사이。"
kanabarum.kanaToHangul("「きょう」"); // => "「쿄」"
kanabarum.kanaToHangul("（がっこう）"); // => "（각코）"
```
