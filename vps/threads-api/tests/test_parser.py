"""
parser.py 단위 테스트
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parser import parse_thread_post, generate_hash, parse_count, calculate_engagement_score


class TestParseCount:
    def test_plain_number(self):
        assert parse_count("450") == 450

    def test_k_suffix(self):
        assert parse_count("2.3K") == 2300

    def test_m_suffix(self):
        assert parse_count("1.1M") == 1100000

    def test_empty_string(self):
        assert parse_count("") == 0

    def test_none(self):
        assert parse_count(None) == 0

    def test_comma_number(self):
        assert parse_count("1,234") == 1234

    def test_k_lowercase(self):
        assert parse_count("5.5k") == 5500


class TestGenerateHash:
    def test_same_text_same_hash(self):
        h1 = generate_hash("안녕하세요 테스트입니다")
        h2 = generate_hash("안녕하세요 테스트입니다")
        assert h1 == h2

    def test_whitespace_normalized(self):
        h1 = generate_hash("안녕하세요   테스트입니다")
        h2 = generate_hash("안녕하세요 테스트입니다")
        assert h1 == h2

    def test_different_text_different_hash(self):
        h1 = generate_hash("첫 번째 텍스트")
        h2 = generate_hash("두 번째 텍스트")
        assert h1 != h2

    def test_hash_length(self):
        h = generate_hash("테스트 텍스트")
        assert len(h) == 32


class TestParseThreadPost:
    def test_valid_post(self):
        raw = {
            "text": "이것은 충분히 긴 테스트 텍스트입니다. 최소 10자 이상이에요.",
            "author": "testuser",
            "url": "https://threads.net/@testuser/post/abc123",
            "likes": "2.3K",
            "replies": "89",
            "reposts": "23",
            "time": "",
        }
        result = parse_thread_post(raw)
        assert result is not None
        assert result["source_type"] == "threads"
        assert result["likes"] == 2300
        assert result["replies"] == 89
        assert result["reposts"] == 23
        assert result["content_hash"] is not None
        assert len(result["content_hash"]) == 32

    def test_short_text_returns_none(self):
        raw = {"text": "짧은 글", "author": "", "url": "", "likes": "0", "replies": "0", "reposts": "0", "time": ""}
        result = parse_thread_post(raw)
        assert result is None

    def test_empty_text_returns_none(self):
        raw = {"text": "", "author": "", "url": "", "likes": "0", "replies": "0", "reposts": "0", "time": ""}
        result = parse_thread_post(raw)
        assert result is None


class TestCalculateEngagementScore:
    def test_basic_calculation(self):
        score = calculate_engagement_score(100, 10, 5)
        # 100 + (10*3) + (5*5) = 100 + 30 + 25 = 155
        assert score == 155.0

    def test_with_views(self):
        score = calculate_engagement_score(100, 10, 5, views=1000)
        # base = 155, rate = 155/1000 = 0.155, final = 155 * 1.155 = 179.025
        assert score > 155.0

    def test_zero_values(self):
        score = calculate_engagement_score(0, 0, 0)
        assert score == 0.0
