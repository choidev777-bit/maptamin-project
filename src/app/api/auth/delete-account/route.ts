import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
    try {
        // 1. Verify current session
        const supabase = await createServerClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Initialize Service Role Client (for Admin actions)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 3. Cleanup Storage (Avatars)
        if (user.user_metadata?.avatar_url) {
            // Extract file path from URL. 
            // Expected format: .../storage/v1/object/public/avatars/FILENAME
            try {
                const avatarUrl = user.user_metadata.avatar_url;
                if (avatarUrl.includes('/avatars/')) {
                    const pathParts = avatarUrl.split('/avatars/');
                    if (pathParts.length > 1) {
                        const fileName = pathParts[1];
                        // Clean up any query params if present
                        const cleanFileName = fileName.split('?')[0];
                        await supabaseAdmin.storage.from('avatars').remove([cleanFileName]);
                    }
                }
            } catch (e) {
                console.error('Failed to parse/delete avatar:', e);
                // Continue execution - do not block account deletion for a file
            }
        }

        // 4. Cleanup Data (Manual Cascade Safeguard)
        // CRITiCAL: We use Promise.allSettled to ensure we try to delete everything even if one fails.
        // We log errors but proceed to delete the user to prevent "Zombies".
        const cleanupResults = await Promise.allSettled([
            supabaseAdmin.from('managed_places').delete().eq('user_id', user.id),
            supabaseAdmin.from('managed_competitors').delete().eq('user_id', user.id),
            supabaseAdmin.from('searches').delete().eq('user_id', user.id),
            supabaseAdmin.from('schedules').delete().eq('user_id', user.id),
            supabaseAdmin.from('user_credits').delete().eq('user_id', user.id)
        ]);

        // Log failures for manual inspection if needed
        cleanupResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                const tableName = ['managed_places', 'managed_competitors', 'searches', 'schedules', 'user_credits'][index];
                console.error(`Cleanup failed for ${tableName}:`, result.reason);
            }
        });

        // 5. Delete User (Auth)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) {
            console.error('Supabase Auth Delete Error:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // 6. Return success
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Account deletion internal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
