'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
    search: {
        place_name: string;
        place_address: string | null;
        created_at: string;
        status: string;
        platform: string;
    };
}

export function NaverResultsHeader({ search }: Props) {
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        setFormattedDate(
            format(new Date(search.created_at), 'yyyy년 M월 d일 • a h시 mm분', { locale: ko })
        );
    }, [search.created_at]);

    return (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Platform Badge */}
                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        네이버 지도
                    </span>

                    {/* Timestamp */}
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        검색일시: {formattedDate}
                    </span>
                </div>

                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                        {search.place_name}
                    </h2>
                    {search.place_address && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm font-medium">{search.place_address}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
