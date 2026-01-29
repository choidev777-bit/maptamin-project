# 🛠️ 포인트 및 요금제 시스템 구현 수도코드 (Pseudocode)

이 문서는 **순차적 사고(Sequential Thinking)**를 통해 설계된 **구현 순서**와 **로직**을 정의합니다.
가장 하위 레벨인 **데이터베이스**부터 시작하여 **UI**까지 상향식(Bottom-Up)으로 구현합니다.

---

## **Phase 1: 데이터베이스 & 핵심 로직 (The Foundation)**
> **목표**: 데이터가 저장될 공간을 만들고, 가장 중요한 '돈(포인트)'을 안전하게 다루는 함수를 심습니다.

### 1-1. 테이블 생성
```sql
-- 1. 계획(Plans) 테이블
CREATE TABLE plans (
    id: 'light', 'basic', 'pro'
    monthly_points: number
    limits: { places: number, competitors: number, grid: number }
)

-- 2. 사용자 지갑(User Credits) - Dual Wallet
CREATE TABLE user_credits (
    user_id: FK(auth.users)
    subscription_balance: number (월간 소멸)
    cash_balance: number (영구)
    updated_at: timestamp
)

-- 3. 원장(Ledger) - 기록용
CREATE TABLE credit_ledger (
    id: uuid
    amount: number
    type: 'usage', 'reset', 'charge'
    description: text
)

-- 4. 관리 장소(Managed Places) - "내 가게"
CREATE TABLE managed_places (
    user_id: FK
    place_id: text
    locked_until: timestamp (30일 락킹)
)

-- 5. 관리 경쟁사(Managed Competitors) - "경쟁사"
CREATE TABLE managed_competitors (
    user_id: FK
    place_id: text
    locked_until: timestamp (30일 락킹)
    created_at: timestamp
)

-- 6. 예약 검색 설정(Search Schedules) - "자동 분석"
CREATE TABLE search_schedules (
    id: uuid
    user_id: FK
    place_id: text
    keywords: text[]
    grid_config: jsonb
    crawling_days: int[] -- e.g. [1, 3, 5] (월,수,금)
    crawling_time: time  -- e.g. 09:00
    is_active: boolean
    last_run_at: timestamp
)
```

### 1-2. [중요] 포인트 차감 RPC 함수 (Atomic Transaction)
> **설명**: 서버 코드에서 `UPDATE`를 두 번 날리면 중간에 에러가 났을 때 꼬입니다. DB 내부 함수로 한 번에 처리합니다.

```sql
FUNCTION deduct_points(p_user_id, p_cost) RETURNS boolean
BEGIN
    -- 1. 사용자 지갑 행 잠금 (동시성 제어)
    SELECT * FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

    -- 2. 잔액 확인
    current_sub = subscription_balance
    current_cash = cash_balance

    IF (current_sub + current_cash < p_cost) THEN
        RAISE EXCEPTION '잔액 부족'
    END IF

    -- 3. 차감 로직 (우선순위: 구독 -> 충전)
    remaining_cost = p_cost

    -- 구독 포인트 먼저 차감
    IF (current_sub >= remaining_cost) THEN
        UPDATE user_credits SET subscription_balance -= remaining_cost
        remaining_cost = 0
    ELSE
        remaining_cost -= current_sub
        UPDATE user_credits SET subscription_balance = 0
    END IF

    -- 남은 비용은 충전 포인트에서 차감
    IF (remaining_cost > 0) THEN
        UPDATE user_credits SET cash_balance -= remaining_cost
    END IF

    -- 4. 원장 기록
    INSERT INTO credit_ledger (..., amount: -p_cost, type: 'usage')

    RETURN TRUE
END

FUNCTION refund_points(p_user_id, p_amount) RETURNS boolean
BEGIN
    -- 1. 사용자 지갑 행 잠금
    SELECT * FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

    -- 2. 포인트 환불 (구독 잔액으로 우선 복구)
    -- 원래 어디서 차감되었는지 추적하면 좋으나, 복잡도를 줄이기 위해 구독 잔액으로 복구 (어차피 월말 소멸)
    UPDATE user_credits SET subscription_balance += p_amount

    -- 3. 원장 기록
    INSERT INTO credit_ledger (..., amount: +p_amount, type: 'refund', description: '검색 실패 환불')

    RETURN TRUE
END

FUNCTION charge_points(p_user_id, p_amount) RETURNS boolean
BEGIN
    -- 1. 사용자 지갑 잠금
    SELECT * FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

    -- 2. 포인트 충전 (충전 포인트 잔액 증가)
    UPDATE user_credits SET cash_balance += p_amount

    -- 3. 원장 기록
    INSERT INTO credit_ledger (..., amount: +p_amount, type: 'charge', description: '포인트 결제 충전')

    RETURN TRUE
END
```

---

## **Phase 2: 백엔드 서비스 로직 (The Logic)**
> **목표**: DB 위에서 돌아가는 비즈니스 로직(규칙)을 코드로 구현합니다.

### 2-1. 비용 계산기 (Utility)
```typescript
function calculateCost(keywords: string[], gridPoints: Point[]): number {
    // 활성화된(켜져있는) 그리드 포인트만 카운트
    activePoints = gridPoints.filter(p => p.enabled).length
    return keywords.length * activePoints
}
```

### 2-2. 검색 서비스 (Strict Search Gating)
> **핵심**: "내 가게" 혹은 "등록된 경쟁사"가 아니면 검색을 거부합니다.

```typescript
async function executeSearch(user, targetPlaceId, keywords, gridConfig) {
    // 0. 지도 크기 검증 (Map Size Gating) [NEW]
    userPlan = user.plan
    maxGridSize = userPlan.max_grid_size // e.g., 3, 5, 7
    currentGridSize = Math.sqrt(gridConfig.length) // or explicit size param

    IF (currentGridSize > maxGridSize) THEN
        THROW Error(`현재 플랜(${userPlan.id})에서는 ${maxGridSize}x${maxGridSize} 지도까지만 지원합니다.`)
    END IF

    // 1. 권한 검증 (Gating)
    isMyPlace = db.managed_places.find(targetPlaceId)
    isCompetitor = db.managed_competitors.find(targetPlaceId)

    IF (!isMyPlace AND !isCompetitor) THEN
        THROW Error("등록된 장소만 검색할 수 있습니다.")
    END IF

    // 2. 비용 계산
    cost = calculateCost(keywords, gridConfig)

    // 3. 포인트 차감 시도 (RPC 호출)
    try {
        await supabase.rpc('deduct_points', { cost })
    } catch {
        THROW Error("포인트가 부족합니다.")
    }

    // 4. 실제 스크래핑 시작 및 환불 로직
    try {
        result = await Scraper.run(...)
    } catch (e) {
        // 실패 시 포인트 환불 (Compensating Transaction)
        await supabase.rpc('refund_points', { amount: cost })
        THROW Error("검색에 실패하여 포인트가 환불되었습니다.")
    }
    
    return result
}
```

### 2-3. 장소 등록 서비스 (Place Manager)
```typescript
async function registerMyPlace(user, placeId) {
    // 제한 확인
    currentCount = count(managed_places.where(user))
    maxLimit = user.plan.max_places

    IF (currentCount >= maxLimit) THEN
        THROW Error("등록 한도 초과")
    END IF

    // 등록 및 30일 락킹 설정
    insert({
        place_id: placeId,
        locked_until: now() + 30 days
    })
}

### 2-4. 경쟁사 관리 서비스 (Competitor Manager) [NEW]
```typescript
async function registerCompetitor(user, placeId) {
    // 1. 내 플랜의 경쟁사 슬롯 한도 확인
    currentCount = count(managed_competitors.where(user))
    maxLimit = user.plan.limits.competitors

    IF (currentCount >= maxLimit) THEN
        THROW Error(`경쟁사 등록 한도(${maxLimit}곳)를 초과했습니다. 플랜을 업그레이드하세요.`)
    END IF

    // 2. 경쟁사 등록 (30일 락킹 설정)
    insert({
        place_id: placeId,
        locked_until: now() + 30 days,
        created_at: now()
    insert({
        place_id: placeId,
        locked_until: now() + 30 days,
        created_at: now()
    })
}

### 2-5. 플랜 변경 서비스 (Downgrade Guard) [NEW]
```typescript
async function changePlan(user, newPlanId) {
    newPlan = db.plans.find(newPlanId)
    
    // 1. 가게(Place) 개수 초과 검증
    currentPlaces = count(managed_places.where(user_id: user.id))
    if (currentPlaces > newPlan.limits.places) {
        THROW Error(`현재 등록된 가게(${currentPlaces}곳)가 변경하려는 플랜의 허용 한도(${newPlan.limits.places}곳)를 초과합니다. 먼저 삭제해주세요.`)
    }

    // 2. 경쟁사(Competitor) 개수 초과 검증
    currentCompetitors = count(managed_competitors.where(user_id: user.id))
    if (currentCompetitors > newPlan.limits.competitors) {
        THROW Error(`현재 등록된 경쟁사(${currentCompetitors}곳)가 변경하려는 플랜의 허용 한도(${newPlan.limits.competitors}곳)를 초과합니다. 먼저 삭제해주세요.`)
    }

    // 3. 플랜 변경 수행
    updateUserPlan(user, newPlan)
}
```
```

---

## **Phase 3: 프론트엔드 UI (The Interface)**
> **목표**: 사용자가 시스템을 이해하고 사용할 수 있는 화면을 만듭니다.

### 3-1. 헤더 (Wallet UI)
- **표시**: `구독 P`와 `충전 P`를 합산하여 보여주거나 분리하여 툴팁 제공.
- **상태**: 잔액이 부족하면 빨간색으로 경고.

### 3-2. 검색 페이지 (Search Page Update)
- **장소 선택기**:
  - [기존]: 구글/네이버 주소 검색창 (삭제됨)
  - [변경]: **드롭다운 메뉴** (등록된 내 가게 / 경쟁사 리스트)
- **비용 미리보기**:
  - 그리드 클릭 시마다 `calculateCost()` 실행하여 "예상 차감: 45 P" 표시.
  - 잔액 부족 시 "검색 시작" 버튼 비활성화.

---

## **Phase 4: 자동화 (Automation)**

### 4-1. 월간 초기화 스케줄러 (Cron Job)
```typescript
// 매월 1일 또는 사용자 갱신일 00:00 실행
async function monthlyReset() {
    users = getAllUsers()
    
    FOREACH user IN users:
        // 구독 포인트 0으로 리셋
        db.user_credits.update(user.id, { subscription_balance: 0 })
        
        // 플랜에 맞는 포인트 다시 지급
        plan = user.current_plan
        db.user_credits.increment(user.id, { subscription_balance: plan.monthly_points })
        
        
        LOG("User ${user.id} reset complete")
}

### 4-2. 자동 예약 검색 워커 (Scheduled Search Worker)
```typescript
// 매 시간(Hourly) 실행 (e.g. 09:00, 10:00...)
async function runScheduledSearches() {
    currentDay = getDay()   // e.g. 1 (Monday)
    currentTime = getTime() // e.g. 09:00

    // 1. 실행 대상 스케줄 조회
    schedules = db.search_schedules.find({
        is_active: true,
        crawling_days: contains(currentDay),
        crawling_time: currentTime
    })

    FOREACH job IN schedules:
        try {
            user = db.users.find(job.user_id)
            // executeSearch 내부에서 포인트 차감 및 실패시 환불 처리됨
            await executeSearch(user, job.place_id, job.keywords, job.grid_config)
            
            // 성공 기록
            logHistory(job.id, 'SUCCESS')
        } catch (e) {
            // 잔액 부족 등으로 실패 시 알림 발송
            sendNotification(user.id, "포인트 부족으로 자동 예약 검색이 실패했습니다.")
            logHistory(job.id, 'FAILED', e.message)
        }
}
```
```
```

---

## **구현 체크리스트 (순서대로)**
1. [ ] **DB**: 마이그레이션 SQL 작성 및 실행 (`create tables`, `rpc function`).
2. [ ] **Backend**: Supabase Types 업데이트 (`database.types.ts`).
3. [ ] **Logic**: `deduct_points` RPC 테스트 (SQL 에디터에서 직접 호출해보기).
4. [ ] **Logic**: `SearchService`에 권한 체크 및 비용 차감 로직 이식.
5. [ ] **UI**: 검색 페이지에서 임의 검색 제거하고 '장소 선택' 드롭다운으로 교체.
6. [ ] **UI**: 헤더에 포인트 잔액 표시.
