# 구현 계획: Dashboard & Search Flow Restructure (Pseudo-code)

## 1. Database Schema Changes (Supabase)

### A. `managed_places` Table (New)
사용자가 관리하는 "내 가게"를 저장합니다. 플랫폼별로 1개씩 고정됩니다.

```sql
create table managed_places (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('naver', 'google')),
  place_id text not null, -- 네이버/구글의 실제 장소 ID
  place_name text not null,
  locked_until timestamptz, -- 30일 락 걸리는 시점
  created_at timestamptz default now(),
  
  unique(user_id, platform) -- 유저당 플랫폼별 1개만 존재
);
```

### B. `competitor_places` Table (New)
사용자가 등록한 "경쟁사"를 저장합니다.

```sql
create table competitor_places (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('naver', 'google')),
  place_id text not null,
  place_name text not null,
  locked_until timestamptz,
  created_at timestamptz default now()
);
```

---

## 2. API Routes Implementation

### A. 내 가게 설정 (`POST /api/settings/my-shop`)
```typescript
// Request Body
{
  platform: 'naver' | 'google',
  placeId: string,
  placeName: string
}

// Logic
async function handler(req, res) {
  const user = await getUser(req);
  
  // 1. 이미 존재하는지 확인
  const existing = await db.managed_places.find({ userId: user.id, platform });
  
  if (existing) {
    // 2. 락 기간 확인
    if (existing.locked_until > now()) {
      return error("30일 동안 변경할 수 없습니다.");
    }
    
    // 3. 업데이트 (락 기간 30일 재설정)
    await db.managed_places.update({
      where: { id: existing.id },
      data: { 
        placeId, 
        placeName, 
        locked_until: now() + 30days 
      }
    });
  } else {
    // 4. 신규 생성
    await db.managed_places.create({
      userId: user.id,
      platform,
      placeId,
      placeName,
      locked_until: now() + 30days
    });
  }
  
  return success;
}
```

### B. 경쟁사 추가 (`POST /api/settings/competitors`)
```typescript
// Logic
async function handler(req, res) {
  const user = await getUser(req);
  const plan = await getUserPlan(user.id);
  
  // 1. 슬롯 제한 확인
  const count = await db.competitor_places.count({ userId: user.id, platform });
  if (count >= plan.maxCompetitors) {
    return error("슬롯이 가득 찼습니다.");
  }
  
  // 2. 생성
  await db.competitor_places.create({
    userId: user.id,
    platform,
    placeId, 
    placeName,
    locked_until: now() + 30days
  });
  
  return success;
}
```

---

## 3. Frontend Components & Logic

### A. Dashboard Cards (`src/app/(dashboard)/page.tsx`)

```tsx
function Dashboard() {
  const { naverShop, googleShop } = useMyShops();
  
  return (
    <div className="flex flex-col gap-4">
      <DashboardPlatformCard 
        platform="naver" 
        data={naverShop} 
        onRegister={() => openModal('naver')} 
      />
      <DashboardPlatformCard 
        platform="google" 
        data={googleShop} 
        onRegister={() => openModal('google')} 
      />
    </div>
  )
}

function DashboardPlatformCard({ platform, data }) {
  if (!data) {
    return (
      <Card>
        <Button>사장님의 매장을 선택해주세요</Button> {/* Opens Search Modal */}
      </Card>
    )
  }
  
  return (
    <Card>
       <div className="keywords-list">
         {data.keywords.map(k => (
           <Badge onClick={() => toggleGraph(k)}>{k}</Badge>
         ))}
       </div>
       
       {selectedKeyword && (
         <InlineRankGraph keyword={selectedKeyword} />
       )}
    </Card>
  )
}
```

### B. "내 가게 순위 검색" Flow update

**Previous**: `Select My/Competitor` Toggle
**New**: 
- `DesktopNav` link points to `/naver-search/new?mode=my-shop`
- In `NewNaverSearchPage`:
  ```tsx
  useEffect(() => {
    if (mode === 'my-shop') {
       // Fetch my shop info from DB
       const myShop = await fetchMyShop('naver');
       if (!myShop) {
         alert("대시보드에서 매장을 먼저 선택해주세요.");
         router.push('/dashboard');
         return;
       }
       // Auto-fill and skip Step 1
       setPlace(myShop);
       setStep(2); // Go to Keyword Input
    }
  }, [mode]);
  ```

### C. "경쟁사 순위 검색" Flow update

**Page**: `/competitor-search/naver` (New Page or modified existing)

```tsx
function CompetitorSearchPage() {
  const competitors = useCompetitors('naver');
  const slots = generateSlots(plan.limit, competitors);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {slots.map(slot => (
        <CompetitorSlot 
           data={slot.data} 
           isEmpty={!slot.data}
           onRegister={() => openSearchModal()}
           onSearch={() => router.push(`/naver-search/new?competitorId=${slot.data.id}`)}
           onHistory={() => router.push(`/naver-search/history?competitorId=${slot.data.id}`)}
        />
      ))}
    </div>
  )
}
```

---

## 4. Verification Plan (Test Scenarios)

### 1. New User Flow
- [ ] 신규 계정 생성
- [ ] 대시보드 진입 시 "매장 선택" 버튼 확인
- [ ] 네이버 매장 선택 -> 30일 경고 확인 -> 저장
- [ ] 저장 후 대시보드 카드 상태 변경 확인 ("기록 없음")

### 2. Lock Logic
- [ ] 저장된 매장 변경 시도 -> API 에러 또는 UI 비활성화 확인

### 3. Search Flow
- [ ] "내 가게 순위 검색" 메뉴 클릭
- [ ] 장소 선택 단계 스킵되고 키워드 입력 단계로 바로 진입하는지 확인
- [ ] 검색 완료 후 대시보드 그래프에 반영되는지 확인

---

## 5. Pricing & Plan Logic Implementation (New)

### A. Plan Constants Configuration (`src/lib/pricing/config.ts`)
매직 넘버를 제거하고 중앙에서 관리합니다.

```typescript
export const PLAN_CONFIG = {
  light: {
    price: 19900,
    points: 1000,
    limits: { place: 1, competitor: 0, gridSize: 3 }
  },
  basic: {
    price: 59000,
    points: 5000,
    limits: { place: 1, competitor: 3, gridSize: 5 }
  },
  pro: {
    price: 99000,
    points: 12000,
    limits: { place: 3, competitor: 10, gridSize: 7 }
  }
}
```

### B. Logic Integration

#### 1. Competitor Limit Check
In `POST /api/settings/competitors`:

```typescript
const userPlan = await getUserPlan(userId);
const config = PLAN_CONFIG[userPlan.id];

const currentCount = await db.competitor.count({ userId });
if (currentCount >= config.limits.competitor) {
  throw new Error("업그레이드가 필요합니다.");
}
```

#### 2. Grid Size Check
In `POST /api/search` (or grid config UI):

```typescript
const userPlan = await getUserPlan(userId);
const config = PLAN_CONFIG[userPlan.id];

// 3x3=3, 5x5=5, 7x7=7 (width)
if (request.gridWidth > config.limits.gridSize) {
   throw new Error("해당 그리드 크기는 현재 플랜에서 지원하지 않습니다.");
}
```
