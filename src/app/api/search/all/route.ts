
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
    const supabase = await createClient()

    try {
        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get processing searches for Hard Delete
        const { data: processingSearches, error: searchError } = await supabase
            .from('searches')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'processing')

        if (searchError) throw searchError

        // 3. Hard Delete processing searches
        if (processingSearches && processingSearches.length > 0) {
            const processingIds = processingSearches.map(s => s.id)

            // Delete results
            await supabase
                .from('search_results')
                .delete()
                .in('search_id', processingIds)

            // Delete searches
            await supabase
                .from('searches')
                .delete()
                .in('id', processingIds)
        }

        // 4. Soft Delete remaining searches
        const { error: updateError } = await supabase
            .from('searches')
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .is('deleted_at', null)
        // processing 상태가 이미 삭제되었으므로 제외됨, 또는 명시적으로 제외할 필요 없음

        if (updateError) throw updateError

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Delete all searches error:', error)
        return NextResponse.json(
            { error: 'Failed to delete searches' },
            { status: 500 }
        )
    }
}
