/**
 * 구독 관련 날짜/금액 계산 유틸
 *
 * @see PLAN_payment-system-fix.md Phase 5
 */

/**
 * 다음 결제일 계산 (월간 결제 전용)
 *
 * ⚠️ JavaScript Date.setMonth() 월말 오버플로우 방지 로직 포함
 * - 1월 31일 + 1개월 = 2월 28일 (평년) / 2월 29일 (윤년)
 * - 3월 31일 + 1개월 = 4월 30일
 * - setMonth()는 해당 월에 없는 날짜를 자동으로 다음 달로 넘김
 *   예: new Date('2026-01-31').setMonth(1) → 2026-03-03 (오버플로우!)
 *
 * @param fromDate 시작 날짜
 * @returns 다음 결제일 (1개월 후)
 */
export function calculateNextBillingDate(fromDate: Date): Date {
    const next = new Date(fromDate)

    const targetMonth = (next.getMonth() + 1) % 12
    // 12월이면 targetMonth=0이므로 연도도 증가해야 함
    const expectedYear = targetMonth === 0 ? next.getFullYear() + 1 : next.getFullYear()

    next.setMonth(next.getMonth() + 1)

    // 월말 오버플로우 감지 및 보정
    // 예: Jan 31 → setMonth(1) → Feb 31 → 실제로는 Mar 3 (오버플로우)
    if (next.getMonth() !== targetMonth || next.getFullYear() !== expectedYear) {
        next.setDate(0) // 이전 달의 마지막 날로 보정 (Feb 28/29)
    }

    return next
}
