# Kanabarum 개발 가이드

이 디렉터리는 TypeScript 소스를 포함하며, `dist/`로 컴파일해 npm에 배포합니다.

## 의존성 설치

```bash
pnpm install
```

## 빌드

```bash
pnpm build
```

- `tsup` 번들러가 `src/index.ts`를 기준으로 ESM 번들과 타입 선언을 생성합니다.
- 소스에서는 확장자를 생략해도 되며, 결과물은 자동으로 `.js` 확장자가 붙어 Node ESM 규칙을 만족합니다.
- 테스트 파일(`*.spec.ts`)은 포함되지 않습니다.

## 코드 스타일 (Biome)

- `biome.json` 설정을 따르며 다음 명령으로 검사/포맷합니다.

```bash
pnpm lint    # Biome check
pnpm format  # Biome format --write
```

## 테스트

```bash
pnpm test        # Vitest run (CI용)
pnpm test:watch  # watch 모드
```

## 클린업

```bash
pnpm clean
```

- `dist/` 디렉터리를 삭제해 새로 빌드하기 전에 정리합니다.

## 배포

```bash
pnpm login              # 최초 1회 (npm CLI 사용 시 `npm login`)
pnpm publish --access public
```

- `prepublishOnly` 스크립트가 자동으로 `clean`과 `build`를 수행하므로 별도 준비 없이 `npm publish`만 실행하면 됩니다.

## 구조

- `tsconfig.json`: 개발용 기본 설정(emit 없음, IDE 타입 체크용, Vitest 타입 포함)
- `tsup.config.ts`: 번들 설정(엔트리/타겟/dts/treeshake 등)
- `src/kanaBarum.ts`: 초기화/싱글턴/비동기 API 담당
- `src/kanaToHangul.ts`: 실제 변환 로직과 lazy/sync API
- `src/tokenizer.ts`: kuromoji 의존성 초기화 및 재사용 로직
- `src/index.ts`: 패키지 진입점, 공개 API를 재-export
- `src/kanaToHangul.spec.ts`: 변환 로직 검증용 테스트 (배포 대상 아님)
