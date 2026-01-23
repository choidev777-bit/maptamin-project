'use client'

import * as React from 'react'

// ========================================
// Types
// ========================================
export interface NaverMapMarker {
    id: string
    lat: number
    lng: number
    label?: string
    color?: string
    onClick?: () => void
}

interface NaverMapProps {
    center: { lat: number; lng: number }
    zoom?: number
    markers?: NaverMapMarker[]
    className?: string
    onMapClick?: (lat: number, lng: number) => void
    showZoomControl?: boolean
}

// ========================================
// Script Loading Singleton
// ========================================
let isScriptLoading = false
let isScriptLoaded = false
const loadCallbacks: (() => void)[] = []

function loadNaverMapsScript(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (isScriptLoaded && window.naver?.maps) {
            resolve()
            return
        }

        // Currently loading - queue callback
        if (isScriptLoading) {
            loadCallbacks.push(resolve)
            return
        }

        // Start loading
        isScriptLoading = true

        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
        script.async = true

        script.onload = () => {
            isScriptLoaded = true
            isScriptLoading = false
            resolve()
            // Resolve all queued callbacks
            loadCallbacks.forEach(cb => cb())
            loadCallbacks.length = 0
        }

        script.onerror = () => {
            isScriptLoading = false
            reject(new Error('Failed to load Naver Maps SDK'))
        }

        document.head.appendChild(script)
    })
}

// ========================================
// NaverMap Component
// ========================================
export function NaverMap({
    center,
    zoom = 15,
    markers = [],
    className = '',
    onMapClick,
    showZoomControl = true
}: NaverMapProps) {
    const mapContainerRef = React.useRef<HTMLDivElement>(null)
    const mapInstanceRef = React.useRef<naver.maps.Map | null>(null)
    const markersRef = React.useRef<naver.maps.Marker[]>([])

    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID

    // Initialize map
    React.useEffect(() => {
        if (!clientId) {
            setError('Naver Maps Client ID가 설정되지 않았습니다.')
            setIsLoading(false)
            return
        }

        let isMounted = true

        async function initMap() {
            try {
                await loadNaverMapsScript(clientId!)

                if (!isMounted || !mapContainerRef.current) return

                // Create map instance
                const mapOptions: naver.maps.MapOptions = {
                    center: new naver.maps.LatLng(center.lat, center.lng),
                    zoom,
                    zoomControl: showZoomControl,
                    zoomControlOptions: {
                        position: naver.maps.Position.TOP_RIGHT
                    },
                    mapDataControl: false,
                    scaleControl: true,
                    logoControl: true
                }

                const map = new naver.maps.Map(mapContainerRef.current, mapOptions)
                mapInstanceRef.current = map

                // Add click listener
                if (onMapClick) {
                    naver.maps.Event.addListener(map, 'click', (e: any) => {
                        const coord = e.coord
                        onMapClick(coord.lat(), coord.lng())
                    })
                }

                setIsLoading(false)
            } catch (err) {
                console.error('[NaverMap] Initialization error:', err)
                if (isMounted) {
                    setError('지도를 불러오는데 실패했습니다.')
                    setIsLoading(false)
                }
            }
        }

        initMap()

        return () => {
            isMounted = false
            // Clean up markers
            markersRef.current.forEach(marker => marker.setMap(null))
            markersRef.current = []
            // Destroy map
            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy()
                mapInstanceRef.current = null
            }
        }
    }, [clientId]) // Only run once on mount

    // Update center when props change
    React.useEffect(() => {
        if (mapInstanceRef.current && center) {
            mapInstanceRef.current.setCenter(new naver.maps.LatLng(center.lat, center.lng))
        }
    }, [center.lat, center.lng])

    // Update zoom when props change
    React.useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setZoom(zoom)
        }
    }, [zoom])

    // Update markers when props change
    React.useEffect(() => {
        if (!mapInstanceRef.current || !window.naver?.maps) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        // Add new markers
        markers.forEach((markerData) => {
            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(markerData.lat, markerData.lng),
                map: mapInstanceRef.current!,
                title: markerData.label || '',
                icon: markerData.color ? {
                    content: `
                        <div style="
                            width: 24px;
                            height: 24px;
                            background-color: ${markerData.color};
                            border: 2px solid white;
                            border-radius: 50%;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 10px;
                            font-weight: bold;
                        ">
                            ${markerData.label || ''}
                        </div>
                    `,
                    anchor: new naver.maps.Point(12, 12)
                } : undefined
            })

            if (markerData.onClick) {
                naver.maps.Event.addListener(marker, 'click', markerData.onClick)
            }

            markersRef.current.push(marker)
        })
    }, [markers])

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">지도 로딩 중...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
                <div className="text-center p-4">
                    <p className="text-red-500 font-medium">{error}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        환경 변수를 확인해주세요.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={mapContainerRef}
            className={`w-full h-full ${className}`}
            style={{ minHeight: '300px' }}
        />
    )
}
