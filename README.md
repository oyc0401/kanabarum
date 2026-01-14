# Kanabarum - 가나발음

일본어 히라가나/가타카나 문자열을 한국어 발음 표기로 바꿔주는 TypeScript 라이브러리입니다.  
`kuromoji` 품사 분석을 이용해 は/へ 같은 조사를 안전하게 치환합니다.

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

### 초기화 후 호출

```ts
import { KanaBarum } from "kanabarum";

const converter = await KanaBarum.init();

// 인사말
converter("おはよう"); // => "오하요"
converter("こんにちは"); // => "곤니치와"
converter("こんばんは"); // => "곰방와"
converter("ありがとう"); // => "아리가토"
converter("すみません"); // => "스미마셍"

// 요음
converter("きゃく"); // => "캬쿠"
converter("しゅくだい"); // => "슈쿠다이"
converter("ちょっと"); // => "춋토"
converter("きゅう"); // => "큐"
converter("りょこう"); // => "료코"

// つ 발음
converter("つき"); // => "츠키"
converter("つなみ"); // => "쓰나미"

// 촉음
converter("きって"); // => "킷테"
converter("がっこう"); // => "각코"
converter("けっこん"); // => "켓콘"
converter("ざっし"); // => "잣시"
converter("やっちゃった"); // => "얏챳타"

// ん 규칙
converter("にゃんこ"); // => "냥코"
converter("さんぽ"); // => "삼포"
converter("しんぶん"); // => "심분"
converter("りんご"); // => "링고"
converter("まんいち"); // => "만이치"

// 조사치환 は → わ
converter("わたしはがくせいです"); // => "와타시와가쿠세데스"
converter("これはペンです"); // => "코레와펜데스"
converter("きょうはあつい"); // => "쿄와아츠이"

// 조사치환 へ → え
converter("がっこうへいく"); // => "각코에이쿠"
converter("うちへかえる"); // => "우치에카에루"

// 장모음(おう/よう/えい) 축약
converter("さようなら"); // => "사요나라"
converter("せんせい"); // => "센세"
converter("おおさか"); // => "오사카"

// 가타카나
converter("カタカナ"); // => "카타카나"
converter("コーヒー"); // => "코히"
converter("アイドル"); // => "아이도루"

// 장음 기호 변형(ー variants)
converter("コーヒー"); // => "코히"
converter("パーティー"); // => "파티"
converter("ゲーム"); // => "게무"

// 커스텀 사전
converter("すみません"); // => "스미마셍"
converter("かわいい"); // => "카와이"
converter("はひふへほ"); // => "하히후헤호"

// 한자포함
converter("誕生日(たんじょうび)"); // => "誕生日(탄죠비)"
converter("第3回(だいさんかい)"); // => "第3回(다이상카이)"
converter("京都(きょうと)"); // => "京都(쿄토)"

// 특수문자, 마침표
converter("コーヒー, ください。"); // => "코히, 쿠다사이。"
converter("「きょう」"); // => "「쿄」"
converter("（がっこう）"); // => "（각코）"

// 전각/반각
converter("ﾊﾝｸﾞﾙ"); // => "항구루"
converter("ｶﾀｶﾅ"); // => "카타카나"
converter("ﾄ-ｷｮ-"); // => "토쿄"

// NFC 합성
converter("がくせい"); // => "가쿠세"
converter("ぱｰてぃｰ"); // => "파티"
converter("べんごし"); // => "벵고시"


```
