# GamsaNote MVP

GamsaNote는 회계감사 기준서 제목만 보고 답안을 직접 작성하고, 키워드 기반 채점과 오답 반복으로 암기하는 모바일 우선 학습 앱입니다. 이 MVP는 React + Vite + TypeScript + Supabase + Stitches 조합으로 구성되어 있으며 Cloudflare Pages 배포를 기준으로 정리되어 있습니다.

## 기술 스택

- React 18
- Vite 5
- TypeScript
- React Router
- Stitches
- Supabase Auth / DB
- npm

## 주요 기능

- 로그인 / 회원가입 / 로그아웃
- 보호 라우트
- 홈에서 `학습 시작`, `오답 시작`, `학습기록` 진입
- 전체 랜덤 / 편별 1문제 연속 학습
- 키워드 기반 채점
- 결과 화면에서 정답, 내 답안, 빠진 키워드 확인
- 60점 미만 자동 오답노트 등록
- 수동 오답노트 추가 / 제거
- 학습 기록 대시보드
- Supabase 미설정 시 샘플 데이터 + 로컬 저장 모드

## 로컬 실행 방법

```bash
npm install
npm run dev
```

빌드:

```bash
npm run build
```

미리보기:

```bash
npm run preview
```

## 환경변수 설정

`.env.example`을 참고해 `.env`를 만듭니다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- `VITE_SUPABASE_URL`: 브라우저 앱에서 사용하는 Supabase URL
- `VITE_SUPABASE_ANON_KEY`: 브라우저 앱에서 사용하는 anon key

`scripts/importStandards.ts`를 사용할 때만 추가로 아래 값을 로컬 셸 또는 별도 `.env`에 넣습니다.

```env
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저 코드에 넣지 않습니다.

## Supabase 설정 방법

1. Supabase 프로젝트를 생성합니다.
2. [supabase/schema.sql](./supabase/schema.sql)을 SQL Editor에서 실행합니다.
3. Authentication에서 Email provider를 켭니다.
4. Site URL / Redirect URL을 로컬 및 배포 도메인에 맞게 설정합니다.
5. `.env`에 URL, anon key, service role key를 넣습니다.

## schema.sql 적용

`supabase/schema.sql`에는 다음이 포함되어 있습니다.

- `profiles`
- `standards`
- `study_attempts`
- `user_standard_stats`
- `wrong_notes`
- `updated_at` 자동 갱신 trigger
- RLS 정책

## Google Sheets 데이터 운영 방식

- Google Sheets는 마스터 원본입니다.
- Supabase `standards`는 앱 운영 DB입니다.
- Google Sheets를 수정해도 다시 import하지 않으면 앱에는 반영되지 않습니다.
- `id`는 원칙적으로 바꾸지 않습니다.
- 삭제 대신 `isActive=false`를 사용합니다.

## TSV 다운로드 및 import 방법

Google Sheets 컬럼은 아래 헤더 기준을 따릅니다.

`id contentType sourceRef partNo chapterNo sectionNo topicNo parenNo bracketNo itemNo title answer level examYears requiredKeywords optionalKeywords tags isActive checkStatus`

운영 흐름:

1. Google Sheets에서 기준서 데이터를 정리합니다.
2. TSV로 다운로드합니다.
3. `data/standards.tsv`에 저장합니다.
4. dry-run 검증:

```bash
npm run import:standards data/standards.tsv -- --dry-run
```

5. 실제 import:

```bash
npm run import:standards data/standards.tsv
```

스크립트는 `id` 기준으로 `standards` 테이블에 upsert합니다.

## 샘플 데이터와 fallback 동작

- `src/data/sampleStandards.ts`에 샘플 문제 5개가 포함되어 있습니다.
- Supabase 환경변수가 없거나 `standards` 데이터가 비어 있으면 샘플 기준서로 동작합니다.
- 이 경우 학습 기록은 브라우저 로컬 스토리지에 저장됩니다.

## Cloudflare Pages 배포 방법

Build 설정:

- Build command: `npm run build`
- Build output directory: `dist`

SPA 라우팅을 위해 `public/_redirects`가 포함되어 있습니다.

배포 절차:

1. GitHub 저장소를 Cloudflare Pages에 연결합니다.
2. Framework preset은 Vite 또는 None으로 두고 build 설정만 위 값으로 지정합니다.
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣습니다.
4. 배포 후 Supabase Auth Redirect URL에 Pages 도메인을 추가합니다.

## MVP에서 제외한 기능

- AI 채점
- Google Sheets 런타임 직접 조회
- 문제 수/난이도 세트 구성
- 고급 차트 라이브러리

## 남은 TODO

- 실제 기준서 전체 데이터 import
- 인증 UX 보강 및 비밀번호 정책 정리
- 통계 시각화 고도화
- 오답노트 필터/검색
- 문제별 세부 복습 히스토리
