'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SearchStatusPollerProps {
    searchId: string
    initialStatus: string
}

export function SearchStatusPoller({ searchId, initialStatus }: SearchStatusPollerProps) {
    const router = useRouter()
    const [status, setStatus] = useState(initialStatus)
    const supabase = createClient()

    useEffect(() => {
        // 이미 완료되었거나 실패한 경우 폴링하지 않음
        if (status === 'completed' || status === 'failed') return

        // 3초마다 상태 확인
        const interval = setInterval(async () => {
            const { data, error } = await supabase
                .from('searches')
                .select('status')
                .eq('id', searchId)
                .single()

            if (data && data.status !== status) {
                setStatus(data.status)

                // 상태가 변경(완료 또는 실패)되면 페이지 새로고침
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval)
                    router.refresh()
                }
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [searchId, status, router, supabase])

    // 화면에 아무것도 렌더링하지 않음 (로직만 수행)
    return null
}
