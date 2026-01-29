'use client';

import { Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { UserCredits } from '@/lib/types';

export function WalletLabel() {
    const [credits, setCredits] = useState<UserCredits | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCredits = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('user_credits')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setCredits(data as UserCredits);
            }
            setLoading(false);
        };

        fetchCredits();
    }, []);

    if (loading) return <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />;
    if (!credits) return null;

    const totalPoints = (credits.subscription_balance || 0) + (credits.cash_balance || 0);

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
            <Coins className="w-4 h-4" />
            <span className="text-sm font-semibold">{totalPoints.toLocaleString()} P</span>
        </div>
    );
}
