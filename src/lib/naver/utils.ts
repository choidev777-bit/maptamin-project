/**
 * 네이버 스크래퍼 유틸리티 함수들
 */

/**
 * 비즈니스명 유사도 비교 (부분 일치 허용)
 * 
 * @param name1 비교할 첫 번째 이름
 * @param name2 비교할 두 번째 이름
 * @returns 유사도 일치 여부
 * 
 * @example
 * isBusinessMatch("스타벅스 강남점", "스타벅스") // true
 * isBusinessMatch("맥도날드", "맥도날드 서울시청점") // true
 * isBusinessMatch("A & B", "A&B") // true
 */
/**
 * HTML Entity 디코딩 (ex: &amp; -> &)
 */
function decodeHTMLEntities(text: string): string {
    if (!text) return text;

    // 자주 사용되는 HTML Entity 처리
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' '
    };

    return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, match => entities[match] || match);
}

/**
 * 비즈니스명 유사도 비교 (부분 일치 허용)
 * 
 * @param name1 비교할 첫 번째 이름
 * @param name2 비교할 두 번째 이름
 * @returns 유사도 일치 여부
 * 
 * @example
 * isBusinessMatch("스타벅스 강남점", "스타벅스") // true
 * isBusinessMatch("맥도날드", "맥도날드 서울시청점") // true
 * isBusinessMatch("A & B", "A&B") // true
 */
export function isBusinessMatch(name1: string, name2: string): boolean {
    if (!name1 || !name2) return false;

    // 정규화: HTML 디코딩 -> 소문자 변환 -> 공백 제거 -> 특수문자 제거 (한글, 영문, 숫자만 남김)
    const normalize = (s: string) => {
        const decoded = decodeHTMLEntities(s);
        return decoded.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
    };

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // 빈 문자열이면 false
    if (n1.length === 0 || n2.length === 0) return false;

    return n1.includes(n2) || n2.includes(n1);
}
