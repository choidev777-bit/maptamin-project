# Implementation Plan: 링크 댓글 빈도 제어 (link_every_n)

**Status**: ⏳ Pending
**Started**: 2026-03-31
**Last Updated**: 2026-03-31
**Estimated Completion**: 2026-03-31

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
현재 `generator.py`의 AI 프롬프트에서 `link_eligible`을 AI가 매번 자율 판단하고 있음.
이로 인해 연속으로 링크 댓글이 달리거나, 비율 예측이 불가능한 상태.

**link_every_n** 설정을 도입하여, "N개 글 중 1개에만 링크를 달겠다"는 비율을 사람이 직접 제어할 수 있게 한다.

### 핵심 변경 원리
AI의 자율 판단을 제거하고, generator가 "마지막 link_eligible=true 이후 생성된 글 수"를 카운트하여:
- 카운트 < N-1 → 프롬프트에 "link_eligible=false, 제품 언급 금지" 명시
- 카운트 >= N-1 → 프롬프트에 "link_eligible=true, 제품 연결해서 작성" 명시

### Success Criteria
- [ ] Settings 대시보드에서 `link_every_n` 값을 조회/수정/저장할 수 있다
- [ ] generator.py가 계정별로 링크 빈도를 카운트하여 N번째 글에만 `link_eligible=true` 프롬프트를 보낸다
- [ ] `link_every_n` 설정이 없거나 NULL일 때 기본값 3으로 폴백한다
- [ ] 기존 topic_tag 기능, 소재 수집/분석/발행 흐름에 영향을 주지 않는다

### User Impact
마케터가 "몇 개 글마다 제품 링크를 넣을지" 대시보드에서 직접 설정 가능. 스팸 느낌 방지 + 예측 가능한 마케팅.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `link_every_n`을 `threads_product_config`에 저장 | 링크는 제품 홍보 설정이므로 product_config가 의미상 맞음. 현재 `link_comment_templates`도 여기에 있음 (settings/route.ts:57) | 계정별 다른 빈도 설정 불가 (현재 product_config는 전역 1행) |
| 카운트 기준: `threads_contents` 테이블의 생성 순서 | 이미 `generator.py`가 생성할 때마다 `save_content()`로 이 테이블에 삽입함 (generator.py:259). 새 테이블/컬럼 불필요 | published가 아닌 draft/deleted 상태 글도 카운트에 포함됨 — 허용 가능 |
| 프롬프트를 분기하여 AI 자율 판단 제거 | 현재 프롬프트 규칙 5번 "link_eligible은 글의 주제가 제품과 자연스럽게 연결될 때만 true" (generator.py:167)를 조건부로 교체 | AI의 맥락적 판단 완전 제거 — 대신 사람이 비율로 통제 |
| 한 번에 여러 개 생성 시 로컬 카운터 사용 | `--count 5`로 호출 시 for 루프(generator.py:234) 내부에서 매번 DB 재조회 대신 로컬 카운터로 효율적 처리 | DB와 미세한 불일치 가능성 — 실질적 문제 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] Supabase 대시보드 접근 가능 (DB 마이그레이션 실행용)
- [ ] VPS SSH 접근 가능 (`root@46.250.237.24`, generator.py 배포용)

### External Dependencies
- 없음 (새 패키지 추가 없음)

### 선행 작업 참고 (건드리지 않음)
- topic_tag DB 마이그레이션 2건은 이번 작업의 Phase 1에서 함께 실행
  ```sql
  ALTER TABLE threads_product_config ADD COLUMN IF NOT EXISTS topic_tags JSONB DEFAULT '[]';
  ALTER TABLE threads_contents ADD COLUMN IF NOT EXISTS topic_tag TEXT DEFAULT NULL;
  ```

---

## 🔍 엣지케이스 분석

| # | 엣지케이스 | 현재 코드 근거 | 처리 방안 |
|---|----------|-------------|----------|
| 1 | **`link_every_n` 미설정 (NULL)** | `get_product_config()`은 `select("*")`로 전체 가져옴 (db.py:120). 마이그레이션 전 또는 값이 NULL | DB 기본값 `DEFAULT 3` + 코드에서 `(prod_config or {}).get("link_every_n") or 3` 폴백 |
| 2 | **`link_every_n = 1`** | 매 글에 링크 | 모든 글에 `force_link=True` 전달 → 정상 동작 |
| 3 | **`link_every_n = 0` 또는 음수** | Settings UI에서 비정상 입력 | UI `<input min={1}>` 제한 + generator에서 `max(1, val)` 방어 |
| 4 | **product_config 없음** | `get_product_config()` → `None` 반환 가능 (db.py:121). 이미 `build_generation_prompt`에서 `product_config`이 None이면 제품 정보 미포함 (generator.py:129-135) | prod_config이 None이면 link 카운트 로직 스킵, 항상 `force_link=False` |
| 5 | **계정별 독립 카운트** | `generate_for_account(account)`는 계정 단위 호출 (generator.py:220) | 카운트 쿼리에 `.eq("account", account)` 필터 |
| 6 | **한 번에 여러 개 생성 (for 루프)** | `for i in range(count):` 루프 (generator.py:234)에서 `save_content()` 후 다음 반복 | 초기 DB 카운트 조회 후, `save_content()` 성공 시 로컬 카운터 증가. link 글이 생성되면 카운터 리셋 |
| 7 | **`generate_all()`의 타입별 반복** | ABCD 각각에 대해 `generate_for_account(acc, ct, count)` 호출 (generator.py:298-299) | 타입별로 별도 `generate_for_account` 호출이므로, 각 호출마다 DB에서 카운트 재조회. 타입 무관 통합 카운트 |
| 8 | **콘텐츠 삭제 후 카운트 변동** | 대시보드에서 draft 삭제 가능 (contents/page.tsx:179) | 삭제되면 카운트 줄어들어 다음 링크가 앞당겨짐 — 허용 가능한 수준 |
| 9 | **link_every_n 변경 직후** | 사용자가 3→5로 변경 | "마지막 link_eligible=true 이후 생성 수" 방식이므로 자연스럽게 적응. 별도 리셋 불필요 |
| 10 | **첫 글 (이전 link 이력 없음)** | 계정에 아직 콘텐츠가 하나도 없는 초기 상태 | 이전 link 이력 없으면 `since_last_link = 전체 콘텐츠 수`로 시작. 전체 수 ≥ N-1이면 첫 글부터 link, 아니면 N번째에 link |

---

## 🚀 Implementation Phases

### Phase 1: DB 마이그레이션 + Settings API
**Goal**: `link_every_n` 컬럼이 DB에 존재하고, API로 읽기/쓰기가 되는 상태
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 1.1**: Supabase SQL Editor에서 마이그레이션 실행
  ```sql
  -- link_every_n 컬럼 추가
  ALTER TABLE threads_product_config ADD COLUMN IF NOT EXISTS link_every_n INTEGER DEFAULT 3;

  -- 함께 실행할 미뤄진 topic_tag 마이그레이션
  ALTER TABLE threads_product_config ADD COLUMN IF NOT EXISTS topic_tags JSONB DEFAULT '[]';
  ALTER TABLE threads_contents ADD COLUMN IF NOT EXISTS topic_tag TEXT DEFAULT NULL;
  ```

- [ ] **Task 1.2**: Settings API에 `link_every_n` 저장 추가
  - File: `threads-dashboard/src/app/api/settings/route.ts`
  - 수정 위치: PUT 핸들러의 product update 객체 (route.ts:51-67)
  - 변경: `topic_tags: data.topic_tags,` 아래에 `link_every_n: data.link_every_n,` 추가
  - 기존 `select("*")`로 GET하므로 (route.ts:10-14) 읽기는 자동으로 포함됨

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**검증**:
- [ ] Supabase에서 `SELECT link_every_n FROM threads_product_config LIMIT 1;` → 3 반환
- [ ] `GET /api/settings` 응답에 `product.link_every_n: 3` 포함 확인
- [ ] `PUT /api/settings` body에 `link_every_n: 5` 전달 → DB에서 5로 변경 확인
- [ ] 기존 settings 기능(계정 설정, 제품명/링크 등) 깨지지 않음 확인

**Validation Commands**:
```bash
# 대시보드 빌드 확인
cd threads-dashboard && npx next build
```

---

### Phase 2: Settings 대시보드 UI
**Goal**: 대시보드에서 `link_every_n` 값을 보고 수정하고 저장할 수 있는 상태
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 2.1**: `Prod` 인터페이스에 `link_every_n` 추가
  - File: `threads-dashboard/src/app/(dashboard)/settings/page.tsx`
  - 수정 위치: line 5의 Prod 인터페이스
  - 변경: `topic_tags: string[];` 뒤에 `link_every_n: number;` 추가

- [ ] **Task 2.2**: 제품 연동 카드에 UI 입력 필드 추가
  - File: `threads-dashboard/src/app/(dashboard)/settings/page.tsx`
  - 수정 위치: `link_comment_templates` Tags 컴포넌트 아래 (line 98), `topic_tags` Tags 컴포넌트 위
  - 추가할 UI:
    ```
    라벨: "링크 댓글 빈도"
    설명 텍스트: "N개 글 중 1개에 제품 링크 댓글을 삽입합니다"
    <input type="number" min={1} max={100} value={prod.link_every_n} />
    단위 텍스트: "개 중 1개"
    ```
  - 변경 핸들러: `setProd({ ...prod, link_every_n: Math.max(1, parseInt(e.target.value) || 3) })`
    → 엣지케이스 3 방어 (0, 음수, NaN 모두 기본값 3으로 폴백)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**Manual Test Checklist**:
- [ ] Settings 페이지 로드 시 제품 연동 카드에 "링크 댓글 빈도" 필드 표시
- [ ] 기본값 3이 표시됨
- [ ] 값을 5로 변경 후 저장 → 새로고침 → 5가 유지됨
- [ ] 값을 0으로 입력 → 1로 자동 교정됨
- [ ] 빈 문자열 입력 → 3(기본값)으로 폴백
- [ ] 기존 필드(제품명, 링크, 댓글 템플릿, topic_tags) 저장이 깨지지 않음

**Validation Commands**:
```bash
cd threads-dashboard && npx next build
```

---

### Phase 3: generator.py 백엔드 로직
**Goal**: generator가 계정별 link 빈도를 카운트하여 N번째 글에만 link 프롬프트를 보내는 상태
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 3.1**: 링크 카운트 함수 추가
  - File: `vps/threads-api/generator.py`
  - 위치: `get_content_source()` 함수(line 32-46) 아래에 새 함수 추가
  - 함수 시그니처: `def get_since_last_link(account: str) -> int`
  - 로직:
    1. `threads_contents` 테이블에서 해당 account의 가장 최근 `link_eligible=True`인 행의 `created_at`을 조회
    2. 그 `created_at` 이후에 생성된 행 수를 카운트
    3. 이전 link 이력이 없으면 전체 행 수 반환 (엣지케이스 10)
  - 쿼리 설계:
    ```python
    # Step 1: 마지막 link=true인 콘텐츠 찾기
    last_link = supabase.table("threads_contents")
        .select("created_at")
        .eq("account", account)
        .eq("link_eligible", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()

    # Step 2: 그 이후 생성된 콘텐츠 수
    if last_link.data:
        count = supabase.table("threads_contents")
            .select("id", count="exact")
            .eq("account", account)
            .gt("created_at", last_link.data[0]["created_at"])
            .execute()
        return count.count or 0
    else:
        # 이전 link 이력 없음 → 전체 콘텐츠 수
        count = supabase.table("threads_contents")
            .select("id", count="exact")
            .eq("account", account)
            .execute()
        return count.count or 0
    ```

- [ ] **Task 3.2**: `build_generation_prompt`에 `force_link` 파라미터 추가
  - File: `vps/threads-api/generator.py`
  - 수정 위치: 함수 시그니처 (line 88-94)
  - 변경:
    ```python
    def build_generation_prompt(
        account_config: dict,
        product_config: dict | None,
        content_type: str,
        content_source: dict | None,
        patterns: list[dict],
        force_link: bool = False,  # ← 추가
    ) -> str:
    ```
  - 제품 정보 블록 수정 (line 129-135):
    ```python
    # 기존: product_config이 있으면 항상 제품 정보 포함
    # 변경: force_link일 때만 제품 정보 포함
    product_text = ""
    if product_config and force_link:
        product_text = f"\n\n제품 정보 (댓글에 자연스럽게 언급):\n" \
                       f"이름: {product_config.get('product_name', '')}\n" \
                       f"설명: {product_config.get('product_description', '')}\n" \
                       f"링크: {product_config.get('product_link', '')}\n" \
                       f"댓글 템플릿: {', '.join(product_config.get('link_comment_templates', []))}"
    ```
  - 프롬프트 규칙 5~6번 교체 (line 167-168):
    ```python
    # 기존:
    # 5. link_eligible은 글의 주제가 제품과 자연스럽게 연결될 때만 true로 설정하세요.
    # 6. link_comment는 link_eligible=true일 때만 작성하세요. 자연스럽고 짧게.

    # 변경:
    if force_link:
        link_rules = "5. 이 글은 반드시 link_eligible=true로 설정하세요.\n6. link_comment를 반드시 작성하세요. 자연스럽고 짧게."
    else:
        link_rules = "5. 이 글은 반드시 link_eligible=false로 설정하세요.\n6. link_comment는 null로 설정하세요. 제품을 직접 언급하지 마세요."
    ```

- [ ] **Task 3.3**: `generate_for_account` 함수에 링크 빈도 로직 통합
  - File: `vps/threads-api/generator.py`
  - 수정 위치: line 220-280
  - 변경 핵심:
    ```python
    def generate_for_account(account: str, content_type: str | None, count: int = 3):
        acc_config = get_account_config(account)
        # ... 기존 검증 로직 유지 ...
        prod_config = get_product_config()

        # ── 링크 빈도 계산 ──
        link_every_n = max(1, (prod_config or {}).get("link_every_n") or 3)
        since_last_link = get_since_last_link(account)  # DB 조회 (1회)

        for i in range(count):
            ct = content_type if content_type else get_next_cycle_type(account)
            content_source = get_content_source()

            # 링크 차례 판단
            force_link = (since_last_link >= link_every_n - 1) and (prod_config is not None)

            patterns = get_patterns(ct)
            prompt = build_generation_prompt(
                acc_config, prod_config, ct, content_source, patterns, force_link
            )

            # ... AI 호출 + 파싱 (기존 로직 유지) ...

            # link_eligible을 force_link 값으로 덮어쓰기 (AI 판단 무시)
            result["link_eligible"] = force_link
            if not force_link:
                result["link_comment"] = None

            # DB 저장 (기존 로직 유지)
            save_content({...})

            # 로컬 카운터 업데이트
            if force_link:
                since_last_link = 0  # 리셋
            else:
                since_last_link += 1

            # ... 소재 삭제 등 기존 로직 유지 ...
    ```

- [ ] **Task 3.4**: VPS에 수정된 generator.py 배포
  ```bash
  scp vps/threads-api/generator.py root@46.250.237.24:/root/threads-api/generator.py
  ```

**🔵 REFACTOR: 정리**
- [ ] **Task 3.5**: 코드 리뷰
  - `force_link` 분기가 깔끔한지 확인
  - 기존 `parse_generation_response`(line 195-215)는 건드리지 않음 — AI가 JSON에 뭘 넣든 Task 3.3에서 `result["link_eligible"] = force_link`로 덮어쓰므로

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed until ALL checks pass**

**Manual Test Checklist**:
- [ ] VPS에서 `python generator.py --account bono --count 1` 실행 → 에러 없이 생성
- [ ] `link_every_n=3` 설정 상태에서:
  - 최근 link_eligible=true 이후 0~1개 생성됨 → 새 글 `link_eligible=False` 확인
  - 최근 link_eligible=true 이후 2개 생성됨 → 새 글 `link_eligible=True` 확인
- [ ] `link_every_n=1` 설정 상태에서 → 모든 글 `link_eligible=True` 확인
- [ ] product_config 없는 상태에서 → 모든 글 `link_eligible=False`, 에러 없음
- [ ] `--count 5`로 생성 시 정확히 N번째마다 link 포함되는지 확인 (로컬 카운터 동작)
- [ ] 대시보드 콘텐츠 페이지에서 생성된 글의 link_eligible 배지 표시 일치 확인

**Validation Commands**:
```bash
# VPS에서 dry-run 테스트
ssh root@46.250.237.24 "cd /root/threads-api && python generator.py --account bono --count 1"

# 대시보드 빌드
cd threads-dashboard && npx next build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| DB 마이그레이션 실패 (컬럼 이미 존재 등) | Low | Low | `IF NOT EXISTS` 사용으로 안전. Supabase SQL Editor에서 즉시 확인 가능 |
| AI가 force_link 프롬프트 무시하고 link_eligible 다르게 반환 | Medium | Low | Task 3.3에서 `result["link_eligible"] = force_link`로 AI 응답을 덮어쓰므로 영향 없음 |
| 기존 발행 파이프라인 깨짐 | Low | High | publisher.py는 수정하지 않음. `link_eligible` / `link_comment` 필드 형식은 동일하게 유지 |
| Settings 저장 시 기존 필드 누락 | Low | High | PUT 핸들러에 `link_every_n` 1줄만 추가. 기존 필드 코드를 건드리지 않음 |
| VPS 배포 시 구문 오류 | Low | Medium | 로컬에서 `python -c "import generator"` 구문 검증 후 배포 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- DB: `ALTER TABLE threads_product_config DROP COLUMN IF EXISTS link_every_n;`
- API: `route.ts`에서 `link_every_n` 줄 삭제

### If Phase 2 Fails
**Steps to revert**:
- `settings/page.tsx`의 `Prod` 인터페이스에서 `link_every_n` 제거
- 추가된 UI 요소 제거
- Phase 1 결과는 유지 (API에 필드가 있어도 UI에서 안 쓰면 무해)

### If Phase 3 Fails
**Steps to revert**:
- VPS에 수정 전 `generator.py` 재배포 (git에서 이전 버전 복원)
- Phase 1, 2 결과는 유지 (DB 컬럼/UI가 있어도 generator가 안 쓰면 무해)
- 각 Phase가 독립적이므로 단계별 롤백 가능

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 0.5 hours | - | - |
| Phase 2 | 0.5 hours | - | - |
| Phase 3 | 1 hour | - | - |
| **Total** | 2 hours | - | - |

---

## 📝 수정 파일 요약

| 파일 | Phase | 수정 내용 | 변경 규모 |
|------|-------|----------|----------|
| Supabase SQL | 1 | `link_every_n` 컬럼 추가 | ALTER 1줄 |
| `threads-dashboard/src/app/api/settings/route.ts` | 1 | PUT에 `link_every_n` 추가 | +1줄 |
| `threads-dashboard/src/app/(dashboard)/settings/page.tsx` | 2 | 인터페이스 + UI 필드 추가 | +10줄 |
| `vps/threads-api/generator.py` | 3 | 카운트 함수 + 프롬프트 분기 + 덮어쓰기 로직 | +40줄, ~10줄 수정 |

**건드리지 않는 파일**: `analyzer.py`, `publisher.py`, `scanner.py`, `db.py`, `config.py`, `contents/page.tsx`, `sources/route.ts`, `library/page.tsx`

---

## 📝 Notes & Learnings

### Implementation Notes
- (작업 진행 시 기록)

### Blockers Encountered
- (작업 진행 시 기록)

---

**Plan Status**: ⏳ Pending
**Next Action**: 사용자 승인 후 Phase 1 시작
**Blocked By**: None
