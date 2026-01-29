'use client'

import { useState } from 'react'
import { AverageRankCard } from '@/components/results/AverageRankCard'
import { KeywordTabs } from '@/components/results/KeywordTabs'
import { RankHeatmap } from '@/components/results/RankHeatmap'
import { Search, SearchResult } from '@/lib/types'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'
import { NaverRankHeatmap } from '@/components/naver/NaverRankHeatmap'

interface Props {
    search: Search
    results: SearchResult[]
}



export function ResultsContent({ search, results }: Props) {
    const [selectedKeyword, setSelectedKeyword] = useState<string>(search.keywords[0] || '')

    // Filter results for selected keyword
    const filteredResults = results.filter(r => r.keyword === selectedKeyword)

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

            {/* Rank Heatmap (Platform Specific) */}
            {search.platform === 'naver' ? (
                <NaverRankHeatmap
                    center={{ lat: search.place_lat, lng: search.place_lng }}
                    results={results}
                    selectedKeyword={selectedKeyword}
                />
            ) : (
                <GoogleMapsProvider>
                    <RankHeatmap
                        center={{ lat: search.place_lat, lng: search.place_lng }}
                        results={results}
                        selectedKeyword={selectedKeyword}
                    />
                </GoogleMapsProvider>
            )}
        </div>
    )
}
