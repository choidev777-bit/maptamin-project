'use client'

import { useState } from 'react'
import { SearchResultsOverview } from '@/components/results/SearchResultsOverview'
import { KeywordTabs } from '@/components/results/KeywordTabs'
import { NaverRankHeatmap } from '@/components/naver/NaverRankHeatmap'
import { CompetitorComparisonPanel } from '@/components/results/CompetitorComparisonPanel'
import { NaverCompetitorComparisonMap } from '@/components/naver/NaverCompetitorComparisonMap'
import { Search, SearchResult, ManagedCompetitor } from '@/lib/types'

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

    // Filter results for selected keyword
    const filteredResults = results.filter(r => r.keyword === selectedKeyword)

    const selectedCompetitor = competitors.find(c => c.place_id === selectedCompetitorId)
    const isStarter = planId === 'starter'
    const maxCompetitors = planId === 'pro' ? 1 : 10

    return (
        <div className="space-y-6">
            <SearchResultsOverview results={filteredResults} topRankThreshold={5} />

            {/* Keyword Tabs */}
            <KeywordTabs
                keywords={search.keywords}
                results={results}
                onKeywordChange={setSelectedKeyword}
            />

            {/* Rank Heatmap - Now using Naver Maps! */}
            <NaverRankHeatmap
                center={{ lat: search.place_lat, lng: search.place_lng }}
                results={results}
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
                                myResults={filteredResults}
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
