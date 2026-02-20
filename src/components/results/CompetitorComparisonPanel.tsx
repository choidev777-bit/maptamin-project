'use client';

import { useMemo } from 'react';
import { SearchResult, ManagedCompetitor } from '@/lib/types';

interface Props {
    competitors: ManagedCompetitor[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    myResults: SearchResult[];
    maxCompetitors?: number;
    topRankThreshold?: number;
}

export function CompetitorComparisonPanel({
    competitors,
    selectedId,
    onSelect,
    myResults,
    topRankThreshold = 3,
}: Props) {
    // Calculate metrics for My Store
    const myStats = useMemo(() => {
        const ranked = myResults.filter(r => r.rank !== null);
        const total = myResults.length;

        let avg = 0;
        let topCount = 0;
        if (ranked.length > 0) {
            avg = ranked.reduce((acc, curr) => acc + (curr.rank as number), 0) / ranked.length;
            topCount = ranked.filter(r => (r.rank as number) <= topRankThreshold).length;
        }

        return {
            averageRank: ranked.length > 0 ? (Math.round(avg * 10) / 10).toFixed(1) : '-',
            topShare: total > 0 ? Math.round((topCount / total) * 100) : 0,
        };
    }, [myResults, topRankThreshold]);

    // Calculate metrics for Competitor by extracting rank from r.competitors using name matching
    const compStats = useMemo(() => {
        if (!selectedId) return { averageRank: '-', topShare: 0 };

        // 1. Find the selected competitor's name
        const selectedCompInfo = competitors.find(c => c.place_id === selectedId);
        if (!selectedCompInfo) return { averageRank: '-', topShare: 0 };

        const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        const targetName = normalize(selectedCompInfo.place_name);

        // 2. Iterate through all results to gather competitor ranks
        const compRanksFound: number[] = [];

        for (const r of myResults) {
            if (!r.competitors) continue;

            const match = r.competitors.find(c => normalize(c.name) === targetName);
            if (match && match.rank != null) {
                compRanksFound.push(match.rank);
            }
        }

        const total = myResults.length;
        let avg = 0;
        let topCount = 0;

        if (compRanksFound.length > 0) {
            const sum = compRanksFound.reduce((acc, rank) => acc + rank, 0);
            avg = sum / compRanksFound.length;
            topCount = compRanksFound.filter(rank => rank <= topRankThreshold).length;
        }

        return {
            averageRank: compRanksFound.length > 0 ? (Math.round(avg * 10) / 10).toFixed(1) : '-',
            topShare: total > 0 ? Math.round((topCount / total) * 100) : 0,
        };
    }, [myResults, selectedId, topRankThreshold, competitors]);

    if (competitors.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">경쟁사 비교 분석</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">핵심 지역 경쟁사와 내 매장의 순위 퍼포먼스를 비교해보세요.</p>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-2">
                    비교 대상 선택
                </label>
                <div className="relative">
                    <select
                        value={selectedId || ''}
                        onChange={(e) => onSelect(e.target.value)}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                        {competitors.map((c) => (
                            <option key={c.place_id} value={c.place_id}>
                                {c.place_name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-grow">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
                    <span>지표</span>
                    <span>내 매장 vs 경쟁사</span>
                </div>

                <div className="space-y-3">
                    {/* Average Rank */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">평균 순위</span>
                        <div className="flex gap-4">
                            <span className="text-sm font-bold text-emerald-500 w-12 text-right">{myStats.averageRank}</span>
                            <span className="text-sm text-gray-400 w-6 text-center">vs</span>
                            <span className="text-sm font-bold text-red-500 w-12 text-left">{compStats.averageRank}</span>
                        </div>
                    </div>

                    {/* Top Exposure Share */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">상위 노출률 (1~{topRankThreshold}위)</span>
                        <div className="flex gap-4">
                            <span className="text-sm font-bold text-emerald-500 w-12 text-right">{myStats.topShare}%</span>
                            <span className="text-sm text-gray-400 w-6 text-center">vs</span>
                            <span className="text-sm font-bold text-red-500 w-12 text-left">{compStats.topShare}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
