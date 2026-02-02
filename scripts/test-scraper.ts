import 'dotenv/config';
import { scrapeNaverBatch } from '../src/lib/naver/scraper';
import { NaverScrapeTask } from '../src/lib/naver/types';

async function runTest() {
    console.log('🧪 Starting Scraper Test (Proxy & Logic Verification)...');

    // Test Task: 건대맛집 (Konkuk Univ. Station area)
    const tasks: NaverScrapeTask[] = [
        {
            keyword: '건대맛집',
            lat: 37.540705,
            lng: 127.069227,
            gridIndex: 0,
            targetBusinessName: '' // Optional
        }
    ];

    try {
        const results = await scrapeNaverBatch(tasks, (current, total) => {
            console.log(`[Progress] ${current + 1}/${total}`);
        });

        console.log('\n✅ Test Complete!');
        console.log('--- Result Summary ---');
        console.log(JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

runTest();
