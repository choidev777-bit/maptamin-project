
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
// Use process.cwd() as Jest runs from project root
const envPath = path.resolve(process.cwd(), '.env.local');
console.error('DEBUG: Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('DEBUG: Error loading .env.local:', result.error);
}

export function createTestClient() {
    console.error('DEBUG: createTestClient called');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.error('DEBUG: Env Names available:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });
}
