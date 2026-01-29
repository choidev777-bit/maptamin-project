
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf-8');

const lines = content.split('\n');
console.log('Keys found in .env.local:');
lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length > 0) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        console.log(`${key}: ${value.length > 0 ? 'HAS_VALUE' : 'EMPTY'} (Length: ${value.length})`);
    }
});
