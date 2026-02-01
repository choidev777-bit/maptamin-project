import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// DELETE: Deactivate a schedule (Soft Delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Soft Delete (is_active = false, deleted_at = now)
    const { error } = await supabase
        .from('scheduled_searches')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure ownership

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

// PATCH: Update schedule (Toggle Active, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json(); // { is_active: boolean, keywords: [] }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Filter allowed fields to prevent injection
    const allowedUpdates: any = {};
    if (typeof body.is_active === 'boolean') allowedUpdates.is_active = body.is_active;
    if (Array.isArray(body.keywords)) allowedUpdates.keywords = body.keywords;

    if (Object.keys(allowedUpdates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase
        .from('scheduled_searches')
        .update(allowedUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
