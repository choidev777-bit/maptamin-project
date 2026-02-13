'use client';

import { Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface TicketInfo {
    remaining_tickets_naver: number;
    remaining_tickets_google: number;
}

export function WalletLabel() {
    const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubscription = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('remaining_tickets_naver, remaining_tickets_google')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setTicketInfo(data as TicketInfo);
            }
            setLoading(false);
        };

        fetchSubscription();
    }, []);

    if (loading) return <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />;
    if (!ticketInfo) return null;

    const totalTickets = (ticketInfo.remaining_tickets_naver || 0) + (ticketInfo.remaining_tickets_google || 0);

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            <Ticket className="w-4 h-4" />
            <span className="text-sm font-semibold">{totalTickets}장</span>
        </div>
    );
}
