"""
스레드 피드/검색 스캐너
Playwright로 스레드를 스크롤하며 글을 수집하고 Supabase에 저장

사용법:
    python scanner.py --mode feed --count 200
    python scanner.py --mode search --keywords "마케팅,SEO" --count 200
    python scanner.py --mode views
"""
import argparse
import asyncio
import json
import sys
import time
import traceback

from playwright.async_api import async_playwright

from parser import parse_thread_post, calculate_engagement_score, generate_hash
from db import save_sources, check_duplicates, get_top_sources, update_source_views, get_product_config
from telegram_notify import notify_scan_result, notify_error


# ── 설정 ──

THREADS_BASE_URL = "https://www.threads.com"
SCROLL_PAUSE_SEC = 3.0  # 스크롤 후 로딩 대기
MAX_SCROLL_RETRIES = 10  # 새 글이 안 나오면 중단


async def extract_posts_from_page(page) -> list[dict]:
    """
    현재 페이지 DOM에서 모든 글 데이터 추출.
    """
    posts = await page.evaluate(r"""
        () => {
            const posts = [];
            // data-pressable-container 속성을 가진 모든 컨테이너 탐색
            const articles = document.querySelectorAll('[data-pressable-container]');

            articles.forEach((article) => {
                try {
                    // URL 추출 (post/ 링크)
                    const linkEl = article.querySelector('a[href*="/post/"]');
                    const url = linkEl ? linkEl.href : '';
                    if (!url) return;  // URL 없으면 포스트가 아님

                    // 텍스트 추출 - 여러 방법 시도
                    let text = '';
                    const textHost = article.querySelector('[data-text-host]');
                    if (textHost) {
                        text = textHost.innerText.trim();
                    } else {
                        // fallback: 링크/버튼 제외한 텍스트
                        const clone = article.cloneNode(true);
                        clone.querySelectorAll('a, button, [role="button"]').forEach(el => el.remove());
                        text = clone.innerText.trim();
                    }

                    if (!text || text.length < 10) return;

                    // 작성자 추출
                    const authorEl = article.querySelector('a[href*="/@"]');
                    const author = authorEl ? authorEl.href.split('/@')[1]?.split('/')[0] || '' : '';

                    // 참여도 추출
                    const statsEls = article.querySelectorAll('[role="button"] span, [aria-label*="like"] span, [aria-label*="reply"] span');
                    const stats = Array.from(statsEls).map(el => el.innerText.trim()).filter(t => t && /^[\d,.]+[KMBkmb천만]?$/.test(t));

                    posts.push({
                        text: text,
                        author: author,
                        url: url,
                        likes: stats[0] || '0',
                        replies: stats[1] || '0',
                        reposts: stats[2] || '0',
                        time: '',
                    });
                } catch (e) {
                    // 파싱 실패한 개별 글은 무시
                }
            });

            return posts;
        }
    """)
    return posts


async def scroll_and_collect(page, target_count: int) -> list[dict]:
    """
    페이지를 스크롤하면서 글 수집.
    target_count에 도달하거나 더 이상 새 글이 없으면 중단.
    """
    collected = {}  # content_hash → post dict
    no_new_count = 0

    print(f"[SCAN] 목표: {target_count}개 수집")

    while len(collected) < target_count and no_new_count < MAX_SCROLL_RETRIES:
        raw_posts = await extract_posts_from_page(page)

        new_count = 0
        for raw in raw_posts:
            parsed = parse_thread_post(raw)
            if parsed and parsed["content_hash"] not in collected:
                # 참여도 점수 계산
                parsed["engagement_score"] = calculate_engagement_score(
                    parsed["likes"], parsed["replies"], parsed["reposts"]
                )
                collected[parsed["content_hash"]] = parsed
                new_count += 1

        if new_count == 0:
            no_new_count += 1
            print(f"[SCAN] 새 글 없음 ({no_new_count}/{MAX_SCROLL_RETRIES})")
        else:
            no_new_count = 0
            print(f"[SCAN] +{new_count}개 (총 {len(collected)}개)")

        # 스크롤 다운 (더 공격적으로)
        await page.evaluate("window.scrollBy(0, window.innerHeight * 3)")
        await asyncio.sleep(SCROLL_PAUSE_SEC)
        # 추가 스크롤 (Threads는 빠른 스크롤에 더 많은 콘텐츠 로드)
        await page.evaluate("window.scrollBy(0, window.innerHeight * 2)")
        await asyncio.sleep(1)

    return list(collected.values())


async def _collect_and_filter_views(page, posts: list[dict], min_views: int) -> list[dict]:
    """
    글 목록의 개별 페이지를 방문하여 조회수를 수집하고,
    min_views 미만인 글을 제거하여 반환
    """
    passed = []
    for i, post in enumerate(posts):
        url = post.get("source_url")
        if not url:
            continue
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

            views_text = await page.evaluate("""
                () => {
                    const els = document.querySelectorAll('span');
                    for (const el of els) {
                        const text = el.innerText;
                        if (text && (text.includes('조회') || text.includes('views') || text.includes('view'))) {
                            return text;
                        }
                    }
                    return '';
                }
            """)

            if views_text:
                views = parse_views_text(views_text)
                if views >= min_views:
                    post["views"] = views
                    passed.append(post)
                    print(f"  ✅ [{i+1}/{len(posts)}] {views}뷰 → 통과")
                else:
                    print(f"  ⏭️ [{i+1}/{len(posts)}] {views}뷰 → 미달")
            else:
                print(f"  ⏭️ [{i+1}/{len(posts)}] 조회수 없음 → 제외")

        except Exception as e:
            print(f"  ❌ [{i+1}/{len(posts)}] {e}")

        await asyncio.sleep(1)

    print(f"[VIEWS] 조회수 필터 결과: {len(posts)}개 → {len(passed)}개")
    return passed

async def scan_feed(count: int) -> dict:
    """
    STEP 1-A: For You 피드 스크롤 수집 (통합 파이프라인)
    수집 → 좋아요 필터 → 조회수 수집 → 조회수 필터 → 저장
    """
    print(f"\n{'='*50}")
    print(f"[FEED SCAN] For You 피드 스캔 시작 (목표: {count}개)")
    print(f"{'='*50}\n")

    # 설정 로드
    config = get_product_config() or {}
    min_likes = config.get("min_likes", 0)
    min_views = config.get("min_views", 0)
    print(f"[필터] 최소 좋아요: {min_likes} | 최소 조회수: {min_views}")

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9223")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        # 피드 수집
        print("[INFO] Threads 피드 새로고침...")
        await page.goto(THREADS_BASE_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(8)
        posts = await scroll_and_collect(page, count)

        # 1차 필터: 좋아요
        if min_likes > 0:
            before = len(posts)
            posts = [post_item for post_item in posts if post_item.get("likes", 0) >= min_likes]
            print(f"[필터] 좋아요 {min_likes}개 이상: {before}개 → {len(posts)}개")

        # 2차: 조회수 수집 + 필터
        if min_views > 0 and posts:
            print(f"[VIEWS] {len(posts)}개 글 조회수 수집 시작...")
            posts = await _collect_and_filter_views(page, posts, min_views)

    # 중복 확인 + DB 저장
    existing_hashes = check_duplicates([post_item["content_hash"] for post_item in posts])
    new_posts = [post_item for post_item in posts if post_item["content_hash"] not in existing_hashes]
    saved = save_sources(new_posts)
    skipped = len(posts) - len(new_posts)

    print(f"\n[RESULT] 최종: {len(posts)}개 | 저장: {saved}개 | 중복: {skipped}개")
    return {"total": len(posts), "saved": saved, "skipped": skipped}


async def scan_search(keywords: list[str], count: int) -> dict:
    """
    STEP 1-B: 키워드 검색 스캔 (통합 파이프라인)
    수집 → 좋아요 필터 → 조회수 수집 → 조회수 필터 → 저장
    """
    print(f"\n{'='*50}")
    print(f"[SEARCH SCAN] 키워드 검색 스캔 (키워드: {keywords}, 목표: {count}개)")
    print(f"{'='*50}\n")

    # 설정 로드
    config = get_product_config() or {}
    min_likes = config.get("min_likes", 0)
    min_views = config.get("min_views", 0)
    print(f"[필터] 최소 좋아요: {min_likes} | 최소 조회수: {min_views}")

    all_posts = []

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9223")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        per_keyword = max(count // len(keywords), 10)

        for keyword in keywords:
            search_url = f"{THREADS_BASE_URL}/search?q={keyword}&serp_type=default"
            print(f"\n[SEARCH] 키워드: '{keyword}' (목표: {per_keyword}개)")

            await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(8)

            posts = await scroll_and_collect(page, per_keyword)
            all_posts.extend(posts)

        # 중복 제거 (키워드 간 겹침)
        unique = {}
        for p_item in all_posts:
            if p_item["content_hash"] not in unique:
                unique[p_item["content_hash"]] = p_item
        all_posts = list(unique.values())

        # 1차 필터: 좋아요
        if min_likes > 0:
            before = len(all_posts)
            all_posts = [p_item for p_item in all_posts if p_item.get("likes", 0) >= min_likes]
            print(f"[필터] 좋아요 {min_likes}개 이상: {before}개 → {len(all_posts)}개")

        # 2차: 조회수 수집 + 필터
        if min_views > 0 and all_posts:
            print(f"[VIEWS] {len(all_posts)}개 글 조회수 수집 시작...")
            all_posts = await _collect_and_filter_views(page, all_posts, min_views)

    # 중복 확인 + DB 저장
    existing_hashes = check_duplicates([p_item["content_hash"] for p_item in all_posts])
    new_posts = [p_item for p_item in all_posts if p_item["content_hash"] not in existing_hashes]
    saved = save_sources(new_posts)
    skipped = len(all_posts) - len(new_posts)

    print(f"\n[RESULT] 최종: {len(all_posts)}개 | 저장: {saved}개 | 중복: {skipped}개")
    return {"total": len(all_posts), "saved": saved, "skipped": skipped}


async def scan_views():
    """
    STEP 2: 좋아요 상위 50개의 조회수 추출
    """
    print(f"\n{'='*50}")
    print(f"[VIEWS] 조회수 추출 시작")
    print(f"{'='*50}\n")

    top_sources = get_top_sources(limit=50, order_by="likes")
    sources_with_url = [s for s in top_sources if s.get("source_url") and s.get("views") is None]

    if not sources_with_url:
        print("[VIEWS] 조회수 추출 대상 없음")
        return {"total": 0, "updated": 0}

    print(f"[VIEWS] {len(sources_with_url)}개 글의 조회수 추출")

    updated = 0
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://localhost:9223")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        for source in sources_with_url:
            try:
                await page.goto(source["source_url"], wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(3)

                # 조회수 추출 (예: "조회 9.9천회")
                views_text = await page.evaluate("""
                    () => {
                        const els = document.querySelectorAll('span');
                        for (const el of els) {
                            const text = el.innerText;
                            if (text && (text.includes('조회') || text.includes('views') || text.includes('view'))) {
                                return text;
                            }
                        }
                        return '';
                    }
                """)

                if views_text:
                    views = parse_views_text(views_text)
                    if views > 0:
                        update_source_views(source["id"], views)
                        updated += 1
                        print(f"  ✅ {source['id'][:8]}... → {views}뷰")

            except Exception as e:
                print(f"  ❌ {source['id'][:8]}... → {e}")

            await asyncio.sleep(1)  # 요청 간격

    print(f"\n[RESULT] 대상: {len(sources_with_url)}개 | 업데이트: {updated}개")
    return {"total": len(sources_with_url), "updated": updated}


def parse_views_text(text: str) -> int:
    """
    '조회 9.9천회', 'Views: 12K' 같은 텍스트에서 숫자 추출
    """
    import re
    # 숫자 부분 추출
    numbers = re.findall(r'[\d,.]+[천만KkMm]?', text)
    if not numbers:
        return 0

    num_str = numbers[0]

    multiplier = 1
    if '천' in num_str or num_str.upper().endswith('K'):
        multiplier = 1000
        num_str = num_str.replace('천', '').replace('K', '').replace('k', '')
    elif '만' in num_str:
        multiplier = 10000
        num_str = num_str.replace('만', '')
    elif num_str.upper().endswith('M'):
        multiplier = 1000000
        num_str = num_str.replace('M', '').replace('m', '')

    try:
        return int(float(num_str.replace(',', '')) * multiplier)
    except ValueError:
        return 0


# ── 메인 진입점 ──

def main():
    arg_parser = argparse.ArgumentParser(description="Threads 피드/검색 스캐너")
    arg_parser.add_argument("--mode", choices=["feed", "search", "views"], required=True,
                           help="feed: For You 피드, search: 키워드 검색, views: 조회수 추출")
    arg_parser.add_argument("--keywords", type=str, default="",
                           help="검색 키워드 (쉼표 구분)")
    arg_parser.add_argument("--count", type=int, default=200,
                           help="수집 목표 개수 (기본: 200)")

    args = arg_parser.parse_args()

    try:
        if args.mode == "feed":
            result = asyncio.run(scan_feed(args.count))
            notify_scan_result("피드", result["total"], result["saved"], result["skipped"])

        elif args.mode == "search":
            if not args.keywords:
                # DB에서 계정 설정의 키워드 로드
                from db import get_all_account_configs
                configs = get_all_account_configs()
                keywords = []
                for config in configs:
                    keywords.extend(config.get("scan_keywords", []))
                keywords = list(set(keywords))  # 중복 제거
            else:
                keywords = [k.strip() for k in args.keywords.split(",")]

            if not keywords:
                print("[ERROR] 키워드가 없습니다. --keywords 또는 DB 설정을 확인하세요.")
                sys.exit(1)

            result = asyncio.run(scan_search(keywords, args.count))
            notify_scan_result("검색", result["total"], result["saved"], result["skipped"])

        elif args.mode == "views":
            result = asyncio.run(scan_views())

    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error(f"스캐너 ({args.mode})", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
