# AuditNote

AuditNote는 회계감사 기준서와 기출 서술형 문제를 반복 학습하기 위한 모바일 우선 웹 애플리케이션입니다.  
사용자는 제목 또는 문제 지문만 보고 직접 답안을 작성하고, AI 채점과 규칙 기반 보조 채점을 통해 결과를 확인하며, 오답노트와 기록 화면에서 반복 복습할 수 있습니다.

- Live: `https://auditnote.cc`
- Stack: React 18, Vite 5, TypeScript, React Router, Stitches, Supabase
- Deployment: Cloudflare Pages + Supabase

## 1. Project Summary

이 프로젝트는 "기준서를 읽는 것"보다 "기억을 꺼내어 서술하는 연습"에 초점을 맞췄습니다.

핵심 목표는 다음과 같습니다.

- 기준서 조문을 단순 열람하는 대신, 직접 서술형 답안을 작성하게 만들기
- 채점 결과를 점수보다 복습 행동으로 연결하기
- 학습 모드, 기출 모드, 오답 모드, 기록 화면을 하나의 흐름으로 묶기
- 로그인 사용자는 기록을 저장하고, 게스트 사용자는 저장 없이 동일한 콘텐츠를 체험하게 만들기

## 2. Core Features

### 학습 노트

- 기준서 단위 문제를 랜덤, 편별, 선택형 방식으로 학습
- 답안 작성 후 AI 채점
- 결과 화면에서 점수, 판정, 피드백, 오답 등록 여부 확인
- 자동 오답노트 등록 및 수동 오답노트 추가

### 기출 노트

- 편/장/연도 단위로 기출 서술형 문제 탐색
- 단일 문제 풀이와 연도별 묶음 풀이 지원
- 최근 결과를 기준으로 기출 오답 재풀이 가능

### 기록 노트

- 누적 학습 기록 조회
- 최근 풀이와 오답 빈도 확인
- 저장된 학습 기록 삭제 및 초기화

### 인증 및 접근 방식

- 이메일 회원가입 / 로그인 / 로그아웃
- 보호 라우트 및 관리자 전용 화면
- 첫 로그인 화면에서 `로그인 없이 접속` 지원
- 게스트 모드는 실제 Supabase 콘텐츠를 읽되, 사용자 기록은 저장하지 않음

### 운영 기능

- 문제 오류 신고 수집
- 관리자 화면에서 신고 내역 검토
- 기출 검토 상태 저장

## 3. User Flow

### 로그인 사용자

1. 로그인
2. 학습 노트 또는 기출 노트 진입
3. 답안 작성 및 채점
4. 학습 기록, 오답노트, 통계 저장

### 게스트 사용자

1. 로그인 화면에서 `로그인 없이 접속`
2. 실제 기준서 / 기출 데이터 열람 및 풀이
3. 채점 결과와 흐름은 동일하게 체험
4. 기록, 오답노트, 신고, 개인정보는 저장하지 않음

## 4. Technical Architecture

### Frontend

- React + Vite 기반 SPA
- React Router 기반 라우팅
- Stitches 기반 UI 스타일링
- 페이지 / 상태 로직 / 데이터 접근 모듈을 분리

### Backend / Data

- Supabase Auth: 이메일 인증, 세션 관리
- Supabase Postgres: 기준서, 기출문제, 학습기록, 오답노트, 신고 데이터 저장
- Supabase RLS: 사용자별 데이터 접근 제어

### Deployment

- Cloudflare Pages에 정적 프론트엔드 배포
- Supabase Edge Function 또는 Pages Function을 통한 AI 채점 API 호출

## 5. Grading Strategy

답안 채점은 단일 규칙이 아니라 다단계 전략으로 구성했습니다.

1. AI 채점 시도
2. 규칙 기반 키워드 / 문장 유사도 분석 보조
3. 실패 시 로컬 규칙 기반 fallback

현재 구조의 목적은 다음과 같습니다.

- AI 응답이 불안정해도 학습 흐름을 끊지 않기
- 점수만 주는 대신 누락 개념과 위험 개념을 함께 보여주기
- 운영 환경에 따라 채점 인프라를 유연하게 교체하기

관련 구현:

- [src/lib/aiGrading.ts](src/lib/aiGrading.ts)
- [src/lib/scoring.ts](src/lib/scoring.ts)
- [functions/api/grade.ts](functions/api/grade.ts)
- [supabase/functions/grade/index.ts](supabase/functions/grade/index.ts)

## 6. Guest Mode and Data Policy

포트폴리오 제출을 위해 게스트 모드를 별도로 두었습니다.

게스트 모드 정책:

- `standards`, `exam_questions`는 익명 사용자도 읽기 가능
- 학습 기록, 기출 기록, 오답노트, 신고, 개인정보는 저장하지 않음
- 로그인 사용자만 자신의 기록을 저장하고 수정 가능

이 정책은 "심사자가 로그인 없이 전체 제품 흐름을 확인할 수 있어야 한다"는 제출 목적을 반영한 것입니다.

관련 구현:

- [src/lib/auth.tsx](src/lib/auth.tsx)
- [src/lib/attempts.ts](src/lib/attempts.ts)
- [src/lib/examAttempts.ts](src/lib/examAttempts.ts)
- [supabase/schema.sql](supabase/schema.sql)

## 7. Repository Structure

```text
.
├── src
│   ├── components        # 공통 UI 및 학습/채점 컴포넌트
│   ├── pages             # 라우트 단위 페이지
│   ├── lib               # 인증, 데이터 접근, 채점, 로컬 저장, 도메인 로직
│   ├── data              # 샘플 기준서 데이터
│   └── styles            # 전역 스타일 및 Stitches 설정
├── functions/api         # Cloudflare Pages Functions
├── supabase
│   ├── functions         # Supabase Edge Functions
│   ├── migrations        # DB 마이그레이션
│   └── schema.sql        # 전체 스키마 및 RLS 기준 문서
├── data                  # 기준서 / 기출 원본 TSV
└── scripts               # 기준서 / 기출 import 및 점검 스크립트
```

핵심 파일:

- [src/App.tsx](src/App.tsx): 전체 라우팅 정의
- [src/lib/auth.tsx](src/lib/auth.tsx): 인증 컨텍스트 및 게스트 모드
- [src/lib/standards.ts](src/lib/standards.ts): 기준서 조회 및 fallback
- [src/lib/examQuestions.ts](src/lib/examQuestions.ts): 기출 데이터 조회 및 fallback
- [src/components/SessionPlayer.tsx](src/components/SessionPlayer.tsx): 기준서 학습 플레이어
- [src/components/ExamSessionPlayer.tsx](src/components/ExamSessionPlayer.tsx): 기출 풀이 플레이어
- [src/pages/RecordsPage.tsx](src/pages/RecordsPage.tsx): 기록/통계 화면

## 8. Local Development

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 9. Environment Variables

`.env.example`를 기준으로 `.env`를 구성합니다.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_PUBLIC_SITE_URL=https://auditnote.cc
```

- `VITE_SUPABASE_URL`: 브라우저 앱에서 사용하는 Supabase URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: 브라우저 앱에서 사용하는 Supabase publishable key
- `VITE_PUBLIC_SITE_URL`: 운영 기준 도메인

기준서 / 기출 import 스크립트 실행 시에는 아래 값이 추가로 필요합니다.

```env
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저 번들에 포함되면 안 되며, 로컬 스크립트나 CI 환경에서만 사용합니다.

## 10. Supabase Setup

1. Supabase 프로젝트 생성
2. [supabase/schema.sql](supabase/schema.sql) 실행 또는 `supabase db push`
3. Authentication의 Email provider 활성화
4. Site URL을 `https://auditnote.cc`로 설정
5. Redirect URL에 아래 경로 추가

```text
https://auditnote.cc/auth/callback
```

운영 환경에서 `www.auditnote.cc` 또는 Pages preview URL을 함께 노출하더라도, 앱은 `VITE_PUBLIC_SITE_URL` 기준 도메인으로 정규화한 뒤 인증을 진행합니다.

## 11. Data Operations

### 기준서 데이터

- Google Sheets를 기준서 마스터 원본으로 사용
- TSV로 내린 뒤 `data/standards.tsv`에 반영
- `id` 기준 upsert
- 삭제 대신 `is_active=false` 사용

검증:

```bash
npm run import:standards data/standards.tsv -- --dry-run
```

실제 반영:

```bash
npm run import:standards data/standards.tsv
```

### 기출 데이터

```bash
npm run import:exams
npm run audit:exams
npm run reconcile:exams
npm run backup:exams
```

## 12. Fallback Behavior

이 프로젝트는 운영 장애가 생겨도 학습 흐름이 완전히 끊기지 않도록 fallback을 두었습니다.

- Supabase 미설정 시 샘플 기준서 + 로컬 저장 모드
- 기준서 / 기출 조회 실패 시 내장 샘플 또는 로컬 TSV 데이터 사용
- AI 채점 실패 시 규칙 기반 채점 fallback
- 게스트 모드에서는 저장 호출 자체를 차단

이 설계는 포트폴리오 제출 환경에서도 앱이 최소 기능을 유지하게 만들기 위한 선택입니다.

## 13. Deployment

Cloudflare Pages 기준 설정:

- Build command: `npm run build`
- Output directory: `dist`

SPA 라우팅을 위해 [public/_redirects](public/_redirects)를 포함합니다.

배포 절차:

1. GitHub 저장소를 Cloudflare Pages에 연결
2. Framework preset은 Vite 또는 None 사용
3. 환경변수 설정
4. Supabase Auth Site URL / Redirect URL 동기화

필수 환경변수:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_SITE_URL=https://auditnote.cc`

## 14. What I Focused On

이 레포에서 중점적으로 보여주고 싶은 부분은 다음과 같습니다.

- 단순 CRUD가 아니라 학습 흐름 중심으로 기능을 설계한 점
- 게스트 체험과 로그인 저장 모드를 분리한 접근 제어 설계
- AI 채점 실패를 고려한 fallback 전략
- Supabase RLS와 프론트엔드 상태 흐름을 함께 설계한 점
- 모바일 우선 사용성을 기준으로 페이지 구조를 구성한 점

## 15. Limitations and Next Steps

현재 한계:

- 번들 크기가 큰 편이며 코드 스플리팅 여지가 있음
- 관리자용 운영 도구는 최소 범위로 구성됨
- 문제 편집 UI보다 데이터 import 스크립트 중심으로 운영됨

다음 개선 항목:

- 코드 스플리팅 및 성능 최적화
- 기록 화면 필터 / 검색 보강
- 관리자용 데이터 운영 UI 확장
- 학습 결과 시각화 고도화
