'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import {
    isSubscribed as checkSubscribed,
    canAccessPlatform as checkPlatform,
    getMaxGridSize,
    getAllowedGridSizes as getGridSizes,
    canManageCompetitors as checkCompetitors,
    getMaxKeywords,
    getMaxCompetitors,
    getPlanDisplayName,
} from '@/lib/utils/subscription';

interface SubscriptionData {
    planId: string;
    isSubscribed: boolean;
    remainingTicketsNaver: number;
    remainingTicketsGoogle: number;
    onboardingCompleted: boolean;
    loading: boolean;
}

/**
 * 클라이언트 컴포넌트에서 구독 상태를 조회하는 훅
 * Supabase에서 user_subscriptions를 실시간 조회
 */
export function useSubscription(): SubscriptionData & {
    canAccessPlatform: (platform: 'naver' | 'google') => boolean;
    getAllowedGridSizes: () => number[];
    canManageCompetitors: () => boolean;
    getMaxKeywords: (platform: 'naver' | 'google') => number;
    getMaxCompetitors: (platform: 'naver' | 'google') => number;
    getPlanDisplayName: () => string;
} {
    const [data, setData] = useState<SubscriptionData>({
        planId: 'free',
        isSubscribed: false,
        remainingTicketsNaver: 0,
        remainingTicketsGoogle: 0,
        onboardingCompleted: false,
        loading: true,
    });

    useEffect(() => {
        const fetchSubscription = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setData(prev => ({ ...prev, loading: false }));
                return;
            }

            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('plan_id, remaining_tickets_naver, remaining_tickets_google, onboarding_completed')
                .eq('user_id', user.id)
                .single();

            if (sub) {
                setData({
                    planId: sub.plan_id || 'free',
                    isSubscribed: checkSubscribed(sub.plan_id || 'free'),
                    remainingTicketsNaver: sub.remaining_tickets_naver || 0,
                    remainingTicketsGoogle: sub.remaining_tickets_google || 0,
                    onboardingCompleted: sub.onboarding_completed || false,
                    loading: false,
                });
            } else {
                setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchSubscription();
    }, []);

    return {
        ...data,
        canAccessPlatform: (platform: 'naver' | 'google') => checkPlatform(data.planId, platform),
        getAllowedGridSizes: () => getGridSizes(data.planId),
        canManageCompetitors: () => checkCompetitors(data.planId),
        getMaxKeywords: (platform: 'naver' | 'google') => getMaxKeywords(data.planId, platform),
        getMaxCompetitors: (platform: 'naver' | 'google') => getMaxCompetitors(data.planId, platform),
        getPlanDisplayName: () => getPlanDisplayName(data.planId),
    };
}
