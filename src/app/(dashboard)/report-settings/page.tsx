import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportSettingsContent } from './ReportSettingsContent'
import { isSubscribed, canAccessPlatform, getAllowedGridSizes } from '@/lib/utils/subscription'

export const dynamic = 'force-dynamic'

export default async function ReportSettingsPage() {
    const supabase = await createClient()

    // 1. 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 2. 구독 정보 조회
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, phone')
        .eq('user_id', user.id)
        .single()

    const planId = subscription?.plan_id || 'free'
    const subscribed = isSubscribed(planId)
    const canGoogle = canAccessPlatform(planId, 'google')
    const allowedGridSizes = getAllowedGridSizes(planId)

    // 3. 유료 사용자: 스케줄 + 매장 + 키워드 조회
    let naverSchedule = null
    let googleSchedule = null
    let naverPlace = null
    let googlePlace = null
    let naverKeywords: string[] = []
    let googleKeywords: string[] = []

    if (subscribed) {
        const [
            naverScheduleRes, googleScheduleRes,
            naverPlaceRes, googlePlaceRes,
            naverKeywordsRes, googleKeywordsRes,
        ] = await Promise.all([
            supabase
                .from('search_schedules')
                .select('*')
                .eq('user_id', user.id)
                .eq('platform', 'naver')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            canGoogle
                ? supabase
                    .from('search_schedules')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('platform', 'google')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            supabase
                .from('managed_places')
                .select('place_id, place_name, lat, lng')
                .eq('user_id', user.id)
                .eq('platform', 'naver')
                .maybeSingle(),
            canGoogle
                ? supabase
                    .from('managed_places')
                    .select('place_id, place_name, lat, lng')
                    .eq('user_id', user.id)
                    .eq('platform', 'google')
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            supabase
                .from('managed_keywords')
                .select('keyword')
                .eq('user_id', user.id)
                .eq('platform', 'naver'),
            canGoogle
                ? supabase
                    .from('managed_keywords')
                    .select('keyword')
                    .eq('user_id', user.id)
                    .eq('platform', 'google')
                : Promise.resolve({ data: null }),
        ])

        naverSchedule = naverScheduleRes.data
        googleSchedule = googleScheduleRes.data
        naverPlace = naverPlaceRes.data
        googlePlace = googlePlaceRes.data
        naverKeywords = (naverKeywordsRes.data || []).map((k: { keyword: string }) => k.keyword)
        googleKeywords = (googleKeywordsRes.data || []).map((k: { keyword: string }) => k.keyword)
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <ReportSettingsContent
                planId={planId}
                subscribed={subscribed}
                canGoogle={canGoogle}
                allowedGridSizes={allowedGridSizes}
                phone={subscription?.phone || ''}
                naverSchedule={naverSchedule}
                googleSchedule={googleSchedule}
                naverPlace={naverPlace}
                googlePlace={googlePlace}
                naverKeywords={naverKeywords}
                googleKeywords={googleKeywords}
            />
        </div>
    )
}
