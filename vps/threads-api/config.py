"""
환경 변수 관리
.env 파일에서 로드
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# --- Threads API ---
BONO_USER_ID = os.getenv("BONO_USER_ID")
BONO_ACCESS_TOKEN = os.getenv("BONO_ACCESS_TOKEN")
PLACE_USER_ID = os.getenv("PLACE_USER_ID")
PLACE_ACCESS_TOKEN = os.getenv("PLACE_ACCESS_TOKEN")

# --- Telegram ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# --- OpenClaw z.ai lite ---
OPENCLAW_API_URL = os.getenv("OPENCLAW_API_URL", "")
OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY", "")

# --- YouTube ---
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# --- 계정 매핑 ---
ACCOUNTS = {
    "bono": {
        "user_id": BONO_USER_ID,
        "access_token": BONO_ACCESS_TOKEN,
    },
    "place": {
        "user_id": PLACE_USER_ID,
        "access_token": PLACE_ACCESS_TOKEN,
    },
}


def validate_config():
    """필수 환경 변수 검증"""
    required = {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise RuntimeError(f"필수 환경 변수 누락: {', '.join(missing)}")
