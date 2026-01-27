
import { scrapeNaverBatch } from '../src/lib/naver/scraper';

async function runTest() {
    console.log('🚀 Starting Batch Caching Verification Test...');
    console.log('Purpose: Verify if Task 2 & 3 use cached assets from Task 1.');

    const testTasks = [
        {
            gridIndex: 0,
            lat: 37.528738,
            lng: 126.970145,
            keyword: '쌀국수',
            targetBusinessName: '효뜨'
        },
        {
            gridIndex: 1,
            lat: 37.528738,
            lng: 126.970145,
            keyword: '피자',
            targetBusinessName: '잭슨피자'
        },
        {
            gridIndex: 2,
            lat: 37.528738,
            lng: 126.970145,
            keyword: '햄버거',
            targetBusinessName: '다운타우너'
        }
    ];

    try {
        const results = await scrapeNaverBatch(testTasks, (current, total) => {
            console.log(`[Progress] ${current}/${total}`);
        });

        console.log('\n==========================================');
        console.log('📊 Caching Test Results');
        console.log('==========================================');

        results.forEach((r, i) => {
            console.log(`Task ${i + 1} (${r.keyword})`);
            console.log(`- Rank: ${r.targetRank ? r.targetRank + '위' : '순위권 밖'}`);
            console.log(`- Data: ${(r.dataUsageBytes! / 1024 / 1024).toFixed(3)} MB`);
            console.log(`- Time: ${r.durationSeconds}s`);
            console.log('------------------------------------------');
        });

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

runTest();
