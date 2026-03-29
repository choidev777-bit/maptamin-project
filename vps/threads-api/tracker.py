"""
성과 트래커
발행된 글의 Threads API Insights 조회 + engagement 업데이트

사용법:
    python tracker.py                    # 최근 발행 글 성과 수집
    python tracker.py --days 7           # 최근 7일 발행 글
    python tracker.py --limit 50         # 최대 50개 추적
"""
import argparse
import sys
import traceback
from datetime import datetime, timezone, timedelta

import requests

from config import ACCOUNTS
from db import supabase
from telegram_notify import send_telegram, notify_error


# ── DB 헬퍼 ──

def get_published_contents(days: int = 3, limit: int = 30) -> list[dict]:
    """최근 N일 내 발행된 콘텐츠 조회"""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = (
        supabase.table("threads_contents")
        .select("id, account, parent_type, thread_post_id, text_content, engagement")
        .eq("status", "published")
        .not_.is_("thread_post_id", "null")
        .gte("published_at", since)
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def update_engagement(content_id: str, engagement: dict):
    supabase.table("threads_contents").update({
        "engagement": engagement,
    }).eq("id", content_id).execute()


def update_pattern_stats(parent_type: str):
    """타입별 패턴 성공률 집계"""
    # 해당 타입의 발행 글 engagement 조회
    result = (
        supabase.table("threads_contents")
        .select("pattern_id, engagement")
        .eq("parent_type", parent_type)
        .eq("status", "published")
        .not_.is_("pattern_id", "null")
        .execute()
    )
    if not result.data:
        return

    # 패턴별 평균 참여도 계산
    pattern_stats = {}
    for row in result.data:
        pid = row["pattern_id"]
        eng = row.get("engagement", {})
        score = eng.get("likes", 0) + eng.get("replies", 0) * 2 + eng.get("reposts", 0) * 3
        if pid not in pattern_stats:
            pattern_stats[pid] = {"scores": [], "count": 0}
        pattern_stats[pid]["scores"].append(score)
        pattern_stats[pid]["count"] += 1

    for pid, stats in pattern_stats.items():
        avg = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
        high = sum(1 for s in stats["scores"] if s >= 10)
        rate = high / len(stats["scores"]) if stats["scores"] else 0

        supabase.table("threads_patterns").update({
            "avg_engagement": round(avg, 2),
            "usage_count": stats["count"],
            "success_rate": round(rate, 3),
        }).eq("id", pid).execute()


# ── Threads Insights API ──

def get_thread_insights(thread_id: str, access_token: str) -> dict:
    """
    Threads API Insights 조회
    metrics: likes, replies, reposts, quotes, views
    """
    url = f"https://graph.threads.net/v1.0/{thread_id}/insights"
    params = {
        "metric": "likes,replies,reposts,quotes,views",
        "access_token": access_token,
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("data", [])

        result = {}
        for metric in data:
            name = metric.get("name", "")
            values = metric.get("values", [])
            if values:
                result[name] = values[0].get("value", 0)
        return result

    except requests.exceptions.HTTPError as e:
        if e.response and e.response.status_code == 400:
            # Insights가 아직 준비되지 않은 경우 (발행 직후)
            return {}
        raise
    except Exception as e:
        print(f"  ⚠️ Insights 조회 실패 [{thread_id}]: {e}")
        return {}


# ── 메인 로직 ──

def track_all(days: int = 3, limit: int = 30):
    """발행된 글의 성과 수집"""
    print(f"\n{'='*50}")
    print(f"[TRACKER] 성과 수집 시작")
    print(f"  기간: 최근 {days}일 | 최대: {limit}개")
    print(f"{'='*50}")

    contents = get_published_contents(days, limit)
    if not contents:
        print("\n[TRACKER] 추적할 발행 글 없음")
        return {"total": 0, "tracked": 0}

    print(f"\n[TRACKER] 발행 글: {len(contents)}개")

    tracked = 0
    total_likes = 0
    total_views = 0

    for c in contents:
        account = c["account"]
        thread_id = c["thread_post_id"]

        creds = ACCOUNTS.get(account, {})
        token = creds.get("access_token")
        if not token:
            continue

        engagement = get_thread_insights(thread_id, token)
        if engagement:
            update_engagement(c["id"], engagement)
            likes = engagement.get("likes", 0)
            views = engagement.get("views", 0)
            total_likes += likes
            total_views += views
            tracked += 1
            print(f"  ✅ [{account}/{c['parent_type']}] 좋아요:{likes} 조회:{views} 답글:{engagement.get('replies', 0)}")
        else:
            print(f"  ⏳ [{account}] 아직 데이터 없음")

    # 패턴 통계 업데이트
    for t in ["A", "B", "C", "D"]:
        update_pattern_stats(t)

    print(f"\n[RESULT] 추적: {tracked}/{len(contents)} | 총 좋아요: {total_likes} | 총 조회: {total_views}")
    return {"total": len(contents), "tracked": tracked, "likes": total_likes, "views": total_views}


def main():
    parser = argparse.ArgumentParser(description="성과 트래커")
    parser.add_argument("--days", type=int, default=3, help="추적 기간 (일)")
    parser.add_argument("--limit", type=int, default=30, help="최대 추적 수")
    args = parser.parse_args()

    try:
        result = track_all(args.days, args.limit)
        send_telegram(
            f"📊 <b>성과 수집 완료</b>\n"
            f"추적: {result['tracked']}/{result['total']}개\n"
            f"총 좋아요: {result.get('likes', 0)} | 총 조회: {result.get('views', 0)}"
        )
    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error("성과 트래커", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
