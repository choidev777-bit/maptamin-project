"""
scheduler.py
DB 스케줄 설정을 읽어 적시에 job_queue에 작업 등록

Cron: */5 * * * * cd /root/threads-api && python3 scheduler.py >> /var/log/threads-scheduler.log 2>&1
"""
from datetime import datetime, timezone, timedelta

from db import get_product_config, supabase

KST = timezone(timedelta(hours=9))

# DB schedule 컬럼명 → job_queue job_type 매핑
SCHEDULE_MAP = {
    "schedule_scan_feed": "scan_feed",
    "schedule_scan_search": "scan_search",
    "schedule_analyze": "analyze",          # legacy (하위 호환 유지)
    "schedule_analyze_feed": "analyze_feed",    # v4: 피드 패턴 추출
    "schedule_analyze_keyword": "analyze_keyword",  # v4: 키워드 내용 판단
    "schedule_generate": "generate",
    "schedule_youtube": "youtube_long",
}


def has_active_job(job_type: str) -> bool:
    """pending 또는 running 상태인 동일 job_type이 있는지 확인"""
    result = (
        supabase.table("threads_job_queue")
        .select("id")
        .eq("job_type", job_type)
        .in_("status", ["pending", "running"])
        .limit(1)
        .execute()
    )
    return bool(result.data)


def enqueue_job(job_type: str):
    """job_queue에 작업 등록"""
    supabase.table("threads_job_queue").insert({
        "job_type": job_type,
        "params": {},
    }).execute()
    print(f"  ✅ 등록: {job_type}")


def main():
    now = datetime.now(KST)
    weekday = now.weekday()  # 0=월, 1=화, ... 6=일
    hour = now.hour
    minute = now.minute

    print(f"\n[SCHEDULER] {now.strftime('%Y-%m-%d %H:%M')} KST (요일={weekday}, 시={hour}, 분={minute})")

    # 5분 윈도우 (0~4분)에만 매칭
    if minute >= 5:
        print("  ⏭ 분(minute)이 5 이상이므로 스킵")
        return

    config = get_product_config()
    if not config:
        print("  ❌ product_config를 읽을 수 없음")
        return

    matched = 0
    for schedule_key, job_type in SCHEDULE_MAP.items():
        schedule = config.get(schedule_key)
        if not schedule:
            continue

        days = schedule.get("days", [])
        times = schedule.get("times", [])

        if weekday not in days:
            continue

        current_hour_str = f"{hour:02d}:00"
        if current_hour_str not in times:
            continue

        # 매칭됨 → 중복 체크 후 등록
        if has_active_job(job_type):
            print(f"  ⏭ {job_type}: 이미 pending/running 작업 있음")
            continue

        enqueue_job(job_type)
        matched += 1

    if matched == 0:
        print("  ℹ 매칭된 스케줄 없음")


if __name__ == "__main__":
    main()
