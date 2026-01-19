'use client'

import { X, Plus } from 'lucide-react'

interface Props {
    keywords: string[]
    onChange: (keywords: string[]) => void
    maxKeywords?: number
}

export function KeywordInput({ keywords, onChange, maxKeywords = 3 }: Props) {
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
                            placeholder={`키워드 입력 (예: "강남 카페", "이태원 맛집")`}
                            className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all"
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

            <p className="text-sm text-gray-500">
                💡 고객이 비즈니스를 찾을 때 검색할 키워드를 입력하세요.
            </p>
        </div>
    )
}
