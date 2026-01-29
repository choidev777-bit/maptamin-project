
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key Length:', serviceKey ? serviceKey.length : 0);

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runTest() {
    try {
        console.log('1. Testing Admin Auth (List Users)...');
        const { data: users, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (authError) {
            console.error('Auth Error:', authError);
        } else {
            console.log('Auth Success. User count:', users.users.length);
        }

        console.log('2. Testing RPC (check connection)...');
        // Just call a simple RPC query or check an arbitrary table
        const { data: plans, error: dbError } = await supabase.from('plans').select('count');
        if (dbError) {
            console.error('DB/RPC Error:', dbError);
        } else {
            console.log('DB Success. Plans table accessible.');
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

runTest();
