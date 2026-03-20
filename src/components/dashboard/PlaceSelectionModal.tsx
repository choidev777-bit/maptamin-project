'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NaverPlaceSearchInput } from '@/components/search/NaverPlaceSearchInput'
import { PlaceSearchInput } from '@/components/search/PlaceSearchInput'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Place } from '@/lib/types'

interface Props {
    isOpen: boolean
    onClose: () => void
    platform: 'naver' | 'google'
    onConfirm: (place: Place) => Promise<void>
    isCompetitor?: boolean  // Optional: true for competitor search
    isPlaceLockExempt?: boolean // Optional: true이면 30일 락 경고 숨김 (프리미엄)
}

export function PlaceSelectionModal({ isOpen, onClose, platform, onConfirm, isCompetitor = false, isPlaceLockExempt = false }: Props) {
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<'search' | 'confirm'>('search')

    const handleConfirm = async () => {
        if (!selectedPlace) return

        setIsSubmitting(true)
        try {
            await onConfirm(selectedPlace)
            reset()
            onClose()
        } catch (error) {
            console.error('Failed to confirm place:', error)
            alert('설정에 실패했습니다. 다시 시도해주세요.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const reset = () => {
        setSelectedPlace(null)
        setStep('search')
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'search' ? '매장 검색' : '선택 확인'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'search'
                            ? isCompetitor
                                ? '경쟁사의 매장을 검색하세요.'
                                : `${platform === 'naver' ? '네이버' : '구글'} 지도에 등록된 사장님의 매장을 검색하세요.`
                            : '선택한 매장이 맞는지 확인해주세요.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 'search' ? (
                        <div className="space-y-4">
                            {platform === 'naver' ? (
                                <NaverPlaceSearchInput
                                    onPlaceSelect={(place) => {
                                        setSelectedPlace(place)
                                        setStep('confirm')
                                    }}
                                    selectedPlace={selectedPlace}
                                />
                            ) : (
                                <GoogleMapsProvider>
                                    <PlaceSearchInput
                                        onPlaceSelect={(place) => {
                                            setSelectedPlace(place)
                                            setStep('confirm')
                                        }}
                                        selectedPlace={selectedPlace}
                                    />
                                </GoogleMapsProvider>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h4 className="font-semibold text-gray-900">{selectedPlace?.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{selectedPlace?.address}</p>
                            </div>

                            {!isCompetitor && !isPlaceLockExempt && (
                                <div className="p-4 bg-red-50 rounded-lg flex items-start gap-3 border border-red-100">
                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-medium text-red-900 text-sm">주의: 30일간 변경 불가</h5>
                                        <p className="text-sm text-red-700 mt-1">
                                            한 번 설정하면 데이터의 정확성을 위해 30일 동안 변경할 수 없습니다. 정말 이 매장이 맞나요?
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={step === 'search' ? handleClose : () => setStep('search')} disabled={isSubmitting}>
                        {step === 'search' ? '취소' : '다시 검색'}
                    </Button>
                    {step === 'confirm' && (
                        <Button onClick={handleConfirm} disabled={isSubmitting} className={platform === 'naver' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-500 hover:bg-blue-600'}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                '확인 및 저장'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
