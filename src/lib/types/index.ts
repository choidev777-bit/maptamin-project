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

// Pricing System Interfaces

export interface Plan {
    id: 'light' | 'basic' | 'pro';
    name: string;
    monthly_points: number;
    max_grid_size: number;
    limits: {
        places: number;
        competitors: number;
    };
}

export interface UserCredits {
    user_id: string;
    subscription_balance: number;
    cash_balance: number;
    plan_id: string;
    updated_at: string;
}

export interface ManagedPlace {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';  // Added
    place_id: string;
    place_name?: string;
    address?: string | null;       // Added
    lat?: number | null;           // Added
    lng?: number | null;           // Added
    locked_until: string;
    created_at: string;
}

export interface ManagedCompetitor {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';
    place_id: string;
    place_name: string;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    locked_until?: string | null;
    created_at: string;
}

export interface SearchSchedule {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';  // Added
    place_id: string;
    place_name: string;            // Added
    keywords: string[];
    grid_config: GridPoint[]; // Reusing GridPoint
    crawling_days: number[]; // [1, 3, 5]
    crawling_time: string; // '09:00:00'
    is_active: boolean;
    last_run_at?: string;
    created_at: string;
}
