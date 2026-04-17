# 🔄 포트폴리오 모드 전환 메모

> **목적**: 키움디지털아카데미 지원 포트폴리오 제출용  
> **전환일**: 2026-04-17  
> **전환 사유**: 사업자 폐업 (아카데미 지원 자격 요건)  
> **원복 조건**: 아카데미 불합격 시 사업자 재등록 후 원복  

---

## 검색 키워드

코드 내 모든 변경 위치는 `[PORTFOLIO MODE]` 주석으로 표시되어 있습니다.  
전체 프로젝트에서 `[PORTFOLIO MODE]`를 검색하면 모든 변경점을 찾을 수 있습니다.

---

## 변경 내역

### 1. Footer.tsx — 사업자 정보 주석처리
- **파일**: `src/components/landing/Footer.tsx`
- **변경 내용**:
  - 아카식 허브 상호명 → "맵타민 (Maptamin)" 으로 대체
  - 사업자등록번호 (`186-35-01741`), 통신판매업신고, 대표자, 주소, 대표번호 → 주석처리
  - "포트폴리오 데모 환경입니다" 안내 문구로 대체
  - 카카오톡 문의 버튼 → 주석처리
- **원복 방법**:
  1. `[PORTFOLIO MODE]` 주석 블록 삭제
  2. 주석 처리된 원래 JSX 코드의 `{/* ... */}` 해제
  3. "포트폴리오 모드 대체 표시" 블록 삭제

### 2. CheckoutContent.tsx — 구독 결제 비활성화 + 사업자 정보 주석처리
- **파일**: `src/components/dashboard/CheckoutContent.tsx`
- **변경 내용**:
  - `handlePayment()` 함수: 실제 PortOne SDK 호출 → alert 데모 안내로 대체
  - 결제 버튼 텍스트: `₩{금액} 결제하기` → `데모 환경 — 결제 체험하기`
  - 하단 사업자 정보 (아카식 허브, 사업자등록번호 등) → 주석처리
  - "포트폴리오 데모 환경 — 실제 결제가 발생하지 않습니다" 안내로 대체
- **원복 방법**:
  1. `handlePayment()` 내 `alert(...)` + `return` 2줄 삭제
  2. `/* [PORTFOLIO MODE] 원래 결제 로직 ... */` 주석 해제
  3. 결제 버튼 텍스트를 원래 `` `₩${totalAmountDisplay} 결제하기` ``로 복원
  4. 하단 사업자 정보 주석 해제 + 포트폴리오 모드 대체 블록 삭제

### 3. TicketShopContent.tsx — 티켓 결제 + 환불 비활성화
- **파일**: `src/components/dashboard/TicketShopContent.tsx`
- **변경 내용**:
  - `handlePurchase()` 함수: 실제 PortOne 결제 → alert 데모 안내로 대체
  - `handleRefund()` 함수: 실제 환불 API 호출 → alert 데모 안내로 대체
  - 결제 버튼 텍스트: `{금액}원 결제하기` → `데모 환경 — 결제 체험하기`
- **원복 방법**:
  1. `handlePurchase()` 내 `alert(...)` + `return` 2줄 삭제
  2. `/* [PORTFOLIO MODE] 원래 결제 로직 ... */` 주석 해제
  3. `handleRefund()` 내 `alert(...)` + `return` 2줄 삭제
  4. `/* [PORTFOLIO MODE] 원래 환불 로직 ... */` 주석 해제
  5. 결제 버튼 텍스트를 원래 `{formatPrice(totalPrice)}원 결제하기`로 복원 + `<CreditCard>` 아이콘 복원

---

## 변경하지 않은 항목 (의도적 유지)

| 항목 | 이유 |
|------|------|
| `src/lib/portone/` 전체 라이브러리 | 결제 시스템 기술력 증명 (코드 리뷰용) |
| `src/app/api/payment/` 전체 API 라우트 | 백엔드 결제 로직 기술력 증명 |
| `src/lib/pricing/` 가격 설정 | 과금 체계 설계 능력 증명 |
| `src/app/terms/page.tsx` 이용약관 | 법률 문서 작성 경험 증명 |
| `src/app/privacy/page.tsx` 개인정보처리방침 | 법률 문서 작성 경험 증명 |
| `.env.local` 환경변수 | 로컬 파일이므로 포트폴리오에 포함되지 않음 |
| 도메인 참조 (maptamin.com) | 도메인 유지 중이므로 그대로 유지 |
| 이메일 참조 (maptaminbiz@gmail.com) | 연락처로 유지 |

---

## 빠른 원복 체크리스트

```bash
# 1. 모든 변경점 검색
grep -rn "\[PORTFOLIO MODE\]" src/
```

- [ ] Footer.tsx 사업자 정보 원복
- [ ] Footer.tsx 카카오톡 문의 원복
- [ ] CheckoutContent.tsx handlePayment 원복
- [ ] CheckoutContent.tsx 결제 버튼 텍스트 원복
- [ ] CheckoutContent.tsx 하단 사업자 정보 원복
- [ ] TicketShopContent.tsx handlePurchase 원복
- [ ] TicketShopContent.tsx handleRefund 원복
- [ ] TicketShopContent.tsx 결제 버튼 텍스트 원복
