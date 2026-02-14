'use client'

import { useState } from 'react'
import { AverageRankCard } from '@/components/results/AverageRankCard'
import { KeywordTabs } from '@/components/results/KeywordTabs'
import { NaverRankHeatmap } from '@/components/naver/NaverRankHeatmap'
import { CompetitorSelector } from '@/components/results/CompetitorSelector'
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
            {/* Average Rank Card */}
            <AverageRankCard results={filteredResults} />

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
                <div className="space-y-4 mt-8">
                    <h2 className="text-lg font-bold text-gray-900">⚔️ 경쟁사 비교 분석</h2>

                    <CompetitorSelector
                        competitors={competitors}
                        selectedId={selectedCompetitorId}
                        onSelect={setSelectedCompetitorId}
                        maxCompetitors={maxCompetitors}
                    />

                    {selectedCompetitor && (
                        <NaverCompetitorComparisonMap
                            center={{ lat: search.place_lat, lng: search.place_lng }}
                            results={results}
                            selectedKeyword={selectedKeyword}
                            competitorPlaceId={selectedCompetitor.place_id}
                            competitorName={selectedCompetitor.place_name}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
