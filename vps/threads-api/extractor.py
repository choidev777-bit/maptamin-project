"""
extractor.py
수동 등록된 URL에서 본문을 추출하여 DB 업데이트

사용법:
    python extractor.py --url "https://www.threads.net/@user/post/..."  --source_id "uuid"
    python extractor.py --url "https://www.youtube.com/watch?v=..."     --source_id "uuid"
    python extractor.py --url "https://blog.example.com/article"       --source_id "uuid"
"""
import argparse
import re
import sys
import traceback

import requests
from bs4 import BeautifulSoup

from parser import generate_hash
from db import supabase
from telegram_notify import send_telegram


# ── YouTube 추출 ──

def extract_youtube(url: str) -> dict:
    """
    YouTube URL → 제목 + 설명 + 자막 추출
    youtube_collector.py의 get_transcript() 재사용
    """
    from youtube_collector import get_transcript

    # video_id 파싱
    video_id = None
    if "youtu.be/" in url:
        video_id = url.split("youtu.be/")[-1].split("?")[0]
    elif "v=" in url:
        video_id = url.split("v=")[-1].split("&")[0]

    if not video_id:
        return {"error": "YouTube video_id를 파싱할 수 없습니다"}

    # YouTube Data API로 제목/설명 가져오기
    from config import YOUTUBE_API_KEY
    title = ""
    description = ""

    if YOUTUBE_API_KEY:
        try:
            api_url = "https://www.googleapis.com/youtube/v3/videos"
            resp = requests.get(api_url, params={
                "part": "snippet",
                "id": video_id,
                "key": YOUTUBE_API_KEY,
            }, timeout=10)
            if resp.ok:
                items = resp.json().get("items", [])
                if items:
                    snippet = items[0]["snippet"]
                    title = snippet.get("title", "")
                    description = snippet.get("description", "")[:500]
        except Exception:
            pass

    # 자막 추출
    transcript = get_transcript(video_id)

    # 텍스트 조합
    parts = []
    if title:
        parts.append(f"[제목] {title}")
    if description:
        parts.append(f"[설명] {description}")
    if transcript:
        parts.append(f"[자막] {transcript}")

    text_content = "\n".join(parts) if parts else f"YouTube 영상: {url}"

    return {"text_content": text_content, "author": ""}


# ── Threads 추출 ──

def extract_threads(url: str) -> dict:
    """
    Threads URL → Playwright로 본문 추출
    """
    import asyncio
    from playwright.async_api import async_playwright

    async def _extract():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(3000)

                # 글 본문 추출 시도
                selectors = [
                    '[data-pressable-container="true"]',
                    'div[dir="auto"]',
                    'article',
                ]
                text = ""
                for sel in selectors:
                    elements = await page.query_selector_all(sel)
                    for el in elements:
                        t = (await el.inner_text() or "").strip()
                        if len(t) > 20:
                            text = t
                            break
                    if text:
                        break

                # 작성자 추출
                author = ""
                try:
                    # URL에서 추출: threads.net/@username/post/...
                    match = re.search(r"@([^/]+)", url)
                    if match:
                        author = match.group(1)
                except Exception:
                    pass

                return {"text_content": text or f"Threads 글: {url}", "author": author}
            finally:
                await browser.close()

    return asyncio.run(_extract())


# ── 웹 추출 ──

def extract_web(url: str) -> dict:
    """
    일반 웹 URL → requests + BeautifulSoup로 본문 추출
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding

        soup = BeautifulSoup(resp.text, "html.parser")

        # 불필요한 태그 제거
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # 본문 추출: article > main > body 순서
        content_el = soup.find("article") or soup.find("main") or soup.find("body")
        if not content_el:
            return {"text_content": f"웹 페이지: {url}", "author": ""}

        text = content_el.get_text(separator="\n", strip=True)
        # 연속 줄바꿈 정리
        text = re.sub(r"\n{3,}", "\n\n", text)
        # 최대 5000자
        text = text[:5000]

        # 제목 추출
        title = ""
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)

        if title:
            text = f"[제목] {title}\n\n{text}"

        return {"text_content": text, "author": ""}

    except Exception as e:
        return {"text_content": f"웹 페이지 추출 실패: {url} ({e})", "author": ""}


# ── 메인 로직 ──

EXTRACTORS = {
    "youtube": extract_youtube,
    "threads": extract_threads,
    "web": extract_web,
}


def detect_type(url: str) -> str:
    if "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    if "threads.net" in url or "threads.com" in url:
        return "threads"
    return "web"


def main():
    parser = argparse.ArgumentParser(description="URL 본문 추출")
    parser.add_argument("--url", required=True, help="추출할 URL")
    parser.add_argument("--source_id", required=True, help="DB source ID")
    args = parser.parse_args()

    url = args.url
    source_id = args.source_id
    url_type = detect_type(url)

    print(f"[EXTRACT] {url_type}: {url}")

    extractor = EXTRACTORS[url_type]
    result = extractor(url)

    if result.get("error"):
        print(f"  ❌ 추출 실패: {result['error']}")
        send_telegram(f"❌ URL 추출 실패: {url}\n{result['error']}")
        sys.exit(1)

    text_content = result["text_content"]
    content_hash = generate_hash(text_content)

    # DB 업데이트: text_content, content_hash, author
    update_data = {
        "text_content": text_content,
        "content_hash": content_hash,
    }
    if result.get("author"):
        update_data["author"] = result["author"]

    supabase.table("threads_raw_sources").update(
        update_data
    ).eq("id", source_id).execute()

    print(f"  ✅ 추출 완료: {len(text_content)}자")
    send_telegram(f"✅ URL 추출 완료: {url_type}\n{url}\n({len(text_content)}자)")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        send_telegram(f"❌ extractor 오류:\n{traceback.format_exc()[:300]}")
        sys.exit(1)
