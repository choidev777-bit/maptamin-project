'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ManagedPlace, ManagedCompetitor } from '@/lib/types';
import { Check, ChevronsUpDown, Store, MapPin, Search } from 'lucide-react';

interface PlaceSelectorProps {
    onSelect: (placeId: string, type: 'place' | 'competitor', placeName?: string) => void;
    selectedPlaceId?: string;
}

export function PlaceSelector({ onSelect, selectedPlaceId }: PlaceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [myPlaces, setMyPlaces] = useState<ManagedPlace[]>([]);
    const [competitors, setCompetitors] = useState<ManagedCompetitor[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPlaces = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [placesRes, competitorsRes] = await Promise.all([
                supabase.from('managed_places').select('*').eq('user_id', user.id),
                supabase.from('managed_competitors').select('*').eq('user_id', user.id),
            ]);

            if (placesRes.data) setMyPlaces(placesRes.data as ManagedPlace[]);
            if (competitorsRes.data) setCompetitors(competitorsRes.data as ManagedCompetitor[]);

            setLoading(false);
        };

        fetchPlaces();

        // Click outside handler
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedItem =
        myPlaces.find(p => p.place_id === selectedPlaceId) ||
        competitors.find(c => c.place_id === selectedPlaceId);

    const filteredMyPlaces = myPlaces.filter(p =>
        (p.place_name || p.place_id).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredCompetitors = competitors.filter(p =>
        (p.place_name || p.place_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
                {selectedItem ? (
                    <div className="flex items-center gap-2">
                        {myPlaces.some(p => p.place_id === selectedItem.place_id) ?
                            <Store className="w-4 h-4 text-emerald-600" /> :
                            <MapPin className="w-4 h-4 text-orange-600" />
                        }
                        <span className="font-medium text-gray-900">{selectedItem.place_name || selectedItem.place_id}</span>
                    </div>
                ) : (
                    <span className="text-gray-500">분석할 매장를 선택하세요...</span>
                )}
                <ChevronsUpDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="sticky top-0 p-2 bg-white border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="매장 이름 검색..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="p-1">
                        {/* My Places Group */}
                        {filteredMyPlaces.length > 0 && (
                            <div className="mb-2">
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">내 매장 (My Places)</div>
                                {filteredMyPlaces.map((place) => (
                                    <button
                                        key={place.place_id}
                                        onClick={() => {
                                            onSelect(place.place_id, 'place', place.place_name);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className="w-full flex items-center justify-between px-2 py-2 text-sm text-left hover:bg-emerald-50 rounded-md transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Store className="w-4 h-4 text-emerald-600" />
                                            <span className="text-gray-900">{place.place_name || place.place_id}</span>
                                        </div>
                                        {selectedPlaceId === place.place_id && <Check className="w-4 h-4 text-emerald-600" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Competitors Group */}
                        {filteredCompetitors.length > 0 && (
                            <div className="mb-2">
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">경쟁사 (Competitors)</div>
                                {filteredCompetitors.map((place) => (
                                    <button
                                        key={place.place_id}
                                        onClick={() => {
                                            onSelect(place.place_id, 'competitor', place.place_name);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className="w-full flex items-center justify-between px-2 py-2 text-sm text-left hover:bg-orange-50 rounded-md transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-orange-600" />
                                            <span className="text-gray-900">{place.place_name || place.place_id}</span>
                                        </div>
                                        {selectedPlaceId === place.place_id && <Check className="w-4 h-4 text-orange-600" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredMyPlaces.length === 0 && filteredCompetitors.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
