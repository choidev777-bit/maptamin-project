# Implementation Plan: Threads 대시보드 운영 컨트롤 추가

**Status**: ⏳ Pending
**Started**: 2026-03-30
**Last Updated**: 2026-03-30
**Estimated Completion**: 2026-03-30

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
대시보드에 빠져 있는 **운영 컨트롤**을 추가합니다:
1. **소재 품질 필터** — 좋아요 N개·조회수 M개 이상만 저장 (소재 페이지에서 조정)
2. **스캔 파이프라인 통합** — 스캔 시 좋아요 필터 → 조회수 수집 → 조회수 필터 → 저장을 하나로
3. **AI 분석 트리거** — 자동 간격 설정 + 수동 즉시 실행 버튼 (소재 페이지)
4. **콘텐츠 생성 트리거** — 자동 간격 설정 + 수동 즉시 실행 버튼 (콘텐츠 페이지)

### 새 스캔 파이프라인
```
200개 스크롤 수집 (좋아요/리포스트 포함)
    ↓
좋아요 N개 미만 제거
    ↓
남은 글의 개별 페이지 방문 → 조회수 수집 (⏱️ ~3분)
    ↓
조회수 M개 미만 제거
    ↓
최종 통과한 글만 DB 저장
```

### Success Criteria
- [ ] 소재 페이지에서 `최소 좋아요`, `최소 조회수` 값을 변경하고 저장할 수 있다
- [ ] 설정 페이지에서 `분석 간격`, `생성 간격` 값을 변경하고 저장할 수 있다
- [ ] 스캔 시 좋아요·조회수 필터가 적용되어 품질 높은 소재만 저장된다
- [ ] 소재 페이지에서 "AI 분석" 버튼을 누르면 `analyze` 작업이 등록된다
- [ ] 콘텐츠 페이지에서 "콘텐츠 생성" 버튼을 누르면 `generate` 작업이 등록된다
- [ ] Vercel 빌드가 정상 통과한다

### Assumptions
- `min_likes`, `min_views`는 **전역 설정**이다 (계정별이 아님) → `threads_product_config`에 저장
- `analyze_interval_hours`, `generate_interval_hours`도 전역 → `threads_product_config`에 저장
- VPS Cron 등록은 이 계획 범위 밖

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `min_likes`, `min_views` UI를 **소재 페이지**에 배치 | 스캔 버튼 바로 옆에서 확인/조절 가능. 직관적 | 설정과 소재 두 페이지에서 product_config를 수정 |
| DB 저장은 `threads_product_config` 유지 | 계정별이 아닌 전역 설정이므로 적합 | 소재 페이지에서도 이 테이블 read/write 필요 |
| 조회수 수집을 스캔 내부에 통합 | 한 번의 스캔으로 풀 파이프라인 완결 | 스캔 시간 증가 (~5분→8~12분) |
| `get_product_config()`를 `db.py`로 통합 | `generator.py`에 로컬 정의 중복 제거 | generator.py import 변경 필요 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] Supabase SQL Editor에서 `threads_product_config`에 4개 컬럼 추가 (Phase 1에서 SQL 제공)

### External Dependencies
- 없음 (기존 패키지만 사용)

---

## 🚀 Implementation Phases

---

### Phase 1: DB + 설정 페이지 — 새 필드 추가
**Goal**: DB에 4개 컬럼 추가 + 설정 페이지에서 분석/생성 간격 설정 가능
**Estimated Time**: 45분
**Status**: ⏳ Pending

#### 선행 작업: DB 컬럼 추가

Supabase SQL Editor에서 실행할 SQL:

```sql
ALTER TABLE threads_product_config
  ADD COLUMN IF NOT EXISTS min_likes integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS min_views integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS analyze_interval_hours integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS generate_interval_hours integer DEFAULT 12;
```

#### Tasks

- [ ] **Task 1.1**: `threads-dashboard/src/app/(dashboard)/settings/page.tsx` 수정
  - `Prod` 인터페이스에 `analyze_interval_hours`, `generate_interval_hours` 추가
  - "제품 연동" 카드에 2개 입력 필드 추가 (분석 간격, 생성 간격)
  - **변경 범위**: L5 인터페이스 + L88-102 제품 카드 내부
  - **터치하지 않는 것**: 계정 카드, Tags 컴포넌트, 저장 로직 구조

- [ ] **Task 1.2**: `threads-dashboard/src/app/api/settings/route.ts` 수정
  - PUT 핸들러의 `type === "product"` 분기에 4개 필드 모두 추가
  - (`min_likes`, `min_views`는 소재 페이지에서 저장하므로 여기서도 처리 가능해야 함)
  - **변경 범위**: L50-58 update 호출부에 필드 추가
  - **터치하지 않는 것**: GET 핸들러, account 분기

#### Quality Gate ✋

- [ ] `npm run build` 성공 (threads-dashboard 디렉토리)
- [ ] 설정 페이지에서 분석 간격, 생성 간격 필드 표시 및 저장 확인
- [ ] Supabase에서 4개 컬럼 존재 및 기본값 확인

---

### Phase 2: 소재 페이지 — 필터 설정 + AI 분석 컨트롤
**Goal**: 소재 페이지에 `최소 좋아요`/`최소 조회수` 설정란 + "AI 분석" 수동 버튼 + 분석 간격 표시
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `threads-dashboard/src/app/(dashboard)/sources/page.tsx` 수정
  - 마운트 시 `/api/settings`에서 `product` 설정 로드 (min_likes, min_views, analyze_interval_hours)
  - 스캔 버튼 영역에 추가:
    - `최소 좋아요` 숫자 입력란 (기본값: 5)
    - `최소 조회수` 숫자 입력란 (기본값: 1000)
    - "AI 분석" 버튼 (`triggerJob("analyze")`)
    - 분석 간격 텍스트 (예: "8시간마다 자동 분석")
  - 필터값 변경 시 저장 → `PUT /api/settings` (type: "product") 호출
  - **변경 범위**: 헤더/버튼 영역 (L61-67) + state/fetch 추가
  - **터치하지 않는 것**: 필터 드롭다운, 테이블 렌더링, 페이지네이션

- [ ] **Task 2.2**: `threads-dashboard/src/app/api/sources/route.ts` 수정 — **불필요, 변경 없음**
  - sources API는 읽기 전용이므로 수정 불필요. 필터 저장은 settings API 사용

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] 소재 페이지에서 min_likes, min_views 입력란이 표시되고 값 변경·저장됨
- [ ] "AI 분석" 버튼 클릭 → `threads_job_queue`에 `analyze` 작업 등록 확인
- [ ] 분석 간격 텍스트 표시 확인
- [ ] 기존 피드 스캔, 키워드 스캔 버튼 정상 동작

---

### Phase 3: 콘텐츠 페이지 — 콘텐츠 생성 컨트롤 추가
**Goal**: 콘텐츠 페이지에 "콘텐츠 생성" 수동 트리거 버튼 + 생성 간격 표시
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 3.1**: `threads-dashboard/src/app/(dashboard)/contents/page.tsx` 수정
  - `triggerJob` 함수 추가 (sources/page.tsx와 동일 패턴)
  - 마운트 시 `/api/settings`에서 `product.generate_interval_hours` 로드
  - 헤더에 "콘텐츠 생성" 버튼 + 간격 텍스트 추가
  - **변경 범위**: 헤더 영역 (L64-65 부근) + triggerJob 함수 + state/fetch 추가
  - **터치하지 않는 것**: 필터, 카드 목록, 승인/수정/삭제 로직, 페이지네이션

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] "콘텐츠 생성" 버튼 클릭 → `threads_job_queue`에 `generate` 작업 등록 확인
- [ ] 간격 텍스트 표시 확인
- [ ] 기존 콘텐츠 목록, 필터, 승인/삭제 기능 정상 동작

---

### Phase 4: VPS 스캐너 — 통합 파이프라인 구현
**Goal**: 스캔 시 좋아요 필터 → 조회수 수집 → 조회수 필터 → 저장을 하나의 흐름으로 실행
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 4.1**: `vps/threads-api/db.py` 수정
  - `get_product_config()` 함수 추가 (5줄 이내)
  - ⚠️ **주의**: `generator.py` L36-38에 동일 함수가 로컬 정의되어 있음
  - **변경 범위**: `db.py`에 함수 1개 추가
  - **터치하지 않는 것**: 기존 save_sources, check_duplicates 등

- [ ] **Task 4.2**: `vps/threads-api/generator.py` 수정
  - L36-38의 로컬 `get_product_config()` 삭제
  - L20에 `from db import get_product_config` 추가 (기존 import 라인에 합침)
  - **변경 범위**: L20 import + L36-38 삭제 (3줄)
  - **터치하지 않는 것**: 나머지 전체

- [ ] **Task 4.3**: `vps/threads-api/scanner.py` 수정 — 핵심 변경
  - L20 import에 `get_product_config` 추가
  - `scan_feed()` 함수 변경 (L131-159):
    1. 스크롤 수집 (기존 그대로)
    2. **NEW**: `min_likes` 로드 → 좋아요 미달 제거
    3. **NEW**: 남은 글의 개별 페이지 방문 → 조회수 수집 (기존 `scan_views` 로직 재사용)
    4. **NEW**: `min_views` 로드 → 조회수 미달 제거
    5. 중복 확인 → DB 저장
  - `scan_search()` 함수도 동일 적용 (L162-203)
  - **참고**: 브라우저가 `async with` 안에서 이미 열려 있으므로 개별 페이지 방문 가능
  - **변경 범위**: L20 import + scan_feed 저장부 + scan_search 저장부
  - **터치하지 않는 것**: extract_posts_from_page, scroll_and_collect, parse_views_text

#### Quality Gate ✋

- [ ] `python -c "from scanner import *; print('OK')"` 문법 에러 없음
- [ ] `python -c "from generator import *; print('OK')"` 문법 에러 없음 (import 변경 확인)
- [ ] `min_likes=5`, `min_views=1000`일 때 좋아요 4개 소재가 1차 필터링되는지 확인
- [ ] 조회수 800인 소재가 2차 필터링되는지 확인
- [ ] 기존 스캔 명령어 호환 유지 (`--mode feed`, `--mode search`)

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase 컬럼 추가 실패 | Low | High | SQL을 먼저 실행하고 확인 후 코드 수정 시작 |
| Vercel 빌드 실패 | Med | Med | Phase마다 `npm run build` 검증 |
| 스캔 시간 과다 증가 | Med | Low | min_likes를 높이면 조회수 수집 대상이 줄어 시간 단축 |
| 조회수 추출 실패 (DOM 변경) | Med | Med | views 추출 실패 시 해당 글은 저장하지 않되, 에러로 중단하지 않음 |
| `generator.py` import 변경 호환성 | Low | High | Quality Gate에서 import 검증 |

---

## 🔄 Rollback Strategy

### Phase 1 실패 시
- `settings/page.tsx`, `api/settings/route.ts` git revert
- DB 컬럼은 남겨둬도 무해

### Phase 2/3 실패 시
- 각 페이지 파일만 git revert (다른 파일 영향 없음)

### Phase 4 실패 시
- `scanner.py`, `db.py`, `generator.py` git revert

---

## 📊 수정 파일 요약

| # | 파일 | Phase | 변경 내용 |
|---|------|-------|----------|
| 1 | `threads_product_config` (DB) | 1 | 4개 컬럼 추가 (SQL) |
| 2 | `settings/page.tsx` | 1 | 분석 간격, 생성 간격 입력 필드 |
| 3 | `api/settings/route.ts` | 1 | PUT에 4개 필드 추가 |
| 4 | `sources/page.tsx` | 2 | min_likes/min_views 입력란 + AI 분석 버튼 + 간격 표시 |
| 5 | `contents/page.tsx` | 3 | 콘텐츠 생성 버튼 + 간격 표시 |
| 6 | `vps/threads-api/db.py` | 4 | get_product_config() 추가 |
| 7 | `vps/threads-api/generator.py` | 4 | 로컬 get_product_config() 삭제 → db에서 import |
| 8 | `vps/threads-api/scanner.py` | 4 | 통합 파이프라인 (좋아요 필터 → 조회수 수집 → 조회수 필터 → 저장) |

> **Karpathy 원칙 준수**: 각 파일의 변경은 요청된 기능에 직접 해당하는 라인만 수정합니다. 인접 코드의 스타일 변경, 리팩토링, 주석 추가는 하지 않습니다.

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 (DB + 설정) | 45분 | - | - |
| Phase 2 (소재 페이지) | 1시간 | - | - |
| Phase 3 (콘텐츠 페이지) | 30분 | - | - |
| Phase 4 (스캐너 통합) | 1시간 | - | - |
| **Total** | 3시간 15분 | - | - |

---

## 📝 Notes & Learnings

_(구현 후 기록)_

---

**Plan Status**: ⏳ Pending
**Next Action**: 사용자 승인 후 Phase 1 시작 (DB SQL 실행 → 코드 수정)
**Blocked By**: 사용자 승인
