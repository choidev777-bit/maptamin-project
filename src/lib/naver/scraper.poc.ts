/**
 * Naver Scraper PoC (Proof of Concept)
 * 
 * 실행 방법:
 * npx ts-node --skip-project src/lib/naver/scraper.poc.ts
 * 
 * 또는:
 * npx tsx src/lib/naver/scraper.poc.ts
 */

import { scrapeAtLocation, scrapeNaverBatch } from './scraper';
import { NaverScrapeTask } from './types';

async function runPoC() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     네이버 지도 스크래퍼 PoC (Proof of Concept)  ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log();

    // =====================
    // 테스트 1: 단일 위치 검색
    // =====================
    console.log('📍 테스트 1: 단일 위치 검색 (서울시청 근처)');
    console.log('─'.repeat(50));

    const singleResult = await scrapeAtLocation({
        lat: 37.5665,      // 서울시청 위도
        lng: 126.978,      // 서울시청 경도
        keyword: '근처 맛집',
    });

    if (singleResult.success) {
        console.log(`✅ 성공! ${singleResult.results.length}개 결과 발견`);
        console.log();
        console.log('상위 10개 결과:');
        singleResult.results.slice(0, 10).forEach(r => {
            console.log(`  ${String(r.rank).padStart(2)}. ${r.businessName}`);
        });
    } else {
        console.log(`❌ 실패: ${singleResult.error}`);
    }
    console.log();

    // =====================
    // 테스트 2: 특정 업체 순위 찾기
    // =====================
    console.log('📍 테스트 2: 특정 업체 순위 찾기');
    console.log('─'.repeat(50));

    const targetResult = await scrapeAtLocation({
        lat: 37.5172,      // 강남역 위도
        lng: 127.0473,     // 강남역 경도
        keyword: '근처 카페',
        targetBusinessName: '스타벅스',  // 일반적으로 있을 업체
    });

    if (targetResult.success) {
        console.log(`✅ 성공! ${targetResult.results.length}개 결과 발견`);
        if (targetResult.targetRank) {
            console.log(`🎯 "스타벅스" 순위: ${targetResult.targetRank}위`);
        } else {
            console.log(`⚠️ "스타벅스"를 찾지 못함 (상위 20위 내 없음)`);
        }
        console.log();
        console.log('상위 5개 결과:');
        targetResult.results.slice(0, 5).forEach(r => {
            console.log(`  ${String(r.rank).padStart(2)}. ${r.businessName}`);
        });
    } else {
        console.log(`❌ 실패: ${targetResult.error}`);
    }
    console.log();

    // =====================
    // 테스트 3: 배치 스크래핑 (3개 위치)
    // =====================
    console.log('📍 테스트 3: 배치 스크래핑 (3개 위치)');
    console.log('─'.repeat(50));

    const batchTasks: NaverScrapeTask[] = [
        { keyword: '근처 맛집', lat: 37.5665, lng: 126.978, gridIndex: 0 },  // 서울시청
        { keyword: '근처 맛집', lat: 37.5172, lng: 127.0473, gridIndex: 1 }, // 강남역
        { keyword: '근처 맛집', lat: 37.5009, lng: 127.0367, gridIndex: 2 }, // 역삼역
    ];

    const batchResults = await scrapeNaverBatch(batchTasks, (completed, total) => {
        console.log(`  진행률: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`);
    });

    console.log();
    console.log('배치 결과 요약:');
    batchResults.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`  ${status} Grid ${r.gridIndex}: ${r.results.length}개 결과`);
        if (r.results.length > 0) {
            console.log(`     1위: ${r.results[0].businessName}`);
        }
    });

    console.log();
    console.log('═'.repeat(50));
    console.log('PoC 테스트 완료!');
}

// 실행
runPoC().catch(console.error);
