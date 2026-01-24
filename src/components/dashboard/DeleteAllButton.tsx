
'use client'

import { Trash2, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DeleteAllButton() {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteAll = async () => {
        if (!confirm('정말로 모든 검색 기록을 삭제하시겠습니까?\n처리 중인 작업도 모두 중단됩니다.')) return

        setIsDeleting(true)
        try {
            const response = await fetch('/api/search/all', {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            router.refresh()
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDeleteAll}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
            {isDeleting ? (
                <Loader className="w-4 h-4 animate-spin" />
            ) : (
                <Trash2 className="w-4 h-4" />
            )}
            전체 삭제
        </button>
    )
}
