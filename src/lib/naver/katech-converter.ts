/**
 * Naver mapx/mapy to WGS84 Coordinate Converter
 * 
 * 네이버 검색 API에서 반환하는 mapx, mapy 좌표를 위도, 경도로 변환합니다.
 * 
 * 네이버 API는 WGS84 좌표를 10^7 스케일로 반환합니다:
 * - mapx: 경도(longitude) × 10,000,000
 * - mapy: 위도(latitude) × 10,000,000
 * 
 * 예시:
 * - mapx: 1269701454 → longitude: 126.9701454
 * - mapy: 375287384 → latitude: 37.5287384
 */

const SCALE_FACTOR = 10000000; // 10^7

/**
 * Converts Naver mapx/mapy coordinates to WGS84 (Lat/Lng)
 * 네이버 검색 API에서 반환하는 mapx, mapy 좌표를 위도, 경도로 변환합니다.
 * 
 * @param mapx 네이버 mapx 좌표 (경도 × 10^7)
 * @param mapy 네이버 mapy 좌표 (위도 × 10^7)
 * @returns { lat: number, lng: number }
 */
export function convertKatechToWgs84(mapx: string | number, mapy: string | number): { lat: number; lng: number } {
    try {
        // Parse coordinates
        const x = typeof mapx === 'string' ? parseInt(mapx, 10) : Number(mapx);
        const y = typeof mapy === 'string' ? parseInt(mapy, 10) : Number(mapy);

        // Validation
        if (isNaN(x) || isNaN(y)) {
            console.warn('[KatechConverter] Invalid coordinates input:', mapx, mapy);
            return { lat: 0, lng: 0 };
        }

        // Convert from scaled WGS84 to actual WGS84
        const lng = x / SCALE_FACTOR;
        const lat = y / SCALE_FACTOR;

        // Sanity check: Korea should be roughly lat 33~43, lng 124~132
        if (lat < 30 || lat > 45 || lng < 120 || lng > 135) {
            console.warn('[KatechConverter] Coordinates outside Korea range:', { lat, lng });
            // Still return the values, might be edge cases
        }

        // Round to 6 decimal places (about 0.1m precision)
        return {
            lat: Math.round(lat * 1000000) / 1000000,
            lng: Math.round(lng * 1000000) / 1000000
        };

    } catch (error) {
        console.error('[KatechConverter] Fatal conversion error:', error);
        return { lat: 0, lng: 0 };
    }
}
