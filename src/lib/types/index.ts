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
    local_keywords?: string[]  // 지역명 키워드 (예: '홍대 카페') — grid_index=-1로 저장
    grid_points: GridPoint[]
    grid_distance: number
    distance_unit: 'km' | 'mile'
    status: 'pending' | 'processing' | 'completed' | 'failed'
    platform?: 'google' | 'naver'  // 기본값: 'google'
    report_type?: 'daily' | 'weekly' | 'realtime' | 'welcome'  // 리포트 유형 (daily=네이버 매일, weekly=구글 주간)
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
    competitor_ranks?: Record<string, number> | null
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

// ============================================================
// Pricing System Interfaces
// ============================================================

/** @deprecated v1 요금제 — PlanV2로 교체 예정 */
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

/** v2 요금제 (티켓 기반: starter/pro/premium) */
export interface PlanV2 {
    id: 'free' | 'starter' | 'pro' | 'premium';
    name: string;
    price: number;
    max_grid_size: number;
    max_keywords_naver: number;
    max_keywords_google: number;
    monthly_tickets_naver: number;
    monthly_tickets_google: number;
    max_competitors: number;
    channels: string;  // 'naver' | 'naver+google'
    place_lock: boolean;
    created_at: string;
}

/** @deprecated v1 지갑 — UserSubscription으로 교체 예정 */
export interface UserCredits {
    user_id: string;
    subscription_balance: number;
    cash_balance: number;
    plan_id: string;
    updated_at: string;
}

/** v2 구독 정보 (티켓 기반) */
export interface UserSubscription {
    user_id: string;
    plan_id: string;
    phone: string | null;
    remaining_tickets_naver: number;
    remaining_tickets_google: number;
    onboarding_completed: boolean;
    welcome_report_sent: boolean;
    current_period_start: string;
    current_period_end: string;
    created_at: string;
    updated_at: string;
}

export interface ManagedPlace {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';
    place_id: string;
    place_name?: string;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
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

/** 관리 키워드 (30일 락) */
export interface ManagedKeyword {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';
    keyword: string;
    keyword_type?: 'industry' | 'local';  // 'industry'=업종, 'local'=지역명 (기본값: 'industry')
    locked_until: string;
    created_at: string;
}

export interface SearchSchedule {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';
    place_id: string;
    place_name: string;
    keywords: string[];
    local_keywords?: string[];    // 지역명 키워드 (cron 자동 리포트용)
    grid_config: GridPoint[];
    grid_distance?: number;       // NEW: 그리드 간격
    distance_unit?: 'km' | 'mile'; // NEW: 거리 단위
    crawling_days: number[];      // 기존 유지 (하위 호환)
    crawling_day?: number;        // NEW: 주 1회 단일 요일
    crawling_time: string;
    is_active: boolean;
    last_run_at?: string;
    created_at: string;
}

/** 알림톡 수신 스케줄 (검색 스케줄과 분리) */
export interface NotificationSchedule {
    id: string;
    user_id: string;
    search_schedule_id: string;
    is_immediate: boolean;
    notify_day?: number;   // 0-6 (is_immediate=false일 때)
    notify_time?: string;  // (is_immediate=false일 때)
    created_at: string;
}

/** 알림톡 발송 이력 */
export interface NotificationLog {
    id: string;
    user_id: string;
    search_id: string | null;
    type: 'welcome' | 'daily' | 'weekly' | 'realtime';
    status: 'pending' | 'sent' | 'failed';
    sent_via: string;  // 'solapi'
    error_message?: string | null;
    sent_at?: string | null;
    created_at: string;
}

/** 티켓 이력 (credit_ledger 대체) */
export interface TicketLedger {
    id: string;
    user_id: string;
    platform: 'naver' | 'google';
    amount: number;  // -1: 사용, +1: 환불, +N: 충전
    type: 'usage' | 'refund' | 'monthly_reset' | 'welcome_bonus';
    description?: string | null;
    search_id?: string | null;
    created_at: string;
}

