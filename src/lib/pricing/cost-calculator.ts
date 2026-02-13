/**
 * v2 티켓 기반 검증 유틸리티
 * - 실시간 진단: 1회 실행 = 1티켓 (키워드/그리드 수 무관)
 * - 주간 리포트 / 웰컴 리포트: 티켓 미차감 (무료)
 */
export class CostCalculator {
    /**
     * 티켓 사용 가능 여부 확인
     */
    static canUseTicket(remainingTickets: number): boolean {
        return remainingTickets > 0;
    }

    /**
     * 그리드 크기 검증
     * @throws 플랜 허용 범위 초과 시 에러
     */
    static validateGridSize(gridSize: number, maxGridSize: number): void {
        if (gridSize > maxGridSize) {
            throw new Error(
                `현재 요금제는 최대 ${maxGridSize}×${maxGridSize} 그리드까지 지원합니다.`
            );
        }
    }

    /**
     * 키워드 수 검증
     * @throws 플랜 허용 범위 초과 시 에러
     */
    static validateKeywordCount(count: number, maxCount: number): void {
        if (count > maxCount) {
            throw new Error(
                `현재 요금제는 최대 ${maxCount}개 키워드까지 지원합니다. (현재 ${count}개)`
            );
        }
    }

    /**
     * 채널 접근 권한 검증
     * @throws 허용되지 않은 플랫폼 접근 시 에러
     */
    static validateChannel(
        platform: 'naver' | 'google',
        channels: string
    ): void {
        if (platform === 'google' && channels !== 'naver+google') {
            throw new Error(
                '현재 요금제에서 구글 지도를 지원하지 않습니다. Premium으로 업그레이드하세요.'
            );
        }
    }
}
