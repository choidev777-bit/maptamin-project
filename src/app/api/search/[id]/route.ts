
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const supabase = await createClient()

    try {
        // 1. Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get the search record
        const { data: search, error: searchError } = await supabase
            .from('searches')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (searchError || !search) {
            return NextResponse.json({ error: 'Search not found' }, { status: 404 })
        }

        // 3. Handle deletion based on status
        if (search.status === 'processing') {
            // === Hard Delete for Processing Status ===

            // Mark as cancelled first (signal to background worker)
            await supabase
                .from('searches')
                .update({ status: 'cancelled' }) // Assuming 'cancelled' status exists or we just hard delete
                .eq('id', id)

            // Note: If we hard delete immediately, the background worker might fail when trying to update the search.
            // Ideally, the worker checks if search exists.

            // Delete results
            await supabase
                .from('search_results')
                .delete()
                .eq('search_id', id)

            // Delete search
            const { error: deleteError } = await supabase
                .from('searches')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

        } else {
            // === Soft Delete for Other Statuses ===
            const { error: updateError } = await supabase
                .from('searches')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (updateError) throw updateError
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Delete search error:', error)
        return NextResponse.json(
            { error: 'Failed to delete search' },
            { status: 500 }
        )
    }
}
