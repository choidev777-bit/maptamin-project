'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { SearchResultsOverview } from '@/components/results/SearchResultsOverview'
import { KeywordTabs } from '@/components/results/KeywordTabs'
import { CompetitorComparisonPanel } from '@/components/results/CompetitorComparisonPanel'
import { Search, SearchResult, ManagedCompetitor } from '@/lib/types'

// Dynamic import로 지도 컴포넌트를 클라이언트에서만 렌더링 (SSR 줌아웃 버그 방지)
const NaverRankHeatmap = dynamic(
    () => import('@/components/naver/NaverRankHeatmap').then(mod => ({ default: mod.NaverRankHeatmap })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div style={{ width: '100%', height: '500px' }} className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <div className="text-gray-400 text-sm">지도 로딩 중...</div>
                </div>
            </div>
        )
    }
)

const NaverCompetitorComparisonMap = dynamic(
    () => import('@/components/naver/NaverCompetitorComparisonMap').then(mod => ({ default: mod.NaverCompetitorComparisonMap })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div style={{ width: '100%', height: '500px' }} className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <div className="text-gray-400 text-sm">지도 로딩 중...</div>
                </div>
            </div>
        )
    }
)

interface Props {
    search: Search
    results: SearchResult[]
    competitors: ManagedCompetitor[]
    planId: string
}

export function NaverResultsContent({ search, results, competitors, planId }: Props) {
    const [selectedKeyword, setSelectedKeyword] = useState<string>(search.keywords[0] || '')
    const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(
        competitors.length > 0 ? competitors[0].place_id : null
    )

    // ── 업종/지역명 결과 분리 ──
    const industryResults = results.filter(r => r.grid_index >= 0)
    const localResults = results.filter(r => r.grid_index === -1)

    // 업종 결과 중 선택된 키워드만 필터링 (기존 동작)
    const filteredIndustry = industryResults.filter(r => r.keyword === selectedKeyword)

    const selectedCompetitor = competitors.find(c => c.place_id === selectedCompetitorId)
    const isStarter = planId === 'starter'
    const maxCompetitors = planId === 'pro' ? 1 : 10

    return (
        <div className="space-y-6">
            <SearchResultsOverview
                results={filteredIndustry}
                localResults={localResults.length > 0 ? localResults : undefined}
                topRankThreshold={5}
                gridDistance={search.grid_distance}
            />

            {/* Keyword Tabs — 업종 결과만 전달 (지역명 혼입 방지) */}
            <KeywordTabs
                keywords={search.keywords}
                results={industryResults}
                onKeywordChange={setSelectedKeyword}
            />

            {/* Rank Heatmap — 업종 결과만 전달 */}
            <NaverRankHeatmap
                center={{ lat: search.place_lat, lng: search.place_lng }}
                results={industryResults}
                selectedKeyword={selectedKeyword}
            />

            {/* Competitor Comparison Section (hidden for Starter plan) */}
            {!isStarter && (
                <div className="mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Panel: Controls & List */}
                        <div className="lg:col-span-1">
                            <CompetitorComparisonPanel
                                competitors={competitors}
                                selectedId={selectedCompetitorId}
                                onSelect={setSelectedCompetitorId}
                                myResults={filteredIndustry}
                                maxCompetitors={maxCompetitors}
                                topRankThreshold={5}
                            />
                        </div>

                        {/* Right Panel: Split Map */}
                        <div className="lg:col-span-2">
                            {selectedCompetitor ? (
                                <NaverCompetitorComparisonMap
                                    center={{ lat: search.place_lat, lng: search.place_lng }}
                                    results={results}
                                    selectedKeyword={selectedKeyword}
                                    competitorPlaceId={selectedCompetitor.place_id}
                                    competitorName={selectedCompetitor.place_name}
                                />
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px] items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-400">비교할 경쟁사를 선택해주세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
