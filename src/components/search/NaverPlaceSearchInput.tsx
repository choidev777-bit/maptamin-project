'use client'

import * as React from 'react'
import { Search, Loader2, MapPin } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/use-debounce'

import { Place as GlobalPlace } from '@/lib/types'

/**
 * Type definition for a Place object returned by Naver API (Internal use)
 */
interface NaverPlaceItem {
    title: string
    address: string
    category: string
    mapx: string // Naver returns mapx/mapy usually? or lat/lng if processed.
    // The previous code had lat/lng, so assuming the API route normalizes it.
    lat: number
    lng: number
}

/**
 * Props for the NaverPlaceSearchInput component
 */
interface Props {
    onPlaceSelect: (place: GlobalPlace) => void
    selectedPlace?: { name: string; address: string } | null
}

/**
 * NaverPlaceSearchInput Component
 * 
 * A robust search input that fetches place data from Naver API.
 * Uses "Click Outside" pattern to manage dropdown state and a reference flag
 * to distinguish between user typing and programmatic updates.
 */
export function NaverPlaceSearchInput({ onPlaceSelect, selectedPlace }: Props) {
    // UI State
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState<NaverPlaceItem[]>([])
    const [loading, setLoading] = React.useState(false)

    // Performance: Debounce search query to reduce API calls (Vercel Best Practice)
    const debouncedQuery = useDebounce(query, 500)

    // Refs for DOM access and Logic control
    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const isUserTypingRef = React.useRef(false)

    // 1. Click Outside Handler (Replaces unstable onBlur)
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // If click is outside the wrapper, close the dropdown
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        // Use mousedown to capture event early, before other click handlers
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // 2. Search Effect (Controlled by isUserTypingRef)
    React.useEffect(() => {
        // Validation: Don't search for empty or very short queries
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults([])
            return
        }

        async function fetchPlaces() {
            setLoading(true)
            try {
                // Fetch data (Client-side fetching)
                const res = await fetch(`/api/naver/places/search?query=${encodeURIComponent(debouncedQuery)}`)
                if (!res.ok) throw new Error('Failed to fetch')

                const data = await res.json()
                const items = data.items || []

                setResults(items)

                // CRITICAL: Only open dropdown if the user was actually typing.
                // This prevents the dropdown from re-opening when we programmatically set the query on selection.
                if (isUserTypingRef.current && items.length > 0) {
                    setOpen(true)
                }
            } catch (error) {
                console.error('Search error:', error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }

        fetchPlaces()
    }, [debouncedQuery])

    // 3. User Interaction Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        isUserTypingRef.current = true // Flag: Change caused by user
        setQuery(e.target.value)
    }

    // Helper: Decode HTML Entities (Client-side version)
    const decodeHTMLEntities = (text: string) => {
        if (!text) return text
        const entities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' '
        }
        return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, match => entities[match] || match)
    }

    const handleSelect = (place: NaverPlaceItem) => {
        isUserTypingRef.current = false // Flag: Change caused by selection (programmatic)

        // Clean the title before using it
        const cleanTitle = decodeHTMLEntities(place.title)

        // Generate a pseudo-ID if not present (Naver Search API doesn't return stable ID)
        // Using base64 of title + address as a consistent ID
        const generatedId = typeof window !== 'undefined'
            ? window.btoa(unescape(encodeURIComponent(`${cleanTitle}-${place.address}`)))
            : `${cleanTitle}-${place.address}`

        setQuery(cleanTitle)            // Update input with selected name
        setOpen(false)                  // Close dropdown immediately

        // Map to global Place interface expected by parent
        // Parent expects: { placeId, name, address, lat, lng }
        // We provide: { title, address, category, lat, lng } -> mapped
        onPlaceSelect({
            placeId: generatedId,
            name: cleanTitle,
            address: place.address,
            lat: place.lat,
            lng: place.lng
        })
    }

    return (
        <div ref={wrapperRef} className="relative w-full max-w-xl">
            {/* Input Section */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        // Re-open if we have results and input matches (user clicked back in)
                        if (results.length > 0 && query.length >= 2) {
                            setOpen(true)
                        }
                    }}
                    placeholder="입력"
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                {loading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                    </div>
                )}
            </div>

            {/* Dropdown Section */}
            {open && results.length > 0 && (
                <ul className="absolute z-[100] mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm divide-y divide-gray-100">
                    {results.map((place, index) => (
                        <li
                            key={`${place.title}-${index}`}
                            onClick={() => handleSelect(place)}
                            className="cursor-pointer hover:bg-emerald-50 relative px-4 py-3 flex items-start gap-3 transition-colors"
                        >
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center text-sm font-medium text-gray-900">
                                    <span className="truncate">{decodeHTMLEntities(place.title)}</span>
                                    <span className="ml-2 flex-shrink-0 text-xs text-gray-400 font-normal border border-gray-200 rounded px-1.5 py-0.5">
                                        {place.category}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {place.address}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Selected Info Preview (Only when closed) */}
            {selectedPlace && !open && !loading && (
                <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-emerald-900">{selectedPlace.name}</p>
                        <p className="text-sm text-emerald-700">{selectedPlace.address}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
