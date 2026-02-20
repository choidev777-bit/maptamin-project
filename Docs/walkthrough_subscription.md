# 정기 구독 결제 시스템 — 수동 테스트 워크스루

> **대상**: Phase 4 정기 구독 결제 시스템 전체
> **작성일**: 2026-02-19
> **테스트 환경**: PortOne V2 테스트 채널 (KCP)

---

## 사전 준비

### 1. 환경 변수 확인
```bash
# .env.local
PORTONE_API_SECRET=your_test_api_secret
NEXT_PUBLIC_PORTONE_STORE_ID=your_store_id
```

### 2. DB 마이그레이션 확인
```sql
-- subscription_billing 테이블 존재 확인
SELECT * FROM subscription_billing LIMIT 1;

-- subscription_payment_history 테이블 존재 확인
SELECT * FROM subscription_payment_history LIMIT 1;
```

### 3. 개발 서버 실행
```bash
npm run dev
```

---

## 테스트 시나리오

### 시나리오 1: 구독 가입 (Happy Path)

| 단계 | 행동 | 예상 결과 |
|------|------|-----------|
| 1 | `/dashboard/subscription` 접속 | 구독 관리 페이지 렌더링 |
| 2 | "프로" 플랜의 "구독 시작" 클릭 | PortOne 빌링키 결제창 팝업 |
| 3 | 테스트 카드 정보 입력 후 확인 | 결제창 닫힘, 로딩 상태 표시 |
| 4 | 서버 처리 완료 | "구독이 시작되었습니다!" 성공 화면 |
| 5 | "대시보드로 이동" 클릭 | `/dashboard`로 이동 |

**DB 검증:**
```sql
-- 구독 빌링 상태 확인
SELECT status, plan_id, billing_key, next_payment_id, next_billing_date
FROM subscription_billing
WHERE user_id = '<YOUR_USER_ID>';
-- 예상: status='active', plan_id='pro', billing_key 존재, next_payment_id 존재

-- 결제 이력 확인
SELECT payment_id, plan_id, amount, status, period_start, period_end
FROM subscription_payment_history
WHERE user_id = '<YOUR_USER_ID>'
ORDER BY created_at DESC;
-- 예상: status='paid', amount=29000
```

**PortOne 관리자 확인:**
- [포트원 관리자 콘솔](https://admin.portone.io) → 결제 내역에서 결제 확인
- 예약 결제 목록에서 다음 달 결제 예약 확인

---

### 시나리오 2: 구독 해지

| 단계 | 행동 | 예상 결과 |
|------|------|-----------|
| 1 | `/dashboard/subscription` 접속 | "현재 구독 중" 카드 표시 |
| 2 | "구독 해지" 링크 클릭 | 해지 확인 모달 표시 |
| 3 | 모달 내용 확인 | "다음 결제일까지 혜택 유지" 안내 표시 |
| 4 | "해지하기" 클릭 | 로딩 → 해지 완료 |
| 5 | 화면 확인 | "구독 해지됨" 배너, 만료 예정일 표시 |

**DB 검증:**
```sql
SELECT status, next_payment_id
FROM subscription_billing
WHERE user_id = '<YOUR_USER_ID>';
-- 예상: status='canceled', next_payment_id=NULL
```

**PortOne 관리자 확인:**
- 예약 결제 목록에서 다음 달 결제 예약이 **취소**됨 확인
- 빌링키 목록에서 빌링키가 **삭제**됨 확인

---

### 시나리오 3: 해지 모달에서 "유지하기" 클릭

| 단계 | 행동 | 예상 결과 |
|------|------|-----------|
| 1 | "구독 해지" 클릭 | 모달 표시 |
| 2 | "유지하기" 클릭 | 모달 닫힘, 구독 상태 유지 |

---

### 시나리오 4: Webhook 수동 테스트 (선택)

> PortOne 테스트 환경에서 Webhook을 수동으로 트리거하는 방법입니다.

1. **ngrok 또는 cloudflared로 로컬 서버 노출**
```bash
npx ngrok http 3000
# 또는
cloudflared tunnel --url http://localhost:3000
```

2. **PortOne 관리자 → 웹훅 URL 설정**
```
https://<ngrok-url>/api/payment/webhook
```

3. **테스트 결제 실행** (시나리오 1 수행)

4. **서버 로그 확인**
```
[Webhook] Transaction.Paid 수신: sub_pro_xxx
[Webhook] 결제 검증 완료: paymentId=sub_pro_xxx
[Webhook] 구독 활성화 완료 (RPC)
[Webhook] 다음 달 결제 예약 완료
```

---

### 시나리오 5: 이중 해지 방지

| 단계 | 행동 | 예상 결과 |
|------|------|-----------|
| 1 | 이미 해지된 구독 상태에서 API 직접 호출 | 400 + "이미 해지된 구독입니다" |

```bash
curl -X POST http://localhost:3000/api/payment/subscribe/cancel \
  -H "Cookie: <AUTH_COOKIE>"
```

---

## 테스트 카드 정보 (KCP 테스트)

| 항목 | 값 |
|------|-----|
| 카드 번호 | PortOne 테스트 모드에서는 아무 카드 입력 가능 |
| 유효기간 | 미래 날짜 아무거나 |
| 비밀번호 앞 2자리 | 00 |
| 생년월일 | 900101 |

> ⚠️ **테스트 모드**에서만 위 정보가 유효합니다. 실제 카드 사용 금지!

---

## 자동 테스트 실행

### Unit Tests
```bash
# 전체 결제 관련 테스트
npx jest src/app/api/payment --verbose

# 개별 테스트
npx jest src/app/api/payment/subscribe/cancel/route.test.ts --verbose
npx jest src/app/api/payment/webhook/route.test.ts --verbose
```

### E2E Tests (Playwright)
```bash
# 구독 E2E 테스트
npx playwright test e2e/subscription.spec.ts --headed

# 전체 E2E
npx playwright test --headed
```

---

## 체크리스트

- [ ] 구독 가입 성공 (프로 플랜)
- [ ] DB에 subscription_billing 레코드 생성됨
- [ ] DB에 subscription_payment_history 레코드 생성됨
- [ ] PortOne에 예약 결제 등록됨
- [ ] 구독 해지 성공
- [ ] DB status = 'canceled'
- [ ] PortOne 예약 결제 취소됨
- [ ] PortOne 빌링키 삭제됨
- [ ] 해지 후 혜택 유지 (다음 결제일까지)
- [ ] 이중 해지 방지 (400 에러)
- [ ] Unit Tests 전체 통과 (33개)
- [ ] E2E Tests 통과 (구독 시작/해지)
