# NHN KCP 연동 가이드

NHN KCP 연동 방법을 안내합니다.

## 채널 설정하기
결제대행사 채널 설정하기의 내용을 참고하여 PG 설정을 진행합니다.

## 사전 계약 안내
아래 기능을 사용하시려면 KCP에 사전 신청 후 계약이 완료되어야 합니다. 그렇지 않은 상태에서 해당 기능 이용시 결제 승인에 실패하거나, 승인에 성공하더라도 의도한 바와는 다른 응답(ex. 결제창에서 에스크로 결제를 했으나 비-에스크로 결제 응답을 받음)을 얻게 될 수 있으니 주의해주시기 바랍니다.

- API를 통한 수기 결제 (가상계좌, 카드)
- API를 통한 빌링키 발급
- 에스크로 결제
- 상점분담무이자 설정
- 부가세 및 비과세 금액 직접 설정
- 부분무이자 설정
- 휴대폰 결제 익월 환불

## 가능한 결제 수단

### 결제창 일반 결제
`payMethod` 파라미터를 결제 수단에 따라 아래와 같이 설정해야 합니다.

- **카드**: `CARD`
- **계좌이체**: `TRANSFER`
- **가상계좌**: `VIRTUAL_ACCOUNT`
- **상품권**: `GIFT_CERTIFICATE`
- **휴대폰 소액 결제**: `MOBILE`
- **간편결제**: `EASY_PAY`

### 결제창 빌링키 발급
`billingKeyMethod` 파라미터를 결제 수단에 따라 아래와 같이 설정해야 합니다.

- **카드**: `CARD`

### API 수기(키인) 결제
`method` 파라미터를 결제 수단에 따라 아래와 같이 설정해야 합니다.

- **카드**: `card`로 설정하여 카드 관련 파라미터 입력
- **가상계좌**: `virtualAccount`로 설정하여 가상계좌 관련 파라미터 입력
- *자세한 파라미터 구성은 REST API Docs 를 참고해주시기 바랍니다.*

### API 빌링키 발급
`method` 파라미터를 결제 수단에 따라 아래와 같이 설정해야 합니다.

- **카드**: `card`로 설정하여 카드 관련 파라미터 입력
- *자세한 파라미터 구성은 REST API Docs를 참고해주시기 바랍니다.*

---

## SDK 결제 요청하기
결제 요청 시에는 `requestPayment` 함수를 호출해야 합니다. `channelKey` 파라미터에 결제 채널 연동 후 생성된 채널 키값을 지정하여 KCP 채널 사용을 명시해주세요.

KCP 기준으로 작성한 예시 코드는 아래와 같습니다.

### SDK 결제 요청 예시
```javascript
import * as PortOne from "@portone/browser-sdk/v2";

function requestPayment() {
  PortOne.requestPayment({
    storeId: "store-4ff4af41-85e3-4559-8eb8-0d08a2c6ceec", // 고객사 storeId로 변경해주세요.
    channelKey: "channel-key-9987cb87-6458-4888-b94e-68d9a2da896d", // 콘솔 결제 연동 화면에서 채널 연동 시 생성된 채널 키를 입력해주세요.
    paymentId: `payment${crypto.randomUUID()}`,
    orderName: "나이키 와플 트레이너 2 SD",
    totalAmount: 1000,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: {
      fullName: "포트원",
      phoneNumber: "010-0000-1234",
      email: "test@portone.io",
    },
  });
}
```

### 주요 파라미터

- **storeId**: `string` (상점 아이디)
  - 포트원 계정에 생성된 상점을 식별하는 고유한 값으로 관리자 콘솔에서 확인할 수 있습니다.
- **paymentId**: `string` (고객사 주문 고유 번호)
  - 고객사에서 채번하는 주문 고유 번호로 매번 고유하게 채번되어야 합니다. 이미 승인 완료된 paymentId로 결제를 시도하는 경우 에러가 발생합니다. KCP의 경우 최대 40자 까지 허용합니다.
- **orderName**: `string` (주문명)
  - 주문명으로 고객사에서 자유롭게 입력합니다. KCP의 경우 최대 100Byte까지 허용합니다.
- **channelKey**: `string` (채널 키)
  - 포트원 콘솔 내 [연동 관리] > [연동 정보] > [채널 관리] 화면에서 채널 추가 시 생성되는 값입니다. 결제 호출 시 채널을 지정할 때 사용됩니다.
- **totalAmount**: `number` (결제 금액)
  - 결제 금액으로 결제를 원하는 통화(currency)별 scale factor(소수점 몇번째 자리까지 유효한지)를 고려한 number 형식만 허용됩니다.
- **currency**: `string` (결제 통화)
  - 결제통화로 원화 결제 시 `KRW`로 입력해야 합니다.
- **payMethod**: `string` (결제수단 구분코드)
  - 결제 호출 시 결제수단을 지정할 때 사용됩니다.
  - 신용카드: `CARD`
  - 실시간 계좌이체: `TRANSFER`
  - 가상계좌: `VIRTUAL_ACCOUNT`
  - 휴대폰 소액결제: `MOBILE`
  - 간편 결제: `EASY_PAY`
- **customer?**: `object` (고객 정보)
  - `fullName`: 구매자 전체 이름
  - `firstName`: 구매자 이름
  - `lastName`: 구매자 성
  - `phoneNumber`: 구매자 연락처
  - `email`: 구매자 이메일
- **bypass?**: `oneof object` (PG사 결제창 호출 시 PG사로 그대로 bypass할 파라미터들의 모음)
  - **kcp_v2?**: `object` (KCP에서 제공하는 파라미터 모음)
    - `site_logo`: 결제창 상단 로고 URL (150*50 미만, GIF/JPG)
    - `skin_indx`: 결제창 색상 (1~12, PC 전용)
    - `kcp_pay_title`: 결제창 상단 문구
    - `shop_user_id`: 리스크 관리용 회원 ID (부정거래 탐지용, 상품권/휴대폰 결제 시 필수)
    - `site_name`: 카드사 다이렉트 호출 시 결제창에 표기될 상호명 (모바일 필수)
    - `disp_tax_yn`: 현금영수증 노출 여부 (Y/N/R/E)
    - `deli_term`: 에스크로 결제 예상 배송 소요일 (두 자리 수, 미입력 '00')

### bypass 파라미터 예시
```json
{
  "bypass": {
    "kcp_v2": {
      "site_logo": "https://portone.io/assets/portone.jpg",
      "skin_indx": 6,
      "shop_user_id": "user_id1",
      "site_name": "포트원 고객사"
    }
  }
}
```

---

## SDK 결제 - 유의사항

### 공통
- **paymentId 파라미터 내 한글, 특수문자 미지원**: 영문/숫자만 가능합니다.
- **결제창 표시 언어 지원 안내**: `locale` 파라미터 지원 (KO_KR, EN_US).
- **결제 통화 지원 안내**: `KRW`, `USD`(카드결제만) 지원.
- **부가세, 면세금액 직접 지정**: `taxFreeAmount`, `vatAmount` 사용 시 별도 계약 필요.
- **현금영수증 발급 유형**: 파라미터 제어 불가, 결제창 내에서 선택 해야 함.

### 카드 결제
- **카드사 다이렉트 호출 시 고정 할부 개월 수만 설정 가능**: `availableMonthList` 사용 시 에러 발생.
- **카드사 다이렉트 호출 지원 카드사**: 신한, 현대, 삼성, 농협, 하나, 롯데, 씨티, 우리, 비씨, 국민, 우체국, 광주, 새마을, 수협, 제주, 신협, 저축, KDB산업은행.
- **미지원 파라미터**: `useCardPoint` (자동 사용 가능), `useInstallment`, `useFreeInterestFromMall`.
- **필수 파라미터**: PC(특정 카드사), 모바일(전체) 다이렉트 호출 시 `bypass.kcp_v2.site_name` 필수.

### 간편 결제
- **허브형 지원**: KAKAOPAY, NAVERPAY, SAMSUNGPAY, SSGPAY, APPLEPAY, LPAY, TOSSPAY, PAYCO.
- **미지원 파라미터**: `useCardPoint`, `customerIdentifier`, `availablePayMethod`, `availableCards`, `useInstallment`, `useFreeInterestFromMall`.

### 계좌이체 & 가상계좌 결제
- **미지원 파라미터**: `bankCode`, `customerIdentifier`.
- **가상계좌 유의사항**: 고정식 미지원(회전식만 가능), `customer.name` 사용(입금자명), 발급 가능 은행 리스트 참고.

### 상품권 & 휴대폰 결제
- **상품권 종류**: BOOKNLIFE(도서문화), CULTURELAND(컬쳐랜드).
- **필수 파라미터**: `bypass.kcp_v2.shop_user_id` 필수 (리스크 관리).

### 에스크로 결제
- **필수 파라미터**: `products` (상품 정보).
- **권장 파라미터**: `bypass.kcp_v2.deli_term` (배송 소요일).

---

## SDK 빌링키 발급 요청하기
빌링키 발급 요청 시에는 `requestIssueBillingKey` 함수를 호출해야 합니다.

### SDK 빌링키 발급 요청 예시
```javascript
import * as PortOne from "@portone/browser-sdk/v2";

function requestIssueBillingKey() {
  PortOne.requestIssueBillingKey({
    storeId: "store-4ff4af41-85e3-4559-8eb8-0d08a2c6ceec",
    channelKey: "channel-key-3b37819a-1c72-4deb-a245-8c810af5403d",
    billingKeyMethod: "CARD",
    issueId: "test-issueId",
    issueName: "test-issueName",
    customer: {
      fullName: "포트원",
      phoneNumber: "010-0000-1234",
      email: "test@portone.io",
    },
  });
}
```

### 주요 파라미터
- **billingKeyMethod**: `CARD`로 고정 (KCP는 카드만 지원).
- **issueId**: 빌링키 발급 건 고유 ID (고객사 채번, KCP 필수).
- **issueName**: 결제창 표시 제목 (모바일 필수).
- **kcp_v2.batch_soc_choice**: `S`(주민번호), `C`(사업자번호) 고정 여부.

### 유의사항
- **제공 기간**: `offerPeriod` 중 `interval` 파라미터만 지원.
- **카드사 다이렉트 호출**: 미지원.

---

## API 수기(키인)결제 요청하기
`POST /payments/${PAYMENT_ID_HERE}/instant` API를 호출합니다.

### API 수기 결제 요청 예시
```javascript
const issueResponse = await axios({
  url: `https://api.portone.io/payments/${PAYMENT_ID_HERE}/instant`,
  method: "post",
  headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
  data: {
    channelKey: "channel-key-xxxx",
    orderName: "나이키 와플 트레이너 2 SD",
    amount: { total: 10000 },
    currency: "KRW",
    customer: { ... },
    method: {
      card: {
        credential: {
          number: "1234123400001234",
          expiryYear: "26",
          expiryMonth: "12",
          birthOrBusinessRegistrationNumber: "900101",
          passwordTwoDigits: "00",
        },
      },
    },
  },
});
```

---

## API 빌링키 발급 요청하기
`POST /billing-keys`를 호출합니다.

### API 빌링키 발급 요청 예시
```javascript
const issueResponse = await axios({
  url: "https://api.portone.io/billing-keys",
  method: "post",
  headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
  data: {
    channelKey: "channel-key-xxxx",
    customer: { id: "customer-1234" },
    method: {
      card: {
        credential: {
          number: "1111...",
          expiryMonth: "01",
          expiryYear: "20",
          birthOrBusinessRegistrationNumber: "900101", // KCP 필수
          passwordTwoDigits: "00", // KCP 필수
        },
      },
    },
  },
});
```

---

## API 빌링키 단건 결제 요청하기
`POST /payments/${PAYMENT_ID_HERE}/billing-key` API를 호출합니다.

### API 단건 결제 예시
```javascript
const response = await axios({
  url: `https://api.portone.io/payments/${PAYMENT_ID_HERE}/billing-key`,
  method: "post",
  headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
  data: {
    payment: {
      billingKey: "billing-key-1",
      orderName: "후불 결제",
      amount: { total: 10000 },
      currency: "KRW",
      customer: { ... },
    },
  },
});
```

---

## API 빌링키 예약/반복 결제 요청하기
`POST /payments/${PAYMENT_ID_HERE}/schedule` 를 이용하여 결제를 예약합니다.

### API 예약/반복 결제 예시
```javascript
const response = await axios({
  url: `https://api.portone.io/payments/${PAYMENT_ID_HERE}/schedule`,
  method: "post",
  headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
  data: {
    payment: {
      billingKey: "billing-key-1",
      orderName: "월간 이용권 정기결제",
      amount: { total: 10000 },
      currency: "KRW",
      customer: { ... },
    },
    timeToPay: "2023-01-01T00:00:00+09:00", // RFC 3339 형식
  },
});
```
