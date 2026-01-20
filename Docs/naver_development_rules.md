# 네이버 지도 개발 Rule

네이버 지도 Grid Map 기능 개발 시 **기존 구글 지도 기능에 영향을 주지 않기 위한** 개발 규칙입니다.

---

## Rule 1: 추가 우선, 수정 최소화

- 새 기능은 **새 파일/폴더**에 추가
- 기존 파일 수정은 **필수적인 것만** (타입 확장 등)
- 기존 코드 삭제/변경 지양

---

## Rule 2: 디렉토리 분리

```
src/app/(dashboard)/
├── search/           # 기존 구글 (건드리지 않음!)
└── naver-search/     # 새 네이버 (완전 신규)

src/lib/
├── dataforseo/       # 기존 구글용
└── naver/            # 새 네이버용

src/components/
├── search/           # 공통 컴포넌트 (수정 시 주의)
└── naver/            # 네이버 전용 컴포넌트
```

---

## Rule 3: 타입 하위 호환성

기존 코드가 깨지지 않도록 **optional 필드**로 추가:

```typescript
// ✅ 올바른 방법
interface Search {
  // ... 기존 필드들
  platform?: 'google' | 'naver'  // optional, 기본값 google
}

// ❌ 잘못된 방법
interface Search {
  platform: 'google' | 'naver'  // required로 하면 기존 코드 깨짐
}
```

---

## Rule 4: 테스트 우선

- 기존 테스트 **모두 통과** 필수
- 새 기능에 대한 테스트 추가
- PR 전 `npm run test` 실행

```bash
# 전체 테스트 실행
npm run test

# E2E 테스트 실행
npm run test:e2e
```

---

## Rule 5: DB 마이그레이션 안전성

새 컬럼 추가 시 **반드시 DEFAULT 값 지정**:

```sql
-- ✅ 올바른 방법
ALTER TABLE searches 
ADD COLUMN platform TEXT DEFAULT 'google';
-- 기존 데이터는 자동으로 'google' 설정됨

-- ❌ 잘못된 방법
ALTER TABLE searches 
ADD COLUMN platform TEXT NOT NULL;
-- 기존 데이터 때문에 에러 발생!
```

---

## 공유 가능 컴포넌트

| 컴포넌트 | 공유 가능 | 비고 |
|---------|----------|------|
| `grid-calculator.ts` | ✅ | 좌표 계산은 플랫폼 무관 |
| `rank-colors.ts` | ✅ | 색상 로직 동일 |
| `KeywordInput.tsx` | ✅ | 검증 로직만 분기 |
| `GridConfigurator.tsx` | ✅ | CSS 그리드 버전 |
| `DistanceSettings.tsx` | ✅ | 거리 설정 |
| `RankHeatmap.tsx` | ✅ | 결과 시각화 |
| `PlaceSearchInput.tsx` | ❌ | Google Places API 전용 |
| `MapGridConfigurator.tsx` | ❌ | Google Maps 전용 |

---

## 체크리스트

네이버 기능 개발 시 매번 확인:

- [ ] 기존 `/search/` 라우트 파일 수정하지 않았는가?
- [ ] 새 코드는 `/naver-search/` 또는 `/lib/naver/`에 있는가?
- [ ] 타입 수정 시 optional로 추가했는가?
- [ ] 기존 테스트가 모두 통과하는가?
- [ ] DB 마이그레이션에 DEFAULT 값이 있는가?
