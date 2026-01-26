# 🛠️ 네이버 데이터 최적화 구현 계획서 (Implementation Plan)

> **목표**: 데이터 소모량 99% 절감 (20MB → 0.1MB)
> **전략**: Resource Blocking + Context Isolation + Hybrid Scraping

---

## 📅 단계별 구현 로직 (Pseudo-code)

### 1단계: 리소스 차단 (Resource Blocking) [Priority 1]
가장 안전하고 확실한 1차 방어선입니다.

```typescript
// Pseudo-code in scraper.ts

const BLOCKED_TYPES = ['image', 'media', 'font', 'stylesheet'];
const BLOCKED_URLS = [
    '*.png', '*.jpg', '*.jpeg', '*.webp', '*.gif', // 이미지
    '*.woff', '*.woff2', '*.ttf',                  // 폰트
    'log.naver.com', 'google-analytics',           // 트래킹
    '/map-tile/', 'vector-tile'                    // ⚠️ 지도 타일 (가장 중요)
];

await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    const url = route.request().url();

    // 1. 리소스 타입 체크
    if (BLOCKED_TYPES.includes(type)) {
        return route.abort(); // 차단 🚫
    }

    // 2. URL 패턴 체크 (지도 타일 등)
    if (BLOCKED_URLS.some(blocked => url.includes(blocked))) {
        return route.abort(); // 차단 🚫
    }

    // 3. 나머지는 통과
    return route.continue();
});
```

---

### 2단계: 컨텍스트 격리 (Context Isolation) [Priority 2]
보안을 위해 1요청 1 IP를 보장하는 구조로 루프를 변경합니다.

```typescript
// Pseudo-code for scrapeNaverBatch

// 1. 브라우저는 딱 한 번만 켭니다 (CPU 절약)
const globalBrowser = await chromium.launch();

for (const task of tasks) {
    // 2. 매 작업마다 '새로운 탭(Context)'을 만듭니다
    // 이때 프록시 세션을 바꿔서 새 IP를 받습니다
    const context = await globalBrowser.newContext({
        proxy: {
            server: 'superproxy...',
            username: `user-session-${randomId()}` // ⭐️ 핵심: 매번 IP 변경
        }
    });

    const page = await context.newPage();

    // 3. 리소스 차단 적용 (1단계 코드)
    applyResourceBlocking(page);

    // 4. 검색 수행
    await scrapeAtLocation(page, task);

    // 5. 탭 닫기 (기록 삭제)
    await context.close();
}

// 6. 모든 작업 끝난 후 브라우저 종료

---

## 🛠️ 추가 수정 계획 (Fix Plan)

### Fix 1: 좀비 프로세스 방지 (Zombie Process Kill)
**문제**: 사용자가 취소(DELETE)해도 서버에서는 루프가 계속 돔.
**해결**: 루프가 한 바퀴 돌 때마다 "주문서(DB)"가 아직 있는지 확인.

```typescript
// Pseudo-code in scrapeNaverBatch function

// 1. Prisma 클라이언트 가져오기
import { db } from '@/lib/db';

export async function scrapeNaverBatch(tasks, searchId) {
    for (let i = 0; i < tasks.length; i++) {
        
        // [추가] 매번 DB 생존신고 확인 (Checkpoint)
        const jobStatus = await db.search.findUnique({
            where: { id: searchId },
            select: { id: true } // 가볍게 ID만 조회
        });

        // 주문서가 사라졌으면 즉시 종료
        if (!jobStatus) {
            console.log(`[Zombie killer] 🛑 Job ${searchId} was cancelled. Stopping loop.`);
            break; // 루프 탈출
        }

        // ... 기존 스크래핑 로직 실행 ...
    }
}
```

### Fix 2: 리소스 차단 강화 및 디버깅 (Improved Blocking)
**문제**: 차단 코드를 넣었는데도 17MB가 나감 (차단 실패).
**해결**: 무엇이 뚫렸는지 확인(Log)하고, 차단망을 촘촘하게 수정.

```typescript
// Pseudo-code in scraper.ts (scrapeAtLocation)

await page.route('**/*', async (route) => {
    const r = route.request();
    const u = r.url();
    const t = r.resourceType();

    // 1. [디버깅] 무엇이 통과되는지 확인 (임시)
    // console.log(`[Req] ${t} | ${u.slice(0, 50)}...`);

    // 2. 강력한 차단 목록
    const BLOCK_TYPES = [
        'image', 'media', 'font', 
        'stylesheet', // CSS도 차단 시도 (구조만 남김)
        'other',      // Manifest 등 기타 파일
        'texttrack',  // 자막
        'object',     // 플러그인
        'beacon',     // 분석용
        'csp_report',
        'imageset'
    ];

    // 3. 네이버 지도 전용 블랙리스트 (정규식 사용 추천)
    const BLOCK_REGEX = /map-tile|vector-tile|satellite|panorama|street-view|log\.naver|google-analytics|\.png|\.jpg|\.jpeg|\.gif|\.woff|\.ttf/i;

    if (BLOCK_TYPES.includes(t) || BLOCK_REGEX.test(u)) {
        return route.abort(); 
    }

    // 통과된 놈들은 무엇인지 로그로 남겨서 범인 색출
    // console.log(`[Pass] ${t}: ${u}`);
    
    return route.continue();
});
```


---

### 3단계: 하이브리드 인터셉트 (Hybrid Intercept) [Priority 3]
API 패킷을 낚아채는 고급 기술입니다.

```typescript
// Pseudo-code inside scrapeAtLocation

let jsonFound = false;

// 1. 감시자 등록
page.on('response', async (response) => {
    const url = response.url();
    
    // 네이버 지도 API 패턴 (예: graphql 또는 search)
    if (url.includes('/api/graphql') && url.includes('type=PLACE')) {
        const data = await response.json();
        
        // 데이터 검증
        if (isValidData(data)) {
            console.log("🎯 HIT! JS 데이터 탈취 성공 (0.1MB)");
            jsonFound = true;
            
            // 데이터 파싱 및 저장
            saveResult(data);
            
            // ⭐️ 핵심: 더 볼 것 없으니 브라우저 즉시 닫기 (Fast Kill)
            // (DOM 로딩 대기 취소)
            page.close(); 
        }
    }
});

// 2. 페이지 접속
try {
    await page.goto('https://m.map.naver.com/...');
    
    // 3. JS 방식 실패 시 (타임아웃) -> 기존 DOM 방식 실행
    if (!jsonFound) {
        console.warn("⚠️ API 인터셉트 실패. DOM 스크래핑으로 전환 (Fallback)");
        await scrapeDOM(page);
    }
} catch (e) {
    // Fast Kill로 인해 'page closed' 에러가 나면 성공으로 간주
    if (jsonFound) return success;
    throw e;
}
```
