"""
job_runner.py
대시보드에서 요청한 작업을 폴링하여 실행

Cron: */5 * * * * python3 /root/threads-api/job_runner.py
"""
import subprocess
import sys
import traceback
from datetime import datetime, timezone, timedelta

from db import get_pending_jobs, update_job_status, supabase
from telegram_notify import send_telegram, notify_error


# 작업 타입별 실행 명령
JOB_COMMANDS = {
    "scan_feed": ["python3", "/root/threads-api/scanner.py", "--mode", "feed", "--count", "200"],
    "scan_search": ["python3", "/root/threads-api/scanner.py", "--mode", "search", "--count", "200"],
    "youtube_long": ["python3", "/root/threads-api/youtube_collector.py", "--type", "long"],
    "youtube_shorts": ["python3", "/root/threads-api/youtube_collector.py", "--type", "shorts"],
    "analyze": ["python3", "/root/threads-api/analyzer.py"],
    "analyze_feed": ["python3", "/root/threads-api/analyzer.py", "--mode", "feed"],
    "analyze_keyword": ["python3", "/root/threads-api/analyzer.py", "--mode", "keyword"],
    "analyze_pattern": ["python3", "/root/threads-api/analyzer.py", "--mode", "pattern"],
    "generate": ["python3", "/root/threads-api/generator.py"],
    # URL 본문 추출 (수동 등록)
    "extract_youtube": ["python3", "/root/threads-api/extractor.py"],
    "extract_threads": ["python3", "/root/threads-api/extractor.py"],
    "extract_web": ["python3", "/root/threads-api/extractor.py"],
}


def timeout_stale_jobs():
    """
    30분 이상 running 상태인 작업을 timeout으로 변경
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()

    result = (
        supabase.table("threads_job_queue")
        .update({"status": "timeout", "completed_at": datetime.now(timezone.utc).isoformat()})
        .eq("status", "running")
        .lt("started_at", cutoff)
        .execute()
    )

    timed_out = len(result.data) if result.data else 0
    if timed_out > 0:
        send_telegram(f"⏰ {timed_out}개 작업 타임아웃 처리됨")


def has_duplicate_pending(job_type: str, current_job_id: str) -> bool:
    """
    같은 타입의 pending 작업이 이미 running 중인지 확인
    """
    result = (
        supabase.table("threads_job_queue")
        .select("id")
        .eq("job_type", job_type)
        .eq("status", "running")
        .execute()
    )
    return bool(result.data)


def run_job(job: dict):
    """
    단일 작업 실행
    """
    job_id = job["id"]
    job_type = job["job_type"]

    if job_type not in JOB_COMMANDS:
        update_job_status(job_id, "failed", f"알 수 없는 작업 타입: {job_type}")
        return

    # 같은 타입이 이미 실행 중이면 스킵
    if has_duplicate_pending(job_type, job_id):
        print(f"[SKIP] {job_type} 이미 실행 중")
        return

    print(f"[RUN] {job_type} (id: {job_id[:8]}...)")
    update_job_status(job_id, "running")

    try:
        cmd = JOB_COMMANDS[job_type]

        # params에서 추가 인자 적용
        params = job.get("params", {}) or {}
        if params.get("keywords"):
            cmd = cmd + ["--keywords", params["keywords"]]
        if params.get("count"):
            cmd = cmd + ["--count", str(params["count"])]
        if params.get("url"):
            cmd = cmd + ["--url", params["url"]]
        if params.get("source_id"):
            cmd = cmd + ["--source_id", params["source_id"]]

        # 분석 계열 작업은 라운드 쿨다운으로 오래 걸리므로 타임아웃 없음
        NOTIMEOUT_JOBS = {"analyze", "analyze_feed", "analyze_keyword", "analyze_pattern"}
        job_timeout = None if job_type in NOTIMEOUT_JOBS else 1800

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=job_timeout,
        )

        if result.returncode == 0:
            update_job_status(job_id, "done")
            print(f"[DONE] {job_type}")
        else:
            error_msg = result.stderr[:500] if result.stderr else "비정상 종료"
            update_job_status(job_id, "failed", error_msg)
            notify_error(f"Job {job_type}", error_msg)

    except subprocess.TimeoutExpired:
        update_job_status(job_id, "timeout", "30분 타임아웃 초과")
        notify_error(f"Job {job_type}", "30분 타임아웃 초과")

    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        update_job_status(job_id, "failed", error_msg[:500])
        notify_error(f"Job {job_type}", str(e))


def main():
    # 1. 타임아웃 처리
    timeout_stale_jobs()

    # 2. 대기 중인 작업 조회
    pending_jobs = get_pending_jobs()

    if not pending_jobs:
        return  # 할 일 없음

    print(f"[JOB_RUNNER] {len(pending_jobs)}개 대기 작업 발견")

    # 3. 하나씩 실행
    for job in pending_jobs:
        run_job(job)


if __name__ == "__main__":
    main()
