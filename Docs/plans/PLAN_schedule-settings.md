# Implementation Plan: 스케줄 설정 페이지

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
대시보드의 자동화 스케줄을 요일+시간 기반으로 세밀하게 제어할 수 있는 전용 설정 페이지를 구축한다.
기존 설정 페이지의 "자동화 설정" 섹션을 제거하고, 새로운 `/schedule` 페이지로 통합 이전한다.

### 대상 작업 5종
| 작업 | job_type | 설명 |
|------|----------|------|
| 피드 스캔 | `scan_feed` | Threads 피드 자동 수집 |
| 키워드 스캔 | `scan_search` | Threads 키워드 검색 수집 |
| AI 분석 | `analyze` | 미분석 소재 자동 분류 |
| 콘텐츠 생성 | `generate` | AI 글 자동 생성 |
| 유튜브 스캔 | `youtube_long` | YouTube 롱폼 자동 수집 |

### 설정 UI 예시
```
피드 스캔
  요일: [✓월] [✓화] [✓수] [✓목] [✓금] [ 토] [ 일]
  시간: [05:00 ×] [15:00 ×] [+ 추가]
```

### Success Criteria
- [ ] `/schedule` 페이지에서 5종 작업의 요일·시간을 설정·저장 가능
- [ ] DB에 스케줄 JSON 저장/로드 정상 작동
- [ ] VPS scheduler.py가 KST 기준으로 스케줄을 읽고, 해당 시간에 job_queue에 등록
- [ ] 기존 설정 페이지에서 자동화 설정 섹션 깔끔히 제거
- [ ] crontab에서 직접 실행 방식 → scheduler 기반으로 전환
- [ ] 유튜브 키워드당 수집 개수도 스케줄 페이지에 포함

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `threads_product_config`에 JSON 컬럼 추가 | 별도 테이블 불필요, 기존 구조 활용 | 스케줄이 복잡해지면 정규화 필요 |
| VPS에 `scheduler.py` 신규 생성 | 스케줄 로직을 한 곳에 집중 | 새 파일 1개 추가 |
| crontab에서 직접 호출 제거 → scheduler 통합 | 대시보드에서 모든 간격 제어 가능 | crontab 수정 필요 |
| KST 기준으로 UI 표시, UTC 변환은 VPS에서 | 사용자에게 직관적 | VPS에서 시간 변환 필요 |

### DB 스키마 변경

`threads_product_config` 테이블에 추가할 컬럼:

```sql
ALTER TABLE threads_product_config
ADD COLUMN IF NOT EXISTS schedule_scan_feed jsonb DEFAULT '{"days":[0,1,2,3,4],"times":["05:00"]}',
ADD COLUMN IF NOT EXISTS schedule_scan_search jsonb DEFAULT '{"days":[],"times":[]}',
ADD COLUMN IF NOT EXISTS schedule_analyze jsonb DEFAULT '{"days":[0,1,2,3,4],"times":["08:00"]}',
ADD COLUMN IF NOT EXISTS schedule_generate jsonb DEFAULT '{"days":[0,1,2,3,4],"times":["12:00"]}',
ADD COLUMN IF NOT EXISTS schedule_youtube jsonb DEFAULT '{"days":[0,1,2,3,4],"times":["05:00"]}';
```

> days: 0=월, 1=화, 2=수, 3=목, 4=금, 5=토, 6=일
> times: KST 기준 "HH:MM" 문자열 배열

---

## 📦 Dependencies

### Required Before Starting
- [ ] Supabase SQL 실행하여 새 컬럼 추가
- [ ] VPS SSH 접근 가능

### External Dependencies
- 없음 (기존 스택 활용)

---

## 🚀 Implementation Phases

### Phase 1: DB 스키마 + API 엔드포인트
**Goal**: 스케줄 데이터를 DB에 저장/로드할 수 있는 백엔드 완성
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: Supabase에 스케줄 컬럼 5개 추가
  - 위 SQL 문 Supabase SQL Editor에서 실행
  - 기존 `youtube_scan_interval_hours`, `youtube_max_results` 컬럼은 유지 (호환성)

- [ ] **Task 1.2**: Settings API에 스케줄 필드 추가
  - File: `threads-dashboard/src/app/api/settings/route.ts`
  - PUT 핸들러의 product update에 `schedule_*` 필드 5개 추가
  - GET은 이미 `select("*")`이므로 변경 불필요

- [ ] **Task 1.3**: 기존 설정 페이지에서 자동화 설정 섹션 제거
  - File: `threads-dashboard/src/app/(dashboard)/settings/page.tsx`
  - "자동화 설정" `<div>` 전체 제거 (100~108행 영역)
  - Prod 인터페이스에서 제거된 필드 정리

#### Quality Gate ✋
- [ ] Vercel 빌드 성공
- [ ] `/api/settings` GET 응답에 `schedule_*` 필드 포함 확인
- [ ] 기존 설정 페이지에 자동화 섹션 없음 확인

---

### Phase 2: 대시보드 스케줄 설정 UI
**Goal**: `/schedule` 페이지에서 5종 작업의 요일·시간 설정 가능
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: 스케줄 페이지 생성
  - File: `threads-dashboard/src/app/(dashboard)/schedule/page.tsx`
  - 5종 작업 각각에 대해:
    - 요일 체크박스 7개 (월~일)
    - 시간 태그 리스트 (추가/삭제)
    - 유튜브 섹션에만 "키워드당 수집 개수" 숫자 입력 추가
  - 저장 버튼 → PUT /api/settings 호출
  - 기존 프로젝트 스타일(bg-card, border, text-xs 등) 일관 유지

- [ ] **Task 2.2**: 시간 입력 컴포넌트
  - `<select>` 기반 시간 선택 (00:00 ~ 23:00, 1시간 단위)
  - "추가" 버튼 → 시간 태그로 표시
  - 태그에 × 버튼으로 삭제
  - 중복 시간 방지

- [ ] **Task 2.3**: 사이드바에 "스케줄" 링크 추가
  - File: `threads-dashboard/src/app/(dashboard)/layout.tsx`
  - NAV 배열에 `{ label: "스케줄", href: "/schedule" }` 추가
  - 위치: "설정" 바로 위

#### Quality Gate ✋
- [ ] `/schedule` 페이지 접근 가능
- [ ] 요일 체크박스 클릭 → 토글 정상
- [ ] 시간 추가/삭제 정상
- [ ] 저장 → DB 반영 확인
- [ ] 유튜브 섹션에 "키워드당 수집 개수" 표시
- [ ] Vercel 빌드 성공

---

### Phase 3: VPS 스케줄러 구현
**Goal**: VPS가 DB 스케줄을 읽고 적시에 작업을 자동 등록
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 3.1**: `scheduler.py` 신규 생성
  - File: `vps/threads-api/scheduler.py`
  - 동작 흐름:
    1. `get_product_config()`로 스케줄 설정 로드
    2. 현재 KST 시간/요일 계산 (`datetime.now(timezone(timedelta(hours=9)))`)
    3. 각 작업별로 `schedule_*`의 `days`에 오늘 요일 포함 && `times`에 현재 시간 매칭 확인
    4. 매칭되면 `threads_job_queue`에 해당 작업 등록
    5. 중복 방지: **pending 또는 running** 상태인 동일 job_type이 이미 있으면 스킵
       - 근거: `jobs/route.ts`는 pending만 체크, `job_runner.py`는 running만 체크하므로 scheduler는 둘 다 체크해야 안전
  - 시간 매칭 로직: cron이 5분마다 실행되므로, 현재 시각이 설정 시간과 **동일한 시(hour)이고 분(minute)이 0~4 사이**일 때 매칭
    - 예: 설정이 "05:00"이고 현재 KST가 05:02 → 매칭 ✅
    - 예: 설정이 "05:00"이고 현재 KST가 05:07 → 매칭 ❌
  - **중복 실행 방지**: cron 지연으로 같은 시간대에 scheduler가 2번 실행될 수 있으므로, job_queue 중복 체크가 핵심 방어선임. pending+running 체크로 충분히 방지 가능

- [ ] **Task 3.2**: `youtube_collector.py` 간격 체크 로직 제거
  - 이전에 추가한 `should_run()` 함수 전체 제거
  - `get_youtube_settings()`에서 `interval_hours` 반환 제거, `max_results`만 반환하도록 단순화
  - **`supabase` 직접 임포트도 함께 제거**: `should_run()`이 사용하던 `supabase`가 유일한 사용처이므로, 제거 후 임포트 라인도 정리
    - 현재 20행: `from db import save_sources, check_duplicates, get_all_account_configs, get_product_config, supabase`
    - 수정 후: `from db import save_sources, check_duplicates, get_all_account_configs, get_product_config`
  - main()에서 `should_run()` 호출 블록 제거

- [ ] **Task 3.3**: crontab 업데이트
  - 제거: `0 19 * * *` (피드 스캔 직접 호출)
  - 제거: `0 * * * *` (유튜브 직접 호출)
  - 추가: `*/5 * * * * cd /root/threads-api && /usr/bin/python3 scheduler.py >> /var/log/threads-scheduler.log 2>&1`
  - 유지: `*/5 * * * *` job_runner.py (기존 그대로)
  - 유지: `0 3 1 * *` refresh_token.py (기존 그대로)

- [ ] **Task 3.4**: VPS에 파일 전송 및 테스트
  - `scp scheduler.py`, `youtube_collector.py` 전송
  - SSH에서 `python3 scheduler.py` 수동 실행하여 로그 확인
  - crontab 업데이트

#### Quality Gate ✋
- [ ] `scheduler.py` 수동 실행 시 에러 없음
- [ ] 스케줄 매칭 시 job_queue에 작업 등록 확인
- [ ] 중복 작업 방지 확인
- [ ] crontab 업데이트 완료
- [ ] 기존 피드 스캔, 유튜브 스캔이 새 스케줄 방식으로 정상 작동

---

### Phase 4: 통합 테스트 및 정리
**Goal**: 전체 흐름 E2E 검증 + 불필요 코드 정리
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 4.1**: E2E 검증
  - 대시보드 `/schedule`에서 피드 스캔을 현재 시간 +5분으로 설정
  - 저장 → DB 확인 → scheduler 실행 → job_queue 확인 → job_runner 실행 → 소재 수집 확인

- [ ] **Task 4.2**: 불필요 코드 정리 (순서 중요)
  - **순서 1**: DB 컬럼은 유지 (삭제하지 않음 - 하위 호환 보장)
  - **순서 2**: Settings `route.ts` PUT 핸들러에서 `analyze_interval_hours`, `generate_interval_hours`, `youtube_scan_interval_hours`, `youtube_max_results` 필드 제거
    - DB 컬럼이 남아있는 상태에서 API 필드 먼저 제거해도 안전 (DB에 해당 값 업데이트 안 할 뿐, 기존 값 유지)
    - **반대 순서(API 유지 + DB 컬럼 삭제) 금지**: API가 없는 컬럼에 값을 쓰려 하면 Supabase가 에러를 반환함
  - **순서 3**: Settings 페이지 `Prod` 인터페이스에서 해당 필드 제거
  - **참고**: `generate` 작업 스케줄 설정 시, 분석 완료 소재가 없으면 generator.py가 빈 실행됨 (에러는 아님, 정상 동작)

- [ ] **Task 4.3**: 커밋 & 배포
  - git commit + push
  - Vercel 빌드 성공 확인
  - VPS 파일 최종 동기화

#### Quality Gate ✋
- [ ] 대시보드 모든 페이지 정상 로드
- [ ] 스케줄 설정 → 저장 → 리로드 시 값 유지
- [ ] VPS scheduler가 설정된 스케줄에 맞게 작업 등록
- [ ] Vercel 빌드 성공
- [ ] 기존 기능 (수동 등록, 삭제 등) 영향 없음

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| crontab 변경 시 기존 스캔 중단 | Medium | High | 새 scheduler 동작 확인 후 기존 cron 제거 |
| 시간대 변환 오류 (UTC/KST) | Medium | Medium | KST = UTC+9 고정, `datetime.now(timezone(timedelta(hours=9)))` 사용 |
| DB 컬럼 추가 실패 | Low | High | SQL 실행 전 수동 확인 |
| 중복 작업 등록 (cron 지연) | Medium | Low | pending+running 동시 체크로 방지 |
| API 필드 제거 순서 오류 | Low | Medium | DB 컬럼 유지 → API 제거 → UI 제거 순서 준수 |
| supabase 임포트 잔류 | Low | Low | Task 3.2에서 should_run() 제거 시 임포트 라인 동시 수정 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- DB 컬럼 삭제: `ALTER TABLE threads_product_config DROP COLUMN schedule_*`
- Settings API 원복 (git revert)

### If Phase 2 Fails
- `/schedule` 페이지 삭제, 사이드바 원복
- 설정 페이지 자동화 섹션 복원 (git revert)

### If Phase 3 Fails
- `scheduler.py` 삭제
- crontab 원래대로 복원:
  ```
  0 19 * * * cd /root/threads-api && /usr/bin/python3 scanner.py --mode feed --count 200
  0 * * * * cd /root/threads-api && /usr/bin/python3 youtube_collector.py --type long
  ```

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
| Phase 1: DB + API | 1h | - | - |
| Phase 2: Dashboard UI | 2h | - | - |
| Phase 3: VPS Scheduler | 1.5h | - | - |
| Phase 4: 통합 테스트 | 0.5h | - | - |
| **Total** | **5h** | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- (구현 중 추가 예정)

---

**Plan Status**: ⏳ Pending User Approval
**Next Action**: 사용자 승인 후 Phase 1부터 구현 시작
**Blocked By**: None
