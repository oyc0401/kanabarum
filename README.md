# Kanabarum

일본어 가나 문자열을 한국어 발음 표기로 바꿔주는 TypeScript 라이브러리입니다.  
`kuromoji` 품사 분석을 이용해 は/へ/を 같은 조사만 안전하게 치환합니다.

## 설치

```bash
pnpm add kanabarum
# 또는
npm install kanabarum
```

## 사용법

### 1) 간편 호출 (lazy init)

```ts
import { kanaToHangul } from "kanabarum";

const text = await kanaToHangul("さようなら");
console.log(text); // => "사요나라"
```

### 2) 명시 초기화 후 동기 호출

```ts
import { KanaBarum } from "kanabarum";

const converter = await KanaBarum.init();
converter("ありがとう"); // => "아리가토"
```

## API

- `kanaToHangul(input: string): Promise<string>`  
  첫 호출 시 자동으로 tokenizer를 초기화하고 이후에는 같은 인스턴스를 재사용합니다.
- `KanaBarum.init(): Promise<KanaToHangul>` (`KanaToHangulMaker` alias 제공)  
  SSR 환경 등에서 초기화 시점을 직접 제어하고 싶을 때 사용합니다.

## 테스트

```bash
pnpm test
```

`src/kanaToHangul.spec.ts`에 있는 Vitest 스펙이 실행됩니다.

개발 및 배포용 세부 가이드는 `src/README.md`를 참고하세요.
