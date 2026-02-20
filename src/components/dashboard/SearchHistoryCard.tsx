'use client'

import { Search } from '@/lib/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader, MapPin, Globe, Trash2 } from 'lucide-react'

interface Props {
    search: Search
}

export function SearchHistoryCard({ search }: Props) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm('정말 이 진단 기록을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/search/${search.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            router.refresh()
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.')
            setIsDeleting(false)
        }
    }

    const handleClickRow = () => {
        if (search.status === 'completed') {
            router.push(search.platform === 'naver' ? `/naver-search/${search.id}` : `/search/${search.id}`)
        }
    }

    const formatDateString = (dateString: string) => {
        const date = new Date(dateString)
        return format(date, 'yyyy-MM-dd • HH:mm', { locale: ko })
    }

    if (isDeleting) {
        return (
            <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        삭제 중...
                    </div>
                </td>
            </tr>
        )
    }

    return (
        <tr
            onClick={handleClickRow}
            className={`transition-colors group ${search.status === 'completed' ? 'hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer' : ''}`}
        >
            <td className="px-6 py-4">
                {search.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        분석 완료
                    </span>
                )}
                {search.status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        분석 진행 중
                    </span>
                )}
                {search.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        대기 중
                    </span>
                )}
                {search.status === 'failed' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        분석 실패
                    </span>
                )}
            </td>

            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]" title={search.place_name}>{search.place_name}</span>
                </div>
            </td>

            <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                    {search.platform === 'naver' ? (
                        <MapPin className="w-5 h-5 text-[#03C75A]" />
                    ) : (
                        <Globe className="w-5 h-5 text-blue-500" />
                    )}
                    {search.platform === 'naver' ? '네이버 플레이스' : '구글 비즈니스 프로필'}
                </div>
            </td>

            <td className="px-6 py-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                {formatDateString(search.created_at)}
            </td>

            <td className="px-6 py-4 text-right">
                <div className="flex justify-end items-center gap-2">
                    {search.status === 'completed' ? (
                        <button className="text-gray-900 bg-gray-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 hover:bg-gray-200 font-bold text-sm px-3 py-1.5 rounded-md transition-colors whitespace-nowrap">
                            결과 확인
                        </button>
                    ) : (
                        <button disabled className="text-gray-400 cursor-not-allowed font-medium text-sm px-3 py-1.5 whitespace-nowrap">
                            대기 중...
                        </button>
                    )}

                    <button
                        onClick={(e) => handleDelete(e)}
                        className="p-1 text-gray-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="기록 삭제"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    )
}
