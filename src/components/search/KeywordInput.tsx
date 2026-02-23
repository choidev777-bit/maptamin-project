'use client'

import { X, Plus } from 'lucide-react'

interface Props {
    keywords: string[]
    onChange: (keywords: string[]) => void
    maxKeywords?: number
    placeholder?: string
    platform?: 'naver' | 'google'
}

export function KeywordInput({
    keywords,
    onChange,
    maxKeywords = 3,
    placeholder,
    platform = 'naver'
}: Props) {
    const addKeyword = () => {
        if (keywords.length < maxKeywords) {
            onChange([...keywords, ''])
        }
    }

    const updateKeyword = (index: number, value: string) => {
        const updated = [...keywords]
        updated[index] = value
        onChange(updated)
    }

    const removeKeyword = (index: number) => {
        onChange(keywords.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            {keywords.map((keyword, index) => (
                <div key={index} className="flex gap-3">
                    <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                            {index + 1}.
                        </span>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => updateKeyword(index, e.target.value)}
                            placeholder={placeholder || '키워드 입력'}
                            className={`w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl outline-none transition-all ${platform === 'naver'
                                    ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                    : 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                } text-lg`}
                        />
                    </div>
                    {keywords.length > 1 && (
                        <button
                            onClick={() => removeKeyword(index)}
                            className="p-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="삭제"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            ))}

            {keywords.length < maxKeywords && (
                <button
                    onClick={addKeyword}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium py-2 transition-colors"
                >
                    <Plus size={20} />
                    키워드 추가 ({keywords.length}/{maxKeywords})
                </button>
            )}

            {platform === 'naver' ? (
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                        ⚠️ 네이버 키워드는 지역명을 빼고 입력해주세요!
                    </p>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        네이버 알고리즘에서는 상호명과 업종/서비스만 입력해야 정확한 순위 결과를 얻을 수 있습니다.
                    </p>
                    <div className="text-sm space-y-2">
                        <p className="flex items-start gap-2 text-emerald-700 bg-white border border-emerald-100 p-2.5 rounded-lg">
                            <span className="shrink-0 mt-0.5">✅</span>
                            <span><strong>좋은 예시:</strong> 카페, 맛집, 네일샵, 근처 삼겹살, 근처 분위기 좋은 카페</span>
                        </p>
                        <p className="flex items-start gap-2 text-red-700 bg-white border border-red-100 p-2.5 rounded-lg">
                            <span className="shrink-0 mt-0.5">❌</span>
                            <span><strong>나쁜 예시:</strong> 강남역 카페, 홍대 맛집, 마곡역 필라테스</span>
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        💡 구글 키워드는 지역명을 포함해도 괜찮습니다.
                    </p>
                    <p className="mt-1 text-sm text-gray-600">예시: 시청역 혼밥, 강남역 맛집 등</p>
                </div>
            )}
        </div>
    )
}
