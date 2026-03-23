/**
 * 실시간 진단 티켓 가격 관련 상수 및 유틸리티
 * - 네이버/구글 동일 가격
 * - VAT 포함
 * TODO(PG연동): 결제 시스템 연동 후 이 모듈의 가격 상수를 결제 API에서도 참조
 */

/** 티켓 1장당 가격 (원, VAT 포함) */
export const TICKET_PRICE = 1000;

/**
 * 티켓 구매 총 금액 계산
 * @param quantity 구매 수량 (1 이상 정수)
 * @returns 총 금액 (원)
 * @throws 수량이 음수이거나 정수가 아닌 경우
 */
export function calculateTicketPrice(quantity: number): number {
    if (quantity < 0) {
        throw new Error('수량은 0 이상이어야 합니다.');
    }
    if (!Number.isInteger(quantity)) {
        throw new Error('수량은 정수여야 합니다.');
    }
    return quantity * TICKET_PRICE;
}

/**
 * 가격을 천 단위 콤마 형식으로 포맷
 * @param price 숫자 금액
 * @returns 포맷된 문자열 (예: "1,000")
 */
export function formatPrice(price: number): string {
    return price.toLocaleString('ko-KR');
}
