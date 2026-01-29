
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('CWD:', process.cwd());
console.log('Env Path:', envPath);
console.log('File Exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Dotenv Error:', result.error);
}

console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'FOUND' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'MISSING');
