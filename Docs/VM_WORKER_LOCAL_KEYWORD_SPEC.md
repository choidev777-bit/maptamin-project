# VM Worker — 지역명 키워드(Local Keywords) 처리 스펙

> **작성일**: 2026-03-16  
> **관련 계획**: `PLAN_local-keyword-feature.md` Phase 4  
> **대상**: Oracle VM Worker (`/run` 엔드포인트)

---

## 1. 개요

기존 VM Worker는 `search_id`를 받아 Supabase에서 검색 정보를 조회한 뒤,
`grid_points` × `keywords` 조합으로 네이버 지도 검색 순위를 크롤링합니다.

**이번 변경**: `searches.local_keywords` 필드가 추가되어,
좌표 없이 단일 순위를 추출하는 로직이 필요합니다.

---

## 2. 기존 동작 (변경 없음)

```
Dispatcher → POST /run { search_id }
Worker:
  1. Supabase에서 search 조회 (searches 테이블)
  2. search.grid_points에서 활성화된 좌표 목록 추출
  3. FOR each grid_point (index: 0, 1, 2, ...):
       FOR each keyword in search.keywords:
         URL: https://map.naver.com/p/search/{keyword}?c={lng},{lat},15,0,0,0,dh
         매장 이름(search.place_name)으로 순위 추출
         INSERT search_results:
           search_id, keyword, grid_index, grid_lat, grid_lng, rank
  4. search.status → 'completed'
```

---

## 3. 추가 동작 — local_keywords 처리

### 3-1. 데이터 조회

Worker가 `search_id`로 Supabase에서 검색 정보를 조회할 때,
기존 `keywords` 외에 **`local_keywords`** 필드도 함께 읽어야 합니다.

```sql
SELECT id, place_name, keywords, local_keywords, grid_points, ...
FROM searches
WHERE id = {search_id}
```

### 3-2. 지역명 키워드 크롤링

`local_keywords`가 비어있지 않은 경우(`[]`가 아닌 경우), 아래 로직을 실행합니다.

```
FOR each keyword in search.local_keywords:
  URL: https://map.naver.com/p/search/{keyword}
  // ⚠️ 좌표 파라미터(?c=...) 없음!
  // 지역명이 키워드에 포함되어 있으므로 좌표가 불필요
  매장 이름(search.place_name)으로 순위 추출 (기존 로직 동일)
  
  INSERT search_results:
    search_id:  {search_id}
    keyword:    {keyword}
    grid_index: -1          ← 핵심: 반드시 -1
    grid_lat:   NULL        ← 좌표 없음
    grid_lng:   NULL        ← 좌표 없음
    rank:       {추출된 순위 또는 -1 (미노출)}
```

### 3-3. 핵심 차이점

| 항목 | 업종 키워드 (기존) | 지역명 키워드 (신규) |
|------|-------------------|---------------------|
| 키워드 소스 | `search.keywords` | `search.local_keywords` |
| URL 좌표 | `?c={lng},{lat},15,0,0,0,dh` | 좌표 파라미터 없음 |
| `grid_index` | 0, 1, 2, ... (좌표 인덱스) | **`-1`** (고정값) |
| `grid_lat` | 좌표값 (float) | **`NULL`** |
| `grid_lng` | 좌표값 (float) | **`NULL`** |
| 결과 개수 | 좌표 수 × 키워드 수 | 키워드 수 (좌표당 1개) |

### 3-4. 순위 추출 로직

기존 크롤링과 동일:
- 네이버 지도 검색 결과 목록에서 `search.place_name`과 일치하는 매장 찾기
- 순위 = 검색 결과 목록 내 위치 (1-based)
- 미노출 시 `rank = -1`

---

## 4. 실행 순서

```
Worker /run 실행:
  1. [기존] grid_points × keywords 크롤링 → search_results INSERT
  2. [신규] local_keywords 크롤링 → search_results INSERT (grid_index = -1)
  3. [기존] search.status → 'completed'
```

**주의**: local_keywords 처리는 기존 grid 크롤링이 완료된 **이후**에 실행해도 되고,
**병렬**로 실행해도 됩니다. 단, 모든 INSERT가 완료된 후에 status를 `completed`로 변경해야 합니다.

---

## 5. 엣지 케이스

### 5-1. `local_keywords`가 비어있는 경우
- `local_keywords`가 `[]` 또는 `null`이면 **아무것도 하지 않음**
- 기존 동작에 영향 없음

### 5-2. `local_keywords`가 없는 열 (이전 데이터)
- 마이그레이션으로 기존 searches에 `local_keywords` 컬럼이 추가됨 (기본값: `'{}'`)
- 따라서 기존 데이터는 빈 배열 (`[]`)을 반환
- Worker는 빈 배열을 안전하게 무시해야 함

### 5-3. 업종 키워드와 지역명 키워드 이름 충돌
- 이론적으로 `keywords: ['카페']`와 `local_keywords: ['카페']`가 동시에 존재할 수 있음
- `grid_index`가 다르므로 (`>= 0` vs `-1`) DB에서 구분 가능
- Worker는 **별도로 크롤링**하여 각각 INSERT

---

## 6. DB 스키마 참조

### `search_results` 테이블 (관련 컬럼)

```sql
search_id   UUID NOT NULL  -- searches.id FK
keyword     TEXT NOT NULL
grid_index  INT NOT NULL   -- 좌표 인덱스 (지역명: -1)
grid_lat    FLOAT          -- nullable (지역명: NULL)
grid_lng    FLOAT          -- nullable (지역명: NULL)
rank        INT NOT NULL   -- 순위 (미노출: -1)
```

### `searches` 테이블 (관련 컬럼)

```sql
keywords        TEXT[] NOT NULL       -- 업종 키워드 목록
local_keywords  TEXT[] DEFAULT '{}'   -- 지역명 키워드 목록 (신규)
place_name      TEXT NOT NULL         -- 매장 이름 (순위 추출용)
grid_points     JSONB                 -- 좌표 목록
```

---

## 7. 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | `local_keywords: []` | local 관련 search_results 없음, 기존 동작 정상 |
| 2 | `local_keywords: ['홍대 카페']` | `grid_index=-1`, `grid_lat=NULL` 레코드 1건 |
| 3 | `local_keywords: ['홍대 카페', '마포 맛집']` | `grid_index=-1` 레코드 2건 |
| 4 | `keywords: ['카페']` + `local_keywords: ['강남 카페']` | grid 크롤링 + local 크롤링 각각 정상 |
| 5 | 매장 미노출 | `rank=-1` 저장 |

---

## 8. 체크리스트

- [ ] `searches.local_keywords` 필드 읽기 구현
- [ ] 좌표 없는 네이버 지도 검색 URL 생성
- [ ] `grid_index=-1`, `grid_lat=NULL`, `grid_lng=NULL`로 INSERT
- [ ] `local_keywords`가 빈 배열일 때 무시
- [ ] 기존 크롤링 로직에 영향 없음 확인
- [ ] 모든 INSERT 완료 후 status='completed' 변경
