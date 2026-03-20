'use client';

import { useMemo } from 'react';
import { SearchResult } from '@/lib/types';
import { BarChart2, PieChart, MapPin, Info } from 'lucide-react';
import { getRankColor } from '@/lib/utils/rank-colors';

interface Props {
    results: SearchResult[];
    localResults?: SearchResult[];
    topRankThreshold?: number;
    gridDistance?: number;
    unrankedPenalty?: number;
    variant?: 'emerald' | 'blue';
}

export function SearchResultsOverview({ results, localResults, topRankThreshold = 3, gridDistance, unrankedPenalty = 71, variant = 'emerald' }: Props) {
    const stats = useMemo(() => {
        if (!results || results.length === 0) {
            return { averageRank: 0, topExposureShare: 0, totalPoints: 0, topExposureCount: 0, rankedCount: 0, visibilityRate: 0 };
        }

        const rankedResults = results.filter(r => r.rank !== null);
        const totalPoints = results.length;
        const rankedCount = rankedResults.length;

        const UNRANKED_PENALTY = unrankedPenalty;
        let averageRank = 0;
        let topExposureCount = 0;

        if (totalPoints > 0) {
            const rankedSum = rankedResults.reduce((acc, curr) => acc + (curr.rank as number), 0);
            const unrankedCount = totalPoints - rankedCount;
            const totalSum = rankedSum + UNRANKED_PENALTY * unrankedCount;
            averageRank = Math.round((totalSum / totalPoints) * 10) / 10;
            topExposureCount = rankedResults.filter(r => (r.rank as number) <= topRankThreshold).length;
        }

        // Share of top N out of *all scanned points*, not just ranked ones
        const topExposureShare = totalPoints > 0 ? Math.round((topExposureCount / totalPoints) * 100) : 0;
        const visibilityRate = totalPoints > 0 ? Math.round((rankedCount / totalPoints) * 100) : 0;

        return { averageRank, topExposureShare, totalPoints, topExposureCount, rankedCount, visibilityRate };
    }, [results, topRankThreshold, unrankedPenalty]);

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
        <div className="space-y-6 mb-8">
            {/* 통계 카드 3개 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Avg Rank */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-visible group">
                    {/* 장식 원 — overflow-hidden 레이어로 카드 경계 내 클리핑, 툴팁은 외부 overflow-visible로 표시 */}
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${variant === 'blue' ? 'bg-blue-500/5' : 'bg-emerald-500/5'}`}></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">평균 순위</p>
                            <div className={`p-1.5 rounded-md ${variant === 'blue' ? 'text-blue-500 bg-blue-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                                <BarChart2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                                {stats.averageRank > 0 ? `${stats.averageRank}위` : '-'}
                            </h3>
                            {stats.totalPoints > stats.rankedCount && stats.averageRank > 0 && (
                                <div className="relative group/tip">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-20">
                                        {`순위권 외 좌표는 ${unrankedPenalty}위로 처리하여 계산한 값입니다.`}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            전체 {stats.totalPoints}개 좌표 기준
                        </p>
                    </div>
                </div>

                {/* Top Exposure */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${variant === 'blue' ? 'bg-blue-500/5' : 'bg-emerald-500/5'}`}></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">상위 노출률 (1~{topRankThreshold}위)</p>
                            <div className={`p-1.5 rounded-md ${variant === 'blue' ? 'text-blue-500 bg-blue-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
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
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${variant === 'blue' ? 'bg-blue-500/5' : 'bg-emerald-500/5'}`}></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">분석 좌표</p>
                            <div className={`p-1.5 rounded-md ${variant === 'blue' ? 'text-blue-500 bg-blue-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
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
            </div>

            {/* 지역명 키워드 순위 — 별도 행, 가로 나열 */}
            {hasLocal && (
                <div
                    className="bg-white dark:bg-gray-800 px-6 py-5 rounded-xl border shadow-sm relative overflow-hidden"
                    style={{
                        borderColor: '#00A87A',
                        boxShadow: '0 0 0 1px #00A87A33, 0 0 12px #00C89622, 0 0 24px #00C89610',
                    }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <p className="text-gray-600 dark:text-gray-300 font-semibold text-base">지역명 키워드 순위</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {localKeywordRanks.map(({ keyword, rank }) => (
                            <div
                                key={keyword}
                                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{keyword}</span>
                                {rank !== null && rank > 0 ? (
                                    <span
                                        className="px-2 py-0.5 rounded text-xs text-white font-bold shrink-0"
                                        style={{ backgroundColor: getRankColor(rank) }}
                                    >
                                        {rank}위
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400 font-bold shrink-0">
                                        미노출
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
