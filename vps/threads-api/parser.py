"""
스레드 DOM 파서
Playwright가 추출한 DOM에서 글 데이터를 파싱
"""
import hashlib
import re
from datetime import datetime, timezone


def parse_thread_post(element_data: dict) -> dict | None:
    """
    DOM에서 추출한 딕셔너리를 정규화된 소재 데이터로 변환

    Args:
        element_data: {
            "text": str,       # 글 텍스트
            "author": str,     # 작성자
            "likes": str,      # "2.3K" 또는 "450"
            "replies": str,    # "89"
            "reposts": str,    # "23"
            "url": str,        # 글 URL
            "time": str,       # 작성 시간 텍스트
        }

    Returns:
        정규화된 소재 dict 또는 None (파싱 실패 시)
    """
    text = (element_data.get("text") or "").strip()
    if not text or len(text) < 10:
        return None

    content_hash = generate_hash(text)

    return {
        "source_type": "threads",
        "input_method": "auto",
        "source_url": element_data.get("url"),
        "author": element_data.get("author"),
        "text_content": text,
        "content_hash": content_hash,
        "likes": parse_count(element_data.get("likes", "0")),
        "replies": parse_count(element_data.get("replies", "0")),
        "reposts": parse_count(element_data.get("reposts", "0")),
        "engagement_score": 0,  # 나중에 계산
    }


def generate_hash(text: str) -> str:
    """
    텍스트의 SHA-256 해시 생성 (중복 체크용)
    공백 정규화 후 해싱
    """
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:32]


def parse_count(count_str: str) -> int:
    """
    '2.3K', '1.1M', '450' 같은 문자열을 정수로 변환

    Examples:
        '2.3K' → 2300
        '1.1M' → 1100000
        '450'  → 450
        ''     → 0
    """
    if not count_str:
        return 0

    count_str = count_str.strip().replace(",", "")

    # 한국어 접미사 처리
    if '천' in count_str:
        try:
            return int(float(count_str.replace('천', '')) * 1000)
        except ValueError:
            return 0
    if '만' in count_str:
        try:
            return int(float(count_str.replace('만', '')) * 10000)
        except ValueError:
            return 0

    multipliers = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}

    for suffix, multiplier in multipliers.items():
        if count_str.upper().endswith(suffix):
            try:
                number = float(count_str[:-1])
                return int(number * multiplier)
            except ValueError:
                return 0

    try:
        return int(float(count_str))
    except ValueError:
        return 0


def calculate_engagement_score(
    likes: int, replies: int, reposts: int, views: int = 0
) -> float:
    """
    참여도 점수 계산
    가중치: 좋아요(1) + 답글(3) + 리포스트(5) + 조회수 보정
    """
    base = likes + (replies * 3) + (reposts * 5)

    # 조회수가 있으면 참여율도 반영
    if views and views > 0:
        engagement_rate = base / views
        base = base * (1 + engagement_rate)

    return round(base, 2)
