'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Loader2 } from 'lucide-react'

interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

interface Props {
    onPlaceSelect: (place: Place) => void
    selectedPlace?: Place | null
}

export function PlaceSearchInput({ onPlaceSelect, selectedPlace }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const autocompleteRef = useRef<HTMLElement | null>(null)
    const placesLib = useMapsLibrary('places')

    // Stable callback ref
    const onPlaceSelectRef = useRef(onPlaceSelect)
    useEffect(() => {
        onPlaceSelectRef.current = onPlaceSelect
    }, [onPlaceSelect])

    useEffect(() => {
        if (!placesLib || !containerRef.current) return
        if (autocompleteRef.current) return

        const handleSelect = async (event: Event) => {
            console.log('=== Place selection event fired ===')

            const autocompleteElement = event.target as HTMLElement & {
                value?: string | { id?: string; displayName?: string; formattedAddress?: string; location?: { lat: () => number; lng: () => number } }
            }

            const value = autocompleteElement.value
            console.log('Element value:', value)
            console.log('Value type:', typeof value)

            if (!value) {
                console.log('No value found')
                return
            }

            // If value is an object with place properties, use it directly
            if (typeof value === 'object' && value.location) {
                console.log('Value is a Place object with location')
                onPlaceSelectRef.current({
                    placeId: value.id || '',
                    name: value.displayName || '',
                    address: value.formattedAddress || '',
                    lat: value.location.lat(),
                    lng: value.location.lng(),
                })
                return
            }

            // If value is a string, use Text Search to find the place
            const searchText = typeof value === 'string' ? value : String(value)
            console.log('Searching for place:', searchText)

            try {
                // Use the new Place.searchByText API
                const Place = google.maps.places.Place
                const { places } = await Place.searchByText({
                    textQuery: searchText,
                    fields: ['id', 'displayName', 'formattedAddress', 'location'],
                    maxResultCount: 1,
                })

                console.log('Search results:', places)

                if (places && places.length > 0) {
                    const place = places[0]
                    console.log('Found place:', place)

                    if (place.location) {
                        onPlaceSelectRef.current({
                            placeId: place.id || '',
                            name: place.displayName || '',
                            address: place.formattedAddress || '',
                            lat: place.location.lat(),
                            lng: place.location.lng(),
                        })
                    }
                }
            } catch (error) {
                console.error('Error searching for place:', error)
            }
        }

        // Create the autocomplete element
        const autocomplete = document.createElement('gmp-place-autocomplete')
        autocomplete.setAttribute('placeholder', '입력')

        // Listen for selection events
        autocomplete.addEventListener('gmp-placeselect', handleSelect)
        autocomplete.addEventListener('gmp-select', handleSelect)

        // Store ref and append
        autocompleteRef.current = autocomplete
        containerRef.current.appendChild(autocomplete)

        return () => {
            autocomplete.removeEventListener('gmp-placeselect', handleSelect)
            autocomplete.removeEventListener('gmp-select', handleSelect)
        }
    }, [placesLib])

    if (!placesLib) {
        return (
            <div className="w-full px-4 py-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-gray-500">지도 라이브러리 로딩 중...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div
                ref={containerRef}
                className="place-autocomplete-wrapper"
            />
            <style jsx global>{`
        .place-autocomplete-wrapper {
          width: 100%;
        }
        .place-autocomplete-wrapper gmp-place-autocomplete {
          width: 100%;
          display: block;
          border: 1px solid #d1d5db;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .place-autocomplete-wrapper input {
          width: 100%;
          padding: 1rem;
          border: none !important;
          border-radius: 0.75rem;
          font-size: 1.125rem;
          transition: all 0.15s ease;
          background: white;
        }
        .place-autocomplete-wrapper gmp-place-autocomplete:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .place-autocomplete-wrapper input:focus {
          outline: none;
        }
        .place-autocomplete-wrapper input::placeholder {
          color: #9ca3af;
        }
      `}</style>

            {selectedPlace && (
                <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{selectedPlace.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{selectedPlace.address}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
