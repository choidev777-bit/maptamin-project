/**
 * PortOne 결제 관련 공유 타입 정의
 */

/**
 * 결제 수단 선택 타입
 * - 'card': 신용/체크카드 (NHN KCP 채널)
 * - 'kakaopay': 카카오페이 (카카오페이 전용 채널, payMethod: EASY_PAY)
 */
export type PaymentMethod = 'card' | 'kakaopay'
