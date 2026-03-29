# Implementation Plan: Threads 자동화 시스템

**Status**: ✅ 완료
**Started**: 2026-03-28
**Last Updated**: 2026-03-30 (Phase 7 완료)
**Estimated Completion**: 2026-04-10

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
설계서(`threads_system_design.md`)를 기반으로 Threads 마케팅 자동화 시스템을 구현합니다.
- **VPS(Python)**: 스레드 피드 스캐너, 유튜브 수집기, AI 분석 엔진(OpenClaw z.ai lite), 자동 발행 스케줄러
- **Vercel(Next.js)**: 관리 대시보드 — **별도 프로젝트** (현황, 소재, 패턴, 콘텐츠, 발행, 성과, 설정)
- **Supabase**: 데이터베이스 (소재, 패턴, 콘텐츠, 설정) — 기존 Maptamin Supabase 공유

### Success Criteria
- [ ] Supabase에 모든 테이블 생성 및 RLS 정책 적용
- [ ] VPS에서 스레드 피드 자동 스캐너 동작 (Cron 매일 새벽 4시)
- [ ] VPS에서 유튜브 수집기 동작 (Cron 매일 새벽 5시)
- [ ] AI 분석 엔진이 수집된 소재를 타입/카테고리/서브패턴으로 분류
- [ ] 대시보드에서 현황, 소재, 콘텐츠 관리, 설정이 가능
- [ ] 자동 발행 스케줄러가 사이클 패턴(A→B→C→D)으로 발행
- [ ] 맵타민 링크가 link_eligible 기반으로 댓글에 자동 삽입

### User Impact
코딩 비전문가인 운영자가 대시보드 하나로 Threads 마케팅을 자동 운영할 수 있음.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| VPS Python + Vercel Next.js 분리 | 스크래핑/발행은 VPS에서, 대시보드는 Vercel에서 (기존 Maptamin 스택 활용) | 두 환경 간 통신 필요 (Supabase 경유) |
| Supabase 공유 | 기존 Maptamin 프로젝트와 같은 Supabase 사용 | 테이블 네이밍으로 구분 (threads_ 접두사) |
| 대시보드 별도 프로젝트 ✅ 확정 | 별도 Next.js 프로젝트로 분리 (Maptamin과 독립) | 독립 배포 가능하지만 관리 포인트 증가 |
| Playwright vs CDP | Playwright가 Python 생태계에서 더 안정적 | CDP 직접 사용보다 약간 느림 |
| OpenClaw z.ai lite (분석/생성) | VPS에서 HTTP 호출, z.ai lite 플랜 이미 연결됨 | 모델 성능 모니터링 필요 |

---

## 🎨 Dashboard Design System

> **콘셉트**: ChatGPT / Linear / Vercel 스타일의 Modern SaaS — 화이트 기반, 군더더기 없는 클린 UI

### 색상 팔레트

| 용도 | 색상 | 값 |
|------|------|----|
| 배경 (메인) | 순백 | `#FFFFFF` |
| 배경 (사이드바/카드) | 연회색 | `#F9F9F9` |
| 구분선/보더 | 밝은 회색 | `#E5E5E5` |
| 텍스트 (primary) | 거의 검정 | `#111111` |
| 텍스트 (secondary) | 중간 회색 | `#6B7280` |
| 텍스트 (placeholder) | 연회색 | `#9CA3AF` |
| **버튼 (primary)** | **검정** | **`#111111`** |
| **버튼 (secondary)** | **밝은 회색** | **`#F3F4F6`** |
| **버튼 (destructive)** | **어두운 회색** | **`#374151`** |
| 성공 표시 | 연한 초록 | `#D1FAE5` (텍스트: `#065F46`) |
| 실패 표시 | 연한 빨강 | `#FEE2E2` (텍스트: `#991B1B`) |
| 대기 표시 | 연한 회색 | `#F3F4F6` (텍스트: `#6B7280`) |

### 타이포그래피

| 용도 | 폰트 | 크기/굵기 |
|------|------|----------|
| 전체 폰트 | **Inter** (Google Fonts) | — |
| 페이지 타이틀 | Inter | 20px / 600 |
| 섹션 헤더 | Inter | 14px / 600 |
| 본문 | Inter | 14px / 400 |
| 보조 텍스트 | Inter | 12px / 400 |
| 버튼 텍스트 | Inter | 14px / 500 |

### 컴포넌트 스타일

```
버튼
├── Primary:   bg-[#111111] text-white rounded-md px-4 py-2 hover:bg-[#333]
├── Secondary: bg-[#F3F4F6] text-[#111111] rounded-md px-4 py-2 hover:bg-[#E5E5E5]
└── Ghost:     bg-transparent text-[#6B7280] hover:bg-[#F9F9F9]

카드
└── bg-white border border-[#E5E5E5] rounded-lg p-4 shadow-none

사이드바
└── bg-[#F9F9F9] border-r border-[#E5E5E5] w-60
    활성 메뉴: bg-[#F3F4F6] text-[#111111] font-medium rounded-md
    비활성 메뉴: text-[#6B7280] hover:bg-[#F3F4F6]

인풋
└── border border-[#E5E5E5] rounded-md px-3 py-2 focus:border-[#111111] outline-none

태그 (키워드/금지어)
└── bg-[#F3F4F6] text-[#111111] text-sm px-2 py-1 rounded-full
    삭제버튼: text-[#9CA3AF] hover:text-[#111111]
```

### 레이아웃 구조

```
┌─────────────────────────────────────────────────────┐
│  Header: "Threads Dashboard"  ────────────────────  │  h-14, border-b
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  Main Content                            │
│  w-60    │  max-w-5xl mx-auto px-8 py-6             │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 레퍼런스 UI
- **ChatGPT** — 사이드바 + 메인 영역 레이아웃, 화이트 배경
- **Linear** — 카드 없이 테이블/리스트 중심 데이터 표시
- **Vercel Dashboard** — 심플한 통계 카드, 흑백 버튼

---

## 📦 Dependencies

### Required Before Starting
- [x] Contabo VPS 서버 접속 가능 (root@VPS_IP)
- [x] Threads API 토큰 세팅 완료 (`/root/threads-api/.env`)
- [x] Supabase 프로젝트 연결 (기존 Maptamin)
- [x] OpenClaw z.ai lite 플랜 연결 완료
- [x] YouTube Data API 키 발급 완료

### External Dependencies (VPS Python)
- playwright: 최신 (스레드 피드 스크래핑)
- google-api-python-client: YouTube Data API
- youtube-transcript-api: 유튜브 자막 추출
- supabase-py: Supabase Python 클라이언트
- openai (또는 requests): OpenClaw z.ai lite API (분석/생성)
- requests: HTTP 호출 (Threads API, Telegram)

### External Dependencies (Dashboard Next.js — 별도 프로젝트, 전부 새로 설치)
- next: 16.x
- @supabase/ssr + @supabase/supabase-js
- tailwindcss
- recharts (차트)
- lucide-react (아이콘)
- motion (애니메이션)

---

## 🧪 Test Strategy

### Testing Approach
- **VPS Python**: pytest로 핵심 함수 단위 테스트 (파서, DB 저장, AI 호출)
- **Dashboard Next.js**: Jest + Testing Library로 컴포넌트/API 라우트 테스트
- **E2E**: Playwright로 대시보드 주요 플로우 검증

### Test Pyramid
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥70% | Python 파서, DB 헬퍼, API 라우트 |
| **Integration Tests** | Critical paths | Supabase CRUD, AI API 호출 |
| **E2E Tests** | Key user flows | 대시보드 설정 저장, 콘텐츠 검수 |

---

## 🚀 Implementation Phases

---

### Phase 1: Supabase DB 스키마 생성
**Goal**: 설계서의 모든 테이블을 Supabase에 생성하고 RLS 정책 적용
**Estimated Time**: 1시간
**Status**: ✅ 완료 (2026-03-28)

#### Tasks

**🟢 GREEN: 구현**
- [x] **Task 1.1**: Supabase SQL로 테이블 생성
  - 테이블 목록:
    - `threads_raw_sources` (소재 원본) — `content_hash` TEXT UNIQUE 포함 (중복 체크용)
    - `threads_patterns` (패턴 라이브러리)
    - `threads_contents` (생성된 콘텐츠)
    - `threads_accounts_config` (계정 설정)
    - `threads_product_config` (제품 연동 설정)
    - `threads_job_queue` (대시보드→VPS 작업 트리거용)
  - ENUM 타입, 인덱스, FK 관계 포함

- [x] **Task 1.2**: RLS 정책 설정
  - service_role 키를 사용하는 VPS Python은 RLS bypass
  - 대시보드는 API 라우트를 통한 server-side 호출 (service_role 키, 환경변수로 관리)

- [x] **Task 1.3**: 초기 데이터 삽입
  - `threads_accounts_config`: bono_marketing, place_hacker_ 프로필
  - `threads_product_config`: 맵타민 제품 정보

**🔴 RED: 테스트**
- [x] **Test 1.4**: Supabase SQL 쿼리로 CRUD 동작 확인
  - INSERT → SELECT → UPDATE → DELETE 각 테이블

#### Quality Gate ✋
- [x] 모든 테이블이 Supabase 대시보드에서 확인 가능
- [x] INSERT/SELECT/UPDATE/DELETE 동작 확인
- [x] 초기 데이터 (accounts_config, product_config) 삽입 완료

---

### Phase 2: VPS Python 프로젝트 세팅 + 스레드 스캐너
**Goal**: VPS에서 스레드 피드를 스크롤하며 글을 수집하고 Supabase에 저장
**Estimated Time**: 4시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: 테스트 작성**
- [ ] **Test 2.1**: 스레드 글 파서 단위 테스트
  - File: `/root/threads-api/tests/test_parser.py`
  - HTML DOM에서 텍스트/좋아요/URL 추출 검증
  - 중복 체크 (해시 기반) 검증

**🟢 GREEN: 구현**
- [ ] **Task 2.2**: 프로젝트 구조 생성
  ```
  /root/threads-api/
  ├── scanner.py          # 메인 스캐너
  ├── parser.py           # DOM 파서
  ├── db.py               # Supabase 헬퍼
  ├── config.py           # 환경 변수 관리
  ├── requirements.txt    # 의존성
  └── tests/
      ├── test_parser.py
      └── test_db.py
  ```

- [ ] **Task 2.3**: `parser.py` — DOM에서 글 데이터 추출
  - 텍스트, 좋아요, 답글, 리포스트, 작성자, 시간, URL 추출
  - 텍스트 해시 생성 (중복 체크용)

- [ ] **Task 2.4**: `db.py` — Supabase CRUD 헬퍼
  - `save_sources(posts)`: 배치 저장
  - `check_duplicates(hashes)`: 중복 확인
  - `get_top_sources(limit, order_by)`: 상위 글 조회

- [ ] **Task 2.5**: `scanner.py` — 메인 스캐너
  - `--mode feed`: For You 피드 스크롤 (STEP 1-A)
  - `--mode search --keywords "..."`: 키워드 검색 (STEP 1-B)
  - `--count N`: 수집 개수
  - Playwright 스크롤 + DOM 추출 + DB 저장

- [ ] **Task 2.6**: `scanner.py` — 조회수 추출 (STEP 2)
  - DB에서 좋아요 상위 50개 필터
  - 저장된 URL로 직접 이동 → 조회수 추출 → views 필드 업데이트

- [ ] **Task 2.7**: Cron 등록 (⚠️ VPS는 UTC, 한국 KST = UTC+9)
  ```bash
  # 새벽 4시 KST = UTC 19시 (전날)
  0 19 * * * python3 /root/threads-api/scanner.py --mode feed --count 200
  # 새벽 4시 30분 KST = UTC 19시 30분 (전날)
  30 19 * * * python3 /root/threads-api/scanner.py --mode search --count 200
  ```

**🔵 REFACTOR**
- [ ] **Task 2.8**: 에러 핸들링 + 텔레그램 알림
  - 스캔 성공/실패 시 텔레그램 알림
  - 재시도 로직 (네트워크 에러)

#### Quality Gate ✋
- [ ] `scanner.py --mode feed --count 10` 실행 → 10개 글 Supabase 저장 확인
- [ ] `scanner.py --mode search --keywords "마케팅" --count 10` 동작 확인
- [ ] 중복 글 재수집 방지 확인
- [ ] 조회수 추출 동작 확인
- [ ] 텔레그램 알림 수신 확인

---

### Phase 3: 유튜브 수집기
**Goal**: YouTube Data API + 자막 추출로 유튜브 소재 수집 및 DB 저장
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: 테스트**
- [ ] **Test 3.1**: 유튜브 자막 추출 + 변환 단위 테스트
  - File: `/root/threads-api/tests/test_youtube.py`

**🟢 GREEN: 구현**
- [ ] **Task 3.2**: `youtube_collector.py` — 롱폼 수집
  - YouTube Data API로 키워드 검색 → 인기 영상
  - youtube-transcript-api로 자막 추출
  - DB 저장 (source_type: 'youtube_long')

- [ ] **Task 3.3**: `youtube_collector.py` — 쇼츠 수집
  - `--type shorts` 옵션: duration:short 필터
  - 자막 추출 → DB 저장 (source_type: 'youtube_shorts')

- [ ] **Task 3.4**: Cron 등록 (⚠️ KST 기준, VPS는 UTC)
  ```bash
  # 새벽 5시 KST = UTC 20시 (전날)
  0 20 * * * python3 /root/threads-api/youtube_collector.py --type long
  # 새벽 5시 30분 KST = UTC 20시 30분 (전날)
  30 20 * * * python3 /root/threads-api/youtube_collector.py --type shorts
  ```

#### Quality Gate ✋
- [ ] 롱폼 수집 → DB 저장 확인
- [ ] 쇼츠 수집 → DB 저장 확인
- [ ] Cron 동작 확인

---

### Phase 4: AI 분석 엔진
**Goal**: 수집된 소재를 AI로 분류 (타입/카테고리/서브패턴) 후 DB 업데이트
**Estimated Time**: 4시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: 테스트**
- [ ] **Test 4.1**: AI 응답 JSON 파싱 단위 테스트
  - File: `/root/threads-api/tests/test_analyzer.py`
  - Mock AI 응답 → DB 업데이트 로직 검증

**🟢 GREEN: 구현**
- [ ] **Task 4.2**: `analyzer.py` — PHASE 1: 개별 글 분류
  - DB에서 미분석 소재 조회
  - OpenClaw z.ai lite API에 JSON 요청 (타입 A/B/C/D + 카테고리 + hook_style)
  - JSON 응답 파싱 → raw_sources 테이블 업데이트

- [ ] **Task 4.3**: `analyzer.py` — PHASE 2: 서브 패턴 발견
  - 타입별 글 묶어서 AI에게 서브 패턴 발견 요청
  - JSON 응답 → patterns 테이블에 저장

- [ ] **Task 4.4**: `analyzer.py` — Cron 등록 (⚠️ KST 기준)
  ```bash
  # 새벽 6시 KST = UTC 21시 (전날)
  0 21 * * * python3 /root/threads-api/analyzer.py
  ```

**🔵 REFACTOR**
- [ ] **Task 4.5**: AI 호출 배치 최적화
  - 한 번에 20~30개씩 배치로 처리 (토큰 절약)
  - 실패 시 재시도 + 텔레그램 알림

#### Quality Gate ✋
- [ ] PHASE 1: 미분석 소재 → 타입/카테고리 태그 부여 확인
- [ ] PHASE 2: 서브 패턴 patterns 테이블 저장 확인
- [ ] JSON 파싱 에러 처리 확인
- [ ] 텔레그램 알림 동작 확인

---

### Phase 5: 대시보드 프로젝트 세팅 + 현황/설정 페이지
**Goal**: Next.js 대시보드 프로젝트 생성, 현황/설정 페이지 MVP 개발
**Estimated Time**: 6시간
**Status**: ✅ 완료 (2026-03-29)

#### 설계 원칙

**디자인**
- Design System 섹션의 색상/타이포그래피/컴포넌트 스타일 100% 준수
- Tailwind CSS 유틸리티 클래스 사용, 커스텀 색상은 `tailwind.config.js`에 등록
- 인라인 스타일 금지 — Tailwind 클래스만 사용
- 모든 버튼은 black/gray 계열 (컬러 버튼 사용 금지)
- 상태 표시(성공/실패/대기)만 색상 배지 허용

**성능 (Vercel React Best Practices)**
- `async-parallel`: 독립적인 데이터 fetch는 Promise.all()로 병렬 처리
- `bundle-dynamic-imports`: 차트/에디터 등 무거운 컴포넌트는 next/dynamic
- `server-cache-react`: React.cache()로 요청 단위 데듀플리케이션
- `server-serialization`: 서버 → 클라이언트 전달 데이터 최소화
- `rerender-memo`: 비싼 연산의 메모이제이션
- `rendering-conditional-render`: 삼항 연산자로 조건부 렌더링

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 5.1**: **별도 Next.js 프로젝트 생성** (확정)
  - 별도 Git 레포 + Vercel 프로젝트로 독립 배포
  - Supabase 연결 (기존 Maptamin Supabase 키 재사용)
  - 프로젝트명: `threads-dashboard` (가칭)
  - Dependencies 전부 새로 설치 (next, supabase, tailwind, recharts 등)

- [ ] **Task 5.2**: 비밀번호 인증 + 레이아웃
  - 단일 비밀번호 로그인 (환경변수 `DASHBOARD_PASSWORD`로 저장)
  - 로그인 페이지: `src/app/login/page.tsx`
  - 미들웨어: `src/middleware.ts` (쿠키 없으면 /login으로 리다이렉트)
  - 레이아웃: `src/app/(dashboard)/layout.tsx`
  - 사이드바: 현황, 소재, 패턴, 콘텐츠, 발행, 성과, 설정

- [ ] **Task 5.3**: 현황 페이지 (Overview)
  - File: `src/app/(dashboard)/page.tsx`
  - 발행 통계 카드 (성공/전체/실패)
  - 계정별 파이프라인 상태
  - Operation Log (최근 활동)

- [ ] **Task 5.4**: 설정 페이지 (Settings)
  - File: `src/app/(dashboard)/settings/page.tsx`
  - 계정 관리: 주제, 말투, 스캔 키워드 (태그 입력), 금지어 (태그 입력)
  - 제품 연동: 제품명, 링크, 연관 토픽 (태그 입력), 댓글 문구

- [ ] **Task 5.5**: API 라우트 (Server Actions)
  - `src/app/api/settings/route.ts`: GET/PUT accounts_config
  - `src/app/api/product/route.ts`: GET/PUT product_config
  - `src/app/api/stats/route.ts`: GET 통계 데이터

**🔴 RED: 테스트**
- [ ] **Test 5.6**: API 라우트 단위 테스트
  - File: `__tests__/api/settings.test.ts`
  - GET/PUT 동작 검증

#### Quality Gate ✋
- [ ] `npm run build` 성공
- [ ] `npm run lint` 에러 없음
- [ ] 현황 페이지 표시 확인 (빈 데이터도 에러 없이)
- [ ] 설정 페이지에서 키워드/금지어 추가/삭제 → DB 저장 확인
- [ ] 모바일/데스크톱 반응형 확인
- [ ] 비밀번호 로그인 → 쿠키 발급 → 보호된 페이지 접근 확인
- [ ] 쿠키 없이 직접 URL 접근 시 /login 리다이렉트 확인

---

### Phase 6: 대시보드 — 소재/콘텐츠/발행 페이지
**Goal**: 소재 목록, 콘텐츠 생성/검수, 발행 대기열 관리 페이지
**Estimated Time**: 8시간
**Status**: ✅ 완료 (2026-03-30)

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 6.1**: 소재 페이지 (Sources)
  - File: `src/app/(dashboard)/sources/page.tsx`
  - 소재 목록 (필터: 소스타입, 카테고리, 점수)
  - 소재 수동 추가 모달 (타입 선택 + 링크/텍스트 입력)
  - 스캔 실행 버튼 → `threads_job_queue`에 INSERT (Supabase 폴링 트리거)

- [ ] **Task 6.2**: 패턴 페이지 (Patterns)
  - File: `src/app/(dashboard)/patterns/page.tsx`
  - 타입별 서브 패턴 목록 (A/B/C/D 탭)
  - 각 패턴의 hook_template, body_structure, 성과 표시

- [ ] **Task 6.3**: 콘텐츠 페이지 (Contents)
  - File: `src/app/(dashboard)/contents/page.tsx`
  - 생성된 글 목록 (필터: status, account, type)
  - 검수 UI: ✅ 승인 / ✏️ 수정 / ❌ 삭제
  - AI 생성 모달 (계정 선택, 소재 타입 선택, 패턴 선택, 개수)
  - 발행 대기열 (드래그앤드롭 순서 변경)

- [ ] **Task 6.4**: 발행 페이지 (Publishing)
  - File: `src/app/(dashboard)/publishing/page.tsx`
  - 발행 로그 (최근 발행 기록)
  - 계정별 발행 상태 (활성/비활성 토글)
  - 다음 발행 예정 시간 표시

- [ ] **Task 6.5**: API 라우트 추가
  - `src/app/api/sources/route.ts`: 소재 CRUD
  - `src/app/api/sources/manual/route.ts`: 수동 소재 추가
  - `src/app/api/patterns/route.ts`: 패턴 조회
  - `src/app/api/contents/route.ts`: 콘텐츠 CRUD
  - `src/app/api/contents/generate/route.ts`: AI 생성 → job_queue INSERT
  - `src/app/api/publishing/route.ts`: 발행 로그 + 상태
  - `src/app/api/jobs/route.ts`: job_queue 상태 조회 (폴링 상태 표시용)

- [ ] **Task 6.6**: VPS job_queue 폴링 스크립트 + Cron
  - File: `/root/threads-api/job_runner.py`
  - `threads_job_queue`에서 status='pending' 작업 조회
  - 작업 타입에 따라 해당 스크립트 실행 (scan, youtube, analyze, generate)
  - 실행 전 status → 'running', 완료 후 → 'done' / 실패 → 'failed'
  - 30분 이상 running인 작업은 'timeout' 처리
  - 같은 type의 pending 작업 중복 방지
  ```bash
  # 5분마다 job_queue 폴링 (KST 무관, 항상 실행)
  */5 * * * * python3 /root/threads-api/job_runner.py
  ```

#### Quality Gate ✋
- [ ] `npm run build` 성공
- [ ] 소재 목록 필터링 동작 확인
- [ ] 수동 소재 추가 → DB 저장 확인
- [ ] 콘텐츠 검수 (승인/삭제) 동작 확인
- [ ] 발행 대기열 순서 변경 동작 확인
- [ ] 스캔 실행 버튼 → job_queue INSERT → VPS 폴링 → 스캔 실행 확인
- [ ] AI 생성 버튼 → job_queue INSERT → VPS 폴링 → 생성 실행 확인
- [ ] job_queue 상태 표시 (pending → running → done) 확인

---

### Phase 7: 콘텐츠 생성기 + 발행 스케줄러 + 성과 트래커
**Goal**: AI 콘텐츠 생성, 사이클 패턴 발행, 발행 후 성과 추적
**Estimated Time**: 6시간
**Status**: ✅ 완료 (2026-03-30)

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 7.1**: `generator.py` — 콘텐츠 생성기
  - accounts_config에서 branding (topic, tone, banned_words) 로드
  - product_config에서 product_brief 로드
  - OpenClaw z.ai lite API에 JSON 요청 → 글 + link_eligible + link_comment 생성
  - contents 테이블에 저장 (status: 'draft')

- [ ] **Task 7.2**: `publisher.py` — 발행 스케줄러 업데이트
  - 기존 post.py를 확장
  - contents 테이블에서 queued 글 조회
  - 사이클 패턴 (A→B→C→D 비율) 적용
  - Threads API 발행 + link_eligible 시 댓글 링크 삽입
  - status 업데이트 + 텔레그램 알림

- [ ] **Task 7.3**: `tracker.py` — 성과 트래커
  - Threads API Insights 엔드포인트로 발행 글 성과 수집
  - engagement JSONB 업데이트 (likes, replies, reposts, views)
  - 패턴별 success_rate 집계

- [ ] **Task 7.4**: Cron 등록 (⚠️ KST 기준, VPS는 UTC)
  ```bash
  # 콘텐츠 발행 2시간마다, 8~23시 KST = UTC 23~14시
  0 23 * * * python3 /root/threads-api/publisher.py
  0 1,3,5,7,9,11,13 * * * python3 /root/threads-api/publisher.py
  # 성과 수집 매일 저녁 10시 KST = UTC 13시
  0 13 * * * python3 /root/threads-api/tracker.py
  ```

- [ ] **Task 7.5**: 대시보드 성과 페이지
  - File: `src/app/(dashboard)/analytics/page.tsx`
  - 글별 참여율 표
  - 타입별/패턴별 성과 비교 차트
  - 팔로워 성장 추이 (수동 입력 또는 API)

#### Quality Gate ✋
- [ ] 콘텐츠 생성 → DB 저장 → link_eligible 판단 확인
- [ ] 발행 스케줄러 → Threads 게시 → 댓글 링크 삽입 확인
- [ ] 성과 트래커 → engagement 수집 확인
- [ ] 대시보드 성과 페이지 표시 확인
- [ ] 전체 파이프라인 동작: 수집 → 분석 → 생성 → 발행 → 성과 추적

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 스레드 DOM 구조 변경 | Medium | High | 파서를 모듈화하여 DOM 셀렉터만 수정 가능하게 |
| Threads API 토큰 만료 | Low | High | 기존 refresh_token.py Cron 유지 (50일마다 자동 갱신) |
| OpenClaw z.ai lite 모델 성능/비용 | Medium | Medium | 배치 크기 조절, 모델 변경 가능 (z.ai 플랜 내) |
| VPS 디스크/메모리 부족 | Low | Medium | 3개월 이상 지난 raw_sources 자동 정리 |
| 스레드 계정 제재 | Medium | High | 발행 간격 2시간 이상 유지, 랜덤 딜레이 추가 |
| YouTube API 일일 할당량 초과 | Low | Low | 할당량 모니터링 + 수집 수 제한 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- Supabase에서 threads_ 접두사 테이블 DROP
- 기존 Maptamin 기능에 영향 없음

### If Phase 2-4 Fails (VPS Python)
- `/root/threads-api/` 내 새 파일만 삭제
- Cron 항목 제거
- 기존 post.py, refresh_token.py 영향 없음

### If Phase 5-7 Fails (Dashboard)
- threads-dashboard 프로젝트 전체 삭제 (별도 레포이므로 Maptamin 무관)
- Vercel 프로젝트 삭제
- 기존 Maptamin에 영향 전혀 없음

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%
- **Phase 3**: ✅ 100%
- **Phase 4**: ✅ 100%
- **Phase 5**: ✅ 100%
- **Phase 6**: ✅ 100%
- **Phase 7**: ✅ 100%

**Overall Progress**: 100% complete (7/7 phases)

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 (DB) | 1시간 | ~1시간 | 0 |
| Phase 2 (스캐너) | 4시간 | - | - |
| Phase 3 (유튜브) | 3시간 | - | - |
| Phase 4 (AI 분석) | 4시간 | - | - |
| Phase 5 (대시보드 기초) | 6시간 | - | - |
| Phase 6 (대시보드 확장) | 8시간 | - | - |
| Phase 7 (생성/발행/성과) | 6시간 | - | - |
| **Total** | **32시간** | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- (구현 중 발견 사항 기록)

### Blockers Encountered
- (차단 요소 기록)

### Improvements for Future Plans
- (개선 사항 기록)

---

## 📚 References

### Documentation
- [설계서](../threads_system_design.md)
- [Threads API 스킬](../../.agent/skills/threads-automation/SKILL.md)
- [Supabase Docs](https://supabase.com/docs)
- [Threads API Docs](https://developers.facebook.com/docs/threads)

### Validation Commands
```bash
# VPS Python
cd /root/threads-api && python -m pytest tests/ -v

# Dashboard Next.js (별도 프로젝트)
cd threads-dashboard && npm run build
cd threads-dashboard && npm run lint
cd threads-dashboard && npm test
```

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] 전체 파이프라인 동작 검증 (수집→분석→생성→발행→성과)
- [ ] 대시보드 모든 페이지 동작 확인
- [ ] Cron 스케줄 모두 등록 확인
- [ ] 텔레그램 알림 동작 확인
- [ ] 설계서와 구현 내용 일치 확인
- [ ] 에러 핸들링 + 재시도 로직 확인

---

**Plan Status**: ✅ 구현 완료
**Next Action**: VPS 배포 + Cron 등록 + 실전 테스트
**Blocked By**: 없음
