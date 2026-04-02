import { useState, useEffect } from 'react'

/**
 * 좌표(lat, lng)를 받아 행정동 이름을 반환하는 커스텀 훅
 * /api/reverse-geocode 엔드포인트를 호출합니다.
 *
 * @returns district - "마포구 서교동" 형태 문자열 또는 null
 * @returns isLoading - 로딩 중 여부
 */
export function useReverseGeocode(lat: number | null | undefined, lng: number | null | undefined) {
    const [district, setDistrict] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // 좌표가 없으면 초기화
        if (lat == null || lng == null) {
            setDistrict(null)
            setIsLoading(false)
            return
        }

        let cancelled = false
        setIsLoading(true)
        setDistrict(null)

        fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
            .then(res => res.json())
            .then(data => {
                if (!cancelled) {
                    setDistrict(data.district ?? null)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setDistrict(null)
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false)
                }
            })

        // cleanup: 모달 닫히거나 좌표 바뀌면 이전 요청 취소
        return () => {
            cancelled = true
        }
    }, [lat, lng])

    return { district, isLoading }
}
