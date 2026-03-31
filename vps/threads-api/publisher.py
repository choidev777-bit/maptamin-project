"""
발행 스케줄러
approved/queued 상태의 콘텐츠를 Threads API로 자동 발행

사용법:
    python publisher.py                    # 전체 계정 1개씩 발행
    python publisher.py --account bono     # bono 계정만 발행
    python publisher.py --dry-run          # 실제 발행 없이 테스트
"""
import argparse
import random
import sys
import time
import traceback
from datetime import datetime, timezone

import requests

from config import ACCOUNTS
from db import supabase
from telegram_notify import send_telegram, notify_error


# ── DB 헬퍼 ──

def get_account_config(account: str) -> dict | None:
    result = supabase.table("threads_accounts_config").select("*").eq("account", account).single().execute()
    return result.data

def get_next_content(account: str) -> dict | None:
    """발행할 다음 콘텐츠 (queued 우선, 없으면 approved)"""
    # queued 먼저
    result = (
        supabase.table("threads_contents")
        .select("*")
        .eq("account", account)
        .eq("status", "queued")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]

    # queued 없으면 approved
    result = (
        supabase.table("threads_contents")
        .select("*")
        .eq("account", account)
        .eq("status", "approved")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None

def get_recent_publish_count(account: str) -> int:
    """오늘 발행 수 (KST 기준)"""
    from datetime import timedelta
    now_utc = datetime.now(timezone.utc)
    # KST 기준 오늘 0시 = UTC 전날 15시
    kst_offset = timedelta(hours=9)
    kst_now = now_utc + kst_offset
    kst_today_start = kst_now.replace(hour=0, minute=0, second=0, microsecond=0)
    utc_today_start = kst_today_start - kst_offset

    result = (
        supabase.table("threads_contents")
        .select("id", count="exact")
        .eq("account", account)
        .eq("status", "published")
        .gte("published_at", utc_today_start.isoformat())
        .execute()
    )
    return result.count or 0

def update_content_published(content_id: str, thread_post_id: str):
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("threads_contents").update({
        "status": "published",
        "published_at": now,
        "thread_post_id": thread_post_id,
    }).eq("id", content_id).execute()

def update_content_failed(content_id: str, error: str):
    supabase.table("threads_contents").update({
        "status": "failed",
        "engagement": {"error": error[:500]},
    }).eq("id", content_id).execute()


# ── Threads API ──

def threads_create_post(user_id: str, access_token: str, text: str, topic_tag: str = "") -> str:
    """Threads API로 글 게시. 반환: media_id"""
    # Step 1: 컨테이너 생성
    create_url = f"https://graph.threads.net/v1.0/{user_id}/threads"
    payload = {
        "media_type": "TEXT",
        "text": text,
        "access_token": access_token,
    }
    if topic_tag:
        payload["topic_tag"] = topic_tag
    resp = requests.post(create_url, data=payload, timeout=30)
    resp.raise_for_status()
    container_id = resp.json()["id"]

    # Step 2: 게시
    publish_url = f"https://graph.threads.net/v1.0/{user_id}/threads_publish"
    resp = requests.post(publish_url, data={
        "creation_id": container_id,
        "access_token": access_token,
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["id"]

def threads_reply(user_id: str, access_token: str, reply_to_id: str, text: str) -> str:
    """Threads API로 댓글 작성"""
    create_url = f"https://graph.threads.net/v1.0/{user_id}/threads"
    resp = requests.post(create_url, data={
        "media_type": "TEXT",
        "text": text,
        "reply_to_id": reply_to_id,
        "access_token": access_token,
    }, timeout=30)
    resp.raise_for_status()
    container_id = resp.json()["id"]

    publish_url = f"https://graph.threads.net/v1.0/{user_id}/threads_publish"
    resp = requests.post(publish_url, data={
        "creation_id": container_id,
        "access_token": access_token,
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["id"]


# ── 발행 로직 ──

def is_within_active_hours(config: dict) -> bool:
    """현재 시간이 활동 시간 내인지 확인 (KST 기준)"""
    from datetime import timedelta
    kst_now = datetime.now(timezone.utc) + timedelta(hours=9)
    hour = kst_now.hour
    start = config.get("active_hours_start", 8)
    end = config.get("active_hours_end", 23)
    return start <= hour < end

def publish_for_account(account: str, dry_run: bool = False) -> bool:
    """계정에 대해 1개 콘텐츠 발행"""
    config = get_account_config(account)
    if not config or not config.get("is_active", True):
        print(f"  ⏸️ {account}: 비활성 또는 설정 없음")
        return False

    if not is_within_active_hours(config):
        print(f"  ⏸️ {account}: 활동 시간 외")
        return False

    # 일일 제한 확인
    daily_count = get_recent_publish_count(account)
    daily_limit = config.get("daily_limit", 6)
    if daily_count >= daily_limit:
        print(f"  ⏸️ {account}: 일일 한도 ({daily_count}/{daily_limit})")
        return False

    # 발행할 콘텐츠 가져오기
    content = get_next_content(account)
    if not content:
        print(f"  📭 {account}: 발행 가능한 콘텐츠 없음")
        return False

    text = content["text_content"]
    print(f"  📝 {account}: [{content['parent_type']}] {text[:50]}...")

    if dry_run:
        print(f"  🧪 DRY-RUN: 실제 발행 건너뜀")
        return True

    # Threads API 발행
    creds = ACCOUNTS.get(account, {})
    user_id = creds.get("user_id")
    token = creds.get("access_token")

    if not user_id or not token:
        print(f"  ❌ {account}: API 인증 정보 없음")
        update_content_failed(content["id"], "API 인증 정보 없음")
        return False

    try:
        topic_tag = content.get("topic_tag") or ""
        post_id = threads_create_post(user_id, token, text, topic_tag)
        if topic_tag:
            print(f"  ✅ 게시 완료: {post_id} (#{topic_tag})")
        else:
            print(f"  ✅ 게시 완료: {post_id}")

        # 셀프댓글 타래 발행 (thread_parts가 2개 이상일 때만)
        thread_parts = content.get("thread_parts") or []
        if len(thread_parts) > 1:
            last_id = post_id  # 첫 댓글은 본문에 달림
            for i, part in enumerate(thread_parts[1:], 1):
                time.sleep(random.uniform(3, 8))
                try:
                    last_id = threads_reply(user_id, token, last_id, part)  # 체인형
                    print(f"  💬 타래 {i}/{len(thread_parts)-1}: {last_id}")
                except Exception as e:
                    print(f"  ⚠️ 타래 댓글 실패 (본문은 발행됨, 계속): {e}")
                    break  # 실패 시 이후 댓글 중단. 본문 발행은 성공 처리

        # 링크 댓글 삽입 (타래 체인 완료 후, 본문에 달림)
        if content.get("link_eligible") and content.get("link_comment"):
            time.sleep(random.uniform(3, 8))  # 자연스러운 딜레이
            reply_id = threads_reply(user_id, token, post_id, content["link_comment"])
            print(f"  🔗 링크 댓글: {reply_id}")

        update_content_published(content["id"], post_id)
        return True

    except Exception as e:
        print(f"  ❌ 발행 실패: {e}")
        update_content_failed(content["id"], str(e))
        return False


def publish_all(dry_run: bool = False):
    """모든 활성 계정에 대해 발행"""
    print(f"\n{'='*50}")
    print(f"[PUBLISHER] 발행 스케줄러 시작")
    print(f"  DRY-RUN: {dry_run}")
    print(f"{'='*50}")

    accounts = ["bono", "place"]
    results = {}

    for acc in accounts:
        print(f"\n[{acc}] 발행 시도...")
        success = publish_for_account(acc, dry_run)
        results[acc] = success

        if success and not dry_run:
            # 연속 발행 방지 (랜덤 딜레이)
            delay = random.uniform(30, 120)
            print(f"  ⏳ 다음 계정까지 {delay:.0f}초 대기")
            time.sleep(delay)

    published = sum(1 for s in results.values() if s)
    print(f"\n[RESULT] 발행: {published}/{len(accounts)}")
    return results


def main():
    parser = argparse.ArgumentParser(description="발행 스케줄러")
    parser.add_argument("--account", type=str, choices=["bono", "place"], help="특정 계정만")
    parser.add_argument("--dry-run", action="store_true", help="실제 발행 없이 테스트")
    args = parser.parse_args()

    try:
        if args.account:
            success = publish_for_account(args.account, args.dry_run)
            label = "성공" if success else "건너뜀"
        else:
            results = publish_all(args.dry_run)
            success_list = [k for k, v in results.items() if v]
            label = f"{len(success_list)}개 발행"

        if not args.dry_run:
            send_telegram(
                f"📤 <b>발행 완료</b>\n"
                f"결과: {label}"
            )
    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error("발행 스케줄러", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
