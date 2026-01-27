
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function fetchDummyTile() {
    console.log('🎣 Fetching a real Naver format .pbf tile for mocking...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 타겟 파일 경로
    const savePath = path.join(process.cwd(), 'src', 'lib', 'naver', 'dummy.pbf');

    // 디렉토리 확인
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let captured = false;

    await page.route('**/*', async (route) => {
        const url = route.request().url();

        // PBF 타일 패턴 감지 (확장자 유연하게 대응)
        const isMapData = url.includes('map.pstatic.net') && (
            url.includes('.pbf') ||
            url.includes('.bin') ||
            url.includes('.json')
        );

        if (!captured && isMapData) {
            console.log(`✨ Found target tile: ${url}`);
            const response = await route.fetch();

            if (response.status() === 200) {
                const buffer = await response.body();
                if (buffer.length > 0) {
                    fs.writeFileSync(savePath, buffer);
                    console.log(`✅ Saved dummy tile to: ${savePath} (${buffer.length} bytes)`);
                    captured = true;
                }
            }
        }
        return route.continue();
    });

    try {
        await page.goto('https://map.naver.com/p?c=15.00,0,0,0,dh', { waitUntil: 'networkidle' });

        // 잠시 대기
        await new Promise(r => setTimeout(r, 5000));

        if (captured) {
            console.log('🎉 Success! You can now use this file for Mocking V2.');
        } else {
            console.error('❌ Failed to capture any .pbf tile. Check network patterns.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

fetchDummyTile();
