"""
텔레그램 알림 전송
"""
import requests
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID


def send_telegram(message: str):
    """텔레그램으로 메시지 전송"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"[TELEGRAM 미설정] {message}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML",
        }, timeout=10)
    except Exception as e:
        print(f"[TELEGRAM 전송 실패] {e}")


def notify_scan_result(mode: str, total: int, saved: int, skipped: int):
    """스캔 결과 알림"""
    send_telegram(
        f"📥 <b>스레드 스캔 완료</b>\n"
        f"모드: {mode}\n"
        f"수집: {total}개 | 저장: {saved}개 | 중복: {skipped}개"
    )


def notify_error(task: str, error: str):
    """에러 알림"""
    send_telegram(
        f"❌ <b>{task} 실패</b>\n"
        f"에러: {error[:200]}"
    )
