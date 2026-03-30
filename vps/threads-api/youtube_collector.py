"""
유튜브 수집기
YouTube Data API + youtube-transcript-api로 영상/쇼츠 수집

사용법:
    python youtube_collector.py --type long --keywords "네이버 플레이스 순위"
    python youtube_collector.py --type shorts --keywords "마케팅"
    python youtube_collector.py --type long  (키워드: DB에서 로드)
"""
import argparse
import re
import sys
import traceback

import requests
from youtube_transcript_api import YouTubeTranscriptApi

from config import YOUTUBE_API_KEY
from parser import generate_hash
from db import save_sources, check_duplicates, get_all_account_configs, get_product_config, supabase
from telegram_notify import notify_scan_result, notify_error


# ── 설정 ──

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
DEFAULT_MAX_RESULTS = 15
DEFAULT_ORDER = "relevance"  # relevance, viewCount, date, rating
TRANSCRIPT_MAX_LENGTH = 3000  # 자막 최대 글자 수


def get_youtube_settings() -> dict:
    """
    DB(product_config)에서 유튜브 수집 설정 가져오기.
    대시보드에서 변경 가능: youtube_max_results, youtube_scan_interval_hours
    """
    try:
        config = get_product_config()
        if config:
            return {
                "order": DEFAULT_ORDER,
                "max_results": config.get("youtube_max_results") or DEFAULT_MAX_RESULTS,
                "interval_hours": config.get("youtube_scan_interval_hours") or 24,
            }
    except Exception:
        pass
    return {"order": DEFAULT_ORDER, "max_results": DEFAULT_MAX_RESULTS, "interval_hours": 24}


def should_run(video_type: str, interval_hours: int) -> bool:
    """
    마지막 유튜브 수집 이후 interval_hours가 경과했는지 확인.
    경과하지 않았으면 False (스킵).
    """
    from datetime import datetime, timezone, timedelta

    source_type = f"youtube_{video_type}"
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=interval_hours)).isoformat()

    result = (
        supabase.table("threads_raw_sources")
        .select("id")
        .eq("source_type", source_type)
        .gt("collected_at", cutoff)
        .limit(1)
        .execute()
    )
    return not bool(result.data)


# ── 헬퍼 함수 ──

def format_transcript(segments: list[dict], max_length: int = TRANSCRIPT_MAX_LENGTH) -> str:
    """
    youtube-transcript-api 결과를 하나의 문자열로 변환.
    """
    if not segments:
        return ""

    text = " ".join(
        seg.get("text", "").replace("\n", " ").strip()
        for seg in segments
    )
    # 연속 공백 정리
    text = re.sub(r"\s+", " ", text).strip()

    if max_length and len(text) > max_length:
        text = text[:max_length]

    return text


def parse_duration(duration_str: str) -> int:
    """
    ISO 8601 duration (PT1H2M3S) → 초 단위 정수 변환
    """
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
    if not match:
        return 0

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    return hours * 3600 + minutes * 60 + seconds


def is_shorts(duration_seconds: int) -> bool:
    """60초 이하면 쇼츠"""
    return duration_seconds <= 60


def parse_video_data(item: dict, source_type: str, transcript: str) -> dict:
    """
    YouTube API 검색 결과 item → raw_sources 형식으로 변환
    """
    video_id = item["id"]["videoId"] if isinstance(item["id"], dict) else item["id"]
    snippet = item["snippet"]
    title = snippet.get("title", "")
    channel = snippet.get("channelTitle", "")
    description = snippet.get("description", "")

    # 텍스트: 제목 + 설명 + 자막
    text_parts = [f"[제목] {title}"]
    if description:
        text_parts.append(f"[설명] {description[:300]}")
    if transcript:
        text_parts.append(f"[자막] {transcript}")

    text_content = "\n".join(text_parts)
    content_hash = generate_hash(text_content)

    return {
        "source_type": source_type,
        "input_method": "auto",
        "source_role": "content",
        "source_url": f"https://www.youtube.com/watch?v={video_id}",
        "author": channel,
        "text_content": text_content,
        "content_hash": content_hash,
        "likes": 0,
        "replies": 0,
        "reposts": 0,
        "engagement_score": 0,
    }


def get_transcript(video_id: str) -> str:
    """
    영상의 한국어 자막 추출. 없으면 영어 → 자동생성 순서로 시도.
    (youtube-transcript-api v1.x 인스턴스 기반 API)
    """
    ytt_api = YouTubeTranscriptApi()

    # 1순위: 한국어 자막 직접 fetch
    try:
        transcript = ytt_api.fetch(video_id, languages=["ko"])
        segments = [{"text": s.text} for s in transcript]
        return format_transcript(segments)
    except Exception:
        pass

    # 2순위: 영어 자막 fetch
    try:
        transcript = ytt_api.fetch(video_id, languages=["en"])
        segments = [{"text": s.text} for s in transcript]
        return format_transcript(segments)
    except Exception:
        pass

    # 3순위: list에서 사용 가능한 아무 자막
    try:
        transcript_list = ytt_api.list(video_id)
        for t in transcript_list:
            fetched = t.fetch()
            segments = [{"text": s.text} for s in fetched]
            return format_transcript(segments)
    except Exception:
        pass

    return ""


# ── 메인 수집 로직 ──

def search_videos(keywords: list[str], video_type: str = "long",
                  order: str = DEFAULT_ORDER, max_results: int = DEFAULT_MAX_RESULTS) -> list[dict]:
    """
    YouTube Data API로 키워드 검색 → 영상 목록 반환
    """
    if not YOUTUBE_API_KEY:
        print("[ERROR] YOUTUBE_API_KEY가 설정되지 않았습니다")
        return []

    all_videos = []

    for keyword in keywords:
        print(f"\n[SEARCH] 키워드: '{keyword}' (정렬: {order}, 최대: {max_results}개)")

        params = {
            "part": "snippet",
            "q": keyword,
            "type": "video",
            "order": order,
            "maxResults": max_results,
            "key": YOUTUBE_API_KEY,
            "regionCode": "KR",
            "relevanceLanguage": "ko",
        }

        # 쇼츠: 짧은 영상 필터
        if video_type == "shorts":
            params["videoDuration"] = "short"
        else:
            params["videoDuration"] = "medium"

        try:
            resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            items = data.get("items", [])
            print(f"  → 검색 결과: {len(items)}개")

            all_videos.extend(items)

        except Exception as e:
            print(f"  ❌ 검색 실패: {e}")

    return all_videos


def get_video_durations(video_ids: list[str]) -> dict[str, int]:
    """
    영상 ID 목록 → {video_id: duration_seconds} 반환
    """
    if not video_ids:
        return {}

    durations = {}

    # API는 한 번에 50개까지 조회 가능
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        params = {
            "part": "contentDetails",
            "id": ",".join(batch),
            "key": YOUTUBE_API_KEY,
        }

        try:
            resp = requests.get(YOUTUBE_VIDEOS_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            for item in data.get("items", []):
                vid = item["id"]
                duration_str = item["contentDetails"]["duration"]
                durations[vid] = parse_duration(duration_str)

        except Exception as e:
            print(f"  ❌ 영상 정보 조회 실패: {e}")

    return durations


def collect_youtube(keywords: list[str], video_type: str = "long") -> dict:
    """
    메인 수집 함수.

    1. DB에서 설정 로드 (정렬 기준, 최대 개수)
    2. 키워드 검색
    3. 영상 시간 필터 (롱/쇼츠)
    4. 자막 추출
    5. DB 저장
    """
    settings = get_youtube_settings()
    source_type = f"youtube_{video_type}"

    print(f"\n{'='*50}")
    print(f"[YOUTUBE] {video_type.upper()} 수집 시작")
    print(f"  키워드: {keywords}")
    print(f"  정렬: {settings['order']} | 최대: {settings['max_results']}개/키워드")
    print(f"{'='*50}")

    # 1. 검색
    items = search_videos(keywords, video_type, settings["order"], settings["max_results"])
    if not items:
        print("[YOUTUBE] 검색 결과 없음")
        return {"total": 0, "saved": 0, "skipped": 0}

    # 2. 영상 ID 추출 + 시간 조회
    video_ids = [item["id"]["videoId"] for item in items if isinstance(item["id"], dict)]
    durations = get_video_durations(video_ids)

    # 3. 자막 추출 + 데이터 변환
    posts = []
    for item in items:
        video_id = item["id"]["videoId"] if isinstance(item["id"], dict) else item["id"]
        duration = durations.get(video_id, 0)

        # 쇼츠/롱폼 필터
        if video_type == "shorts" and not is_shorts(duration):
            continue
        if video_type == "long" and is_shorts(duration):
            continue

        # 자막 추출
        transcript = get_transcript(video_id)
        status = "✅ 자막 있음" if transcript else "⚠️ 자막 없음"
        title = item["snippet"].get("title", "")[:40]
        print(f"  [{video_id}] {title}... {status}")

        parsed = parse_video_data(item, source_type, transcript)
        posts.append(parsed)

    # 4. DB 저장
    if not posts:
        print("\n[YOUTUBE] 수집된 영상 없음")
        return {"total": 0, "saved": 0, "skipped": 0}

    existing_hashes = check_duplicates([p["content_hash"] for p in posts])
    new_posts = [p for p in posts if p["content_hash"] not in existing_hashes]
    saved = save_sources(new_posts)
    skipped = len(posts) - len(new_posts)

    print(f"\n[RESULT] 수집: {len(posts)}개 | 저장: {saved}개 | 중복: {skipped}개")
    return {"total": len(posts), "saved": saved, "skipped": skipped}


# ── 메인 진입점 ──

def main():
    arg_parser = argparse.ArgumentParser(description="YouTube 영상/쇼츠 수집기")
    arg_parser.add_argument(
        "--type", choices=["long", "shorts"], default="long",
        help="수집 유형 (long: 롱폼, shorts: 쇼츠)"
    )
    arg_parser.add_argument(
        "--keywords", type=str, default="",
        help="검색 키워드 (쉼표 구분). 미지정 시 DB에서 로드"
    )

    args = arg_parser.parse_args()

    try:
        # 간격 체크
        settings = get_youtube_settings()
        if not should_run(args.type, settings["interval_hours"]):
            print(f"[SKIP] 유튜브_{args.type}: 아직 {settings['interval_hours']}시간이 경과하지 않음")
            return

        if args.keywords:
            keywords = [k.strip() for k in args.keywords.split(",")]
        else:
            # DB에서 키워드 로드
            configs = get_all_account_configs()
            keywords = []
            for config in configs:
                keywords.extend(config.get("scan_keywords", []))
            keywords = list(set(keywords))

        if not keywords:
            print("[ERROR] 키워드가 없습니다. --keywords 또는 DB 설정을 확인하세요.")
            sys.exit(1)

        result = collect_youtube(keywords, args.type)
        notify_scan_result(
            f"유튜브_{args.type}",
            result["total"],
            result["saved"],
            result["skipped"],
        )

    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error(f"유튜브 수집기 ({args.type})", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
