'use client';

import { useMemo } from 'react';
import { SearchResult } from '@/lib/types';
import { BarChart2, PieChart, MapPin, Navigation } from 'lucide-react';
import { getRankColor } from '@/lib/utils/rank-colors';

interface Props {
    results: SearchResult[];
    localResults?: SearchResult[];
    topRankThreshold?: number;
    gridDistance?: number;
}

export function SearchResultsOverview({ results, localResults, topRankThreshold = 3, gridDistance }: Props) {
    const stats = useMemo(() => {
        if (!results || results.length === 0) {
            return { averageRank: 0, topExposureShare: 0, totalPoints: 0, topExposureCount: 0, rankedCount: 0, visibilityRate: 0 };
        }

        const rankedResults = results.filter(r => r.rank !== null);
        const totalPoints = results.length;
        const rankedCount = rankedResults.length;

        let averageRank = 0;
        let topExposureCount = 0;

        if (rankedCount > 0) {
            const sum = rankedResults.reduce((acc, curr) => acc + (curr.rank as number), 0);
            averageRank = Math.round((sum / rankedCount) * 10) / 10;
            topExposureCount = rankedResults.filter(r => (r.rank as number) <= topRankThreshold).length;
        }

        // Share of top N out of *all scanned points*, not just ranked ones
        const topExposureShare = totalPoints > 0 ? Math.round((topExposureCount / totalPoints) * 100) : 0;
        const visibilityRate = totalPoints > 0 ? Math.round((rankedCount / totalPoints) * 100) : 0;

        return { averageRank, topExposureShare, totalPoints, topExposureCount, rankedCount, visibilityRate };
    }, [results, topRankThreshold]);

    // 지역명 키워드별 순위 (keyword → rank 매핑, 중복 키워드 시 첫 번째 사용)
    const localKeywordRanks = useMemo(() => {
        if (!localResults || localResults.length === 0) return [];
        const seen = new Set<string>();
        return localResults
            .filter(r => {
                if (seen.has(r.keyword)) return false;
                seen.add(r.keyword);
                return true;
            })
            .map(r => ({ keyword: r.keyword, rank: r.rank }));
    }, [localResults]);

    const hasLocal = localKeywordRanks.length > 0;

    if (results.length === 0 && !hasLocal) return null;

    return (
        <div className={`grid grid-cols-1 ${hasLocal ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-8`}>
            {/* Avg Rank */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">평균 순위</p>
                        <div className="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-md">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                            {stats.averageRank > 0 ? `${stats.averageRank}위` : '-'}
                        </h3>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        노출된 {stats.rankedCount}개 좌표 기준
                    </p>
                </div>
            </div>

            {/* Top Exposure */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">상위 노출률 (1~{topRankThreshold}위)</p>
                        <div className="text-blue-500 bg-blue-500/10 p-1.5 rounded-md">
                            <PieChart className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.topExposureShare}%</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        전체 {stats.totalPoints}개 좌표 중 {stats.topExposureCount}개가 상위 노출되었습니다.
                    </p>
                </div>
            </div>

            {/* Total Scan Points */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">분석 좌표</p>
                        <div className="text-purple-500 bg-purple-500/10 p-1.5 rounded-md">
                            <MapPin className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalPoints}개</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        전체 노출률: {stats.rankedCount}/{stats.totalPoints} ({stats.visibilityRate}%)
                    </p>
                    {gridDistance && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            분석 좌표 간격: {gridDistance * 1000}m
                        </p>
                    )}
                </div>
            </div>

            {/* Local Keyword Ranks (4번째 카드) */}
            {hasLocal && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-amber-200 dark:border-amber-700/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">지역명 키워드 순위</p>
                            <div className="text-amber-500 bg-amber-500/10 p-1.5 rounded-md">
                                <Navigation className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {localKeywordRanks.map(({ keyword, rank }) => (
                                <div key={keyword} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate mr-2">
                                        {keyword}
                                    </span>
                                    {rank !== null && rank > 0 ? (
                                        <span
                                            className="px-2 py-0.5 rounded text-xs text-white font-bold shrink-0"
                                            style={{ backgroundColor: getRankColor(rank) }}
                                        >
                                            {rank}위
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 font-bold shrink-0">
                                            미노출
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                            좌표 무관 · 단일 순위
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
