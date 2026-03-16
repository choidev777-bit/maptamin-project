'use client';

import { useMemo } from 'react';
import { SearchResult } from '@/lib/types';
import { BarChart2, PieChart, MapPin } from 'lucide-react';

interface Props {
    results: SearchResult[];
    topRankThreshold?: number;
    gridDistance?: number;
}

export function SearchResultsOverview({ results, topRankThreshold = 3, gridDistance }: Props) {
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

    if (results.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>
    );
}
