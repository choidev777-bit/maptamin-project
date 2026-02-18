'use client';

import { Ticket, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSubscribed } from '@/lib/utils/subscription';

interface SubscriptionInfo {
    remaining_tickets_naver: number;
    remaining_tickets_google: number;
    plan_id: string;
}

export function WalletLabel() {
    const router = useRouter();
    const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubscription = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data } = await supabase
                .from('user_subscriptions')
                .select('remaining_tickets_naver, remaining_tickets_google, plan_id')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setSubInfo(data as SubscriptionInfo);
            }
            setLoading(false);
        };

        fetchSubscription();
    }, []);

    if (loading) return <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />;
    if (!subInfo) return null;

    const subscribed = isSubscribed(subInfo.plan_id);

    if (!subscribed) {
        return (
            <button
                onClick={() => router.push('/dashboard/upgrade')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
            >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">구독 필요</span>
            </button>
        );
    }

    const totalTickets = (subInfo.remaining_tickets_naver || 0) + (subInfo.remaining_tickets_google || 0);

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            <Ticket className="w-4 h-4" />
            <span className="text-sm font-semibold">{totalTickets}장</span>
        </div>
    );
}
