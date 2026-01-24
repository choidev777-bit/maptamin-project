export interface GridPoint {
    row: number
    col: number
    lat: number
    lng: number
    enabled: boolean
}

export interface Search {
    id: string
    user_id: string
    place_id: string
    place_name: string
    place_address: string | null
    place_lat: number
    place_lng: number
    keywords: string[]
    grid_points: GridPoint[]
    grid_distance: number
    distance_unit: 'km' | 'mile'
    status: 'pending' | 'processing' | 'completed' | 'failed'
    platform?: 'google' | 'naver'  // 기본값: 'google'
    deleted_at?: string | null
    created_at: string
}

export interface SearchResult {
    id: string
    search_id: string
    keyword: string
    grid_index: number
    grid_lat: number
    grid_lng: number
    rank: number | null
    competitors: Competitor[] | null
    created_at: string
}

export interface Competitor {
    name: string
    rank: number
    place_id: string
}

export interface DailyUsage {
    id: string
    user_id: string
    usage_date: string
    search_count: number
    platform?: 'google' | 'naver'  // 기본값: 'google'
}

export interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}
