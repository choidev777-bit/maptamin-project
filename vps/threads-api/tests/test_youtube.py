"""
유튜브 수집기 단위 테스트
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from youtube_collector import (
    format_transcript,
    parse_video_data,
    parse_duration,
    is_shorts,
)
from parser import generate_hash


# ── 자막 포맷팅 테스트 ──

class TestFormatTranscript:
    def test_basic_transcript(self):
        """기본 자막 조각 → 하나의 텍스트"""
        segments = [
            {"text": "안녕하세요", "start": 0.0, "duration": 2.0},
            {"text": "오늘은 마케팅", "start": 2.0, "duration": 3.0},
            {"text": "얘기를 하겠습니다", "start": 5.0, "duration": 2.5},
        ]
        result = format_transcript(segments)
        assert result == "안녕하세요 오늘은 마케팅 얘기를 하겠습니다"

    def test_empty_transcript(self):
        """빈 자막"""
        assert format_transcript([]) == ""

    def test_strips_whitespace(self):
        """공백 정리"""
        segments = [
            {"text": "  공백 있는   텍스트  ", "start": 0.0, "duration": 1.0},
        ]
        result = format_transcript(segments)
        assert "공백 있는" in result

    def test_newline_removal(self):
        """줄바꿈 제거"""
        segments = [
            {"text": "첫째줄\n둘째줄", "start": 0.0, "duration": 1.0},
        ]
        result = format_transcript(segments)
        assert "\n" not in result

    def test_max_length_truncation(self):
        """최대 길이 제한"""
        segments = [
            {"text": "가" * 5000, "start": 0.0, "duration": 1.0},
        ]
        result = format_transcript(segments, max_length=1000)
        assert len(result) <= 1000


# ── 영상 데이터 파싱 테스트 ──

class TestParseVideoData:
    def test_basic_video(self):
        """기본 영상 데이터 변환"""
        item = {
            "id": {"videoId": "abc123"},
            "snippet": {
                "title": "네이버 플레이스 순위 올리는 법",
                "channelTitle": "마케팅채널",
                "description": "3분 요약",
                "publishedAt": "2026-03-20T10:00:00Z",
            },
        }
        result = parse_video_data(item, source_type="youtube_long", transcript="자막 전체 내용")
        assert result["source_type"] == "youtube_long"
        assert result["author"] == "마케팅채널"
        assert result["source_url"] == "https://www.youtube.com/watch?v=abc123"
        assert "네이버 플레이스 순위 올리는 법" in result["text_content"]
        assert "자막 전체 내용" in result["text_content"]
        assert result["content_hash"]  # hash 존재 확인

    def test_no_transcript(self):
        """자막 없는 경우 — 제목+설명만으로 저장"""
        item = {
            "id": {"videoId": "xyz789"},
            "snippet": {
                "title": "테스트 영상",
                "channelTitle": "테스트 채널",
                "description": "설명입니다",
                "publishedAt": "2026-03-20T10:00:00Z",
            },
        }
        result = parse_video_data(item, source_type="youtube_shorts", transcript="")
        assert result["source_type"] == "youtube_shorts"
        assert "테스트 영상" in result["text_content"]

    def test_duplicate_hash(self):
        """같은 영상 → 같은 해시"""
        item = {
            "id": {"videoId": "same_id"},
            "snippet": {
                "title": "동일 영상",
                "channelTitle": "채널",
                "description": "",
                "publishedAt": "2026-03-20T10:00:00Z",
            },
        }
        r1 = parse_video_data(item, "youtube_long", "자막")
        r2 = parse_video_data(item, "youtube_long", "자막")
        assert r1["content_hash"] == r2["content_hash"]


# ── 시간 파싱 테스트 ──

class TestParseDuration:
    def test_minutes_seconds(self):
        """PT5M30S → 330초"""
        assert parse_duration("PT5M30S") == 330

    def test_hours(self):
        """PT1H2M3S → 3723초"""
        assert parse_duration("PT1H2M3S") == 3723

    def test_seconds_only(self):
        """PT45S → 45초"""
        assert parse_duration("PT45S") == 45

    def test_minutes_only(self):
        """PT10M → 600초"""
        assert parse_duration("PT10M") == 600


# ── 쇼츠 판별 테스트 ──

class TestIsShorts:
    def test_short_duration(self):
        """60초 이하 → 쇼츠"""
        assert is_shorts(55) is True

    def test_long_duration(self):
        """61초 이상 → 롱폼"""
        assert is_shorts(120) is False

    def test_exactly_60(self):
        """정확히 60초 → 쇼츠"""
        assert is_shorts(60) is True
