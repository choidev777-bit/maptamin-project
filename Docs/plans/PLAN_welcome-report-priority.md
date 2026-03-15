# Implementation Plan: 웰컴 리포트 우선 처리 (Welcome Report Priority Dispatch)

**Status**: ✅ Complete
**Started**: 2026-03-16
**Last Updated**: 2026-03-16
**Estimated Completion**: 2026-03-16 (1시간)
**Scope**: Small (2 Phases)

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
Oracle VM 큐에 자동 리포트가 많이 쌓여있을 때, 신규 유저의 웰컴 리포트가 뒤로 밀려 대기하는 문제를 해결한다.
`dispatch_pending_searches` RPC 함수의 `ORDER BY`에 `report_type='welcome'` 우선순위를 추가하여, 웰컴 리포트가 자동 리포트보다 먼저 슬롯에 배정되도록 한다.

### Success Criteria
- [ ] 큐에 웰컴 리포트 + 일반 리포트가 혼재할 때, 웰컴 리포트가 먼저 dispatch 됨
- [ ] 기존 자동 리포트(daily/weekly) 처리에 영향 없음
- [ ] 마이그레이션 파일이 코드베이스에 기록됨 (SQL Editor 수정 + 마이그레이션 파일 둘 다)

### User Impact
신규 유저가 온보딩 직후 웰컴 리포트를 기다리는 시간이 단축됨.
큐가 바쁜 시간대(정각 cron 후)에도 웰컴 리포트는 다음 빈 슬롯에 바로 투입됨.

### Assumptions (명시적으로 표기)
1. 변경 대상은 **DB RPC 함수 1개** (`dispatch_pending_searches`)만 해당
2. `dispatch/route.ts` (API 코드)는 수정하지 않음 — 이미 RPC 결과를 그대로 사용
3. `realtime` 리포트도 웰컴과 같은 우선순위를 줄 필요는 없음 (유저가 직접 실행하며 대기 UI가 있음)

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| ORDER BY에 CASE문 추가 | 가장 간단하고 surgical한 변경. 코드 1줄 수정 | 우선순위 레벨이 많아지면 확장성 제한 (현재는 2단계면 충분) |
| 별도 워커 분리 **안 함** | 서비스 초기 복잡도 과다. 유저 1000명+ 시 재고 | 대규모이면 근본 해결 안됨 (그때 가서 분리) |
| 새 마이그레이션 파일 생성 | 013 파일 직접 수정 시 이미 적용된 환경과 불일치 | 마이그레이션 파일 1개 추가 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `013_dispatch_queue.sql`의 `dispatch_pending_searches` 함수 동작 확인 완료
- [x] `searches.report_type` 컬럼에 `'welcome'` 값 존재 확인 완료

### External Dependencies
- 없음 (순수 SQL 함수 수정)

---

## 🧪 Test Strategy

### Testing Approach
이 기능은 DB RPC 함수 수정이므로, **Supabase SQL Editor에서 직접 검증** + 부하 테스트에서 통합 검증.

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **SQL 단위 테스트** | 우선순위 정렬 검증 | welcome이 먼저 dispatch 되는지 |
| **통합 테스트** | dispatch API 흐름 | API 호출 시 welcome 우선 배정 확인 |
| **수동 테스트** | 실제 큐 동작 | 부하 테스트 시나리오 재현 |

---

## 🚀 Implementation Phases

### Phase 1: DB RPC 함수 수정 + 마이그레이션 파일 생성
**Goal**: `dispatch_pending_searches` 함수에 웰컴 리포트 우선순위 추가
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현** (SQL 함수는 TDD Red 단계 생략 — DB 함수이므로 바로 구현 후 검증)

- [ ] **Task 1.1**: 마이그레이션 파일 생성
  - File: `supabase/migrations/028_welcome_priority_dispatch.sql`
  - 내용:
    ```sql
    -- dispatch_pending_searches 함수의 ORDER BY에 웰컴 우선 적용
    CREATE OR REPLACE FUNCTION dispatch_pending_searches()
    RETURNS TABLE (
        search_id UUID,
        user_id UUID,
        platform TEXT
    ) AS $$
    DECLARE
        max_jobs INTEGER;
        active_count INTEGER;
        available_slots INTEGER;
    BEGIN
        max_jobs := get_max_concurrent_jobs();
        
        SELECT COUNT(*) INTO active_count
        FROM searches
        WHERE status = 'processing';
        
        available_slots := max_jobs - active_count;
        
        IF available_slots <= 0 THEN
            RETURN;
        END IF;
        
        RETURN QUERY
        WITH selected_jobs AS (
            SELECT s.id
            FROM searches s
            WHERE s.status = 'pending'
            ORDER BY 
              CASE WHEN s.report_type = 'welcome' THEN 0 ELSE 1 END ASC,
              s.created_at ASC
            LIMIT available_slots
            FOR UPDATE SKIP LOCKED
        ),
        updated_jobs AS (
            UPDATE searches
            SET status = 'processing',
                updated_at = NOW()
            WHERE id IN (SELECT id FROM selected_jobs)
            RETURNING id, searches.user_id, searches.platform
        )
        SELECT uj.id, uj.user_id, uj.platform
        FROM updated_jobs uj;
    END;
    $$ LANGUAGE plpgsql;
    ```
  - 변경점: **ORDER BY 1줄만 추가** (CASE WHEN)

- [ ] **Task 1.2**: Supabase SQL Editor에서 함수 적용
  - 위 SQL을 Supabase SQL Editor에서 실행
  - 즉시 운영 DB에 반영됨

#### Quality Gate ✋

**⚠️ STOP: Phase 2 진행 전 아래 항목 전부 확인**

**SQL 검증**:
- [ ] Supabase SQL Editor에서 함수가 에러 없이 생성됨
- [ ] 마이그레이션 파일이 `supabase/migrations/` 에 존재

**검증 쿼리** (Supabase SQL Editor):
```sql
-- 함수가 올바르게 생성되었는지 확인
SELECT prosrc FROM pg_proc WHERE proname = 'dispatch_pending_searches';
-- 결과에 'welcome' 키워드 포함 여부 확인
```

**빌드 체크**:
```bash
npm run build
```

---

### Phase 2: 우선순위 동작 검증
**Goal**: 웰컴 리포트가 실제로 일반 리포트보다 먼저 dispatch 되는지 검증
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: 테스트 데이터 삽입 (Supabase SQL Editor)
  ```sql
  -- 일반 리포트 5개 (먼저 생성 = created_at 빠름)
  INSERT INTO searches 
    (user_id, place_id, place_name, place_address, place_lat, place_lng,
     keywords, grid_points, grid_distance, status, platform, report_type)
  SELECT
    '여기에유저ID'::uuid,
    'priority_test_' || i, 'テスト' || i, '서울', 37.5, 127.0,
    ARRAY['test'], '[]'::jsonb, 0.5,
    'pending', 'naver', 'daily'
  FROM generate_series(1, 5) AS i;

  -- 웰컴 리포트 1개 (나중에 생성 = created_at 느림)
  INSERT INTO searches 
    (user_id, place_id, place_name, place_address, place_lat, place_lng,
     keywords, grid_points, grid_distance, status, platform, report_type)
  VALUES (
    '여기에유저ID'::uuid,
    'priority_test_welcome', '웰컴테스트', '서울', 37.5, 127.0,
    ARRAY['test'], '[]'::jsonb, 0.5,
    'pending', 'naver', 'welcome'
  );
  ```

- [ ] **Task 2.2**: dispatch 함수 호출하여 우선순위 확인
  ```sql
  -- dispatch 실행 (결과에서 welcome이 먼저 나오는지 확인)
  SELECT * FROM dispatch_pending_searches();
  ```
  - **성공 기준**: 웰컴 리포트(`priority_test_welcome`)가 결과 맨 첫 행에 위치

- [ ] **Task 2.3**: 테스트 데이터 삭제
  ```sql
  DELETE FROM searches WHERE place_id LIKE 'priority_test_%';
  ```

- [ ] **Task 2.4**: Git 커밋 & GitHub 푸시
  ```bash
  git add .
  git commit -m "feat: 웰컴 리포트 큐 우선순위 추가 (dispatch_pending_searches)"
  git push
  ```

#### Quality Gate ✋

**검증 완료**:
- [ ] dispatch 결과에서 웰컴 리포트가 일반 리포트보다 먼저 배정됨
- [ ] 테스트 데이터 전부 삭제됨
- [ ] 마이그레이션 파일 GitHub에 푸시됨
- [ ] `npm run build` 에러 없음

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ORDER BY 변경으로 기존 처리 순서 혼란 | **Low** | Low | welcome 아닌 것은 모두 ELSE 1로 동일 → created_at ASC로 기존과 똑같음 |
| FOR UPDATE SKIP LOCKED와 CASE 호환 문제 | **Low** | Medium | PostgreSQL 문서에서 ORDER BY + CASE + FOR UPDATE SKIP LOCKED 조합 지원 확인 |
| 마이그레이션 재실행 시 함수 덮어씌워짐 | **Low** | High | `CREATE OR REPLACE`이므로 마지막 마이그레이션(028)이 최종 적용됨 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- Supabase SQL Editor에서 `013_dispatch_queue.sql`의 원본 함수 재실행
- `028_welcome_priority_dispatch.sql` 파일 삭제
- `git checkout -- supabase/migrations/`

### If Phase 2 검증에서 문제 발견 시
- 위와 동일하게 원본 함수 복원
- 원인 분석 후 CASE문 수정하여 재시도

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%

**Overall Progress**: 100% complete ✅

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 30분 | - | - |
| Phase 2 | 30분 | - | - |
| **Total** | 1시간 | - | - |

---

## 📝 Notes & Learnings

### 변경되는 코드 (Surgical Change 목록)

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `supabase/migrations/028_welcome_priority_dispatch.sql` | **새 파일 생성** — dispatch 함수 재정의 |

> **변경 안 하는 파일**: `013_dispatch_queue.sql` (기존 마이그레이션 건드리지 않음), `src/app/api/queue/dispatch/route.ts` (API 코드 변경 불필요)

### Karpathy Guidelines 적용

1. **Simplicity First**: ORDER BY 1줄 추가로 해결. 별도 워커 분리, 큐 시스템 도입 등 과설계 안 함
2. **Surgical Changes**: DB 함수 1개만 수정. API 코드, 다른 SQL 함수 일절 건드리지 않음
3. **Goal-Driven**: 검증 쿼리로 우선순위 동작을 직접 확인하는 구조

---

## 📚 References

### 관련 코드
- [dispatch_pending_searches 원본](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/supabase/migrations/013_dispatch_queue.sql)
- [dispatch API route](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/queue/dispatch/route.ts)

---

## ✅ Final Checklist

- [ ] Phase 1 완료 + Quality Gate 통과
- [ ] Phase 2 검증 완료 + Quality Gate 통과
- [ ] 테스트 데이터 완전 삭제
- [ ] 문서 업데이트 (architecture_data_flow.md §11에 우선순위 언급 추가)
- [ ] Git 커밋 & GitHub 푸시

---

**Plan Status**: ⏳ Pending
**Next Action**: 유저 승인 후 Phase 1 시작
**Blocked By**: None
