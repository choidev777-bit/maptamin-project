"""
AI 분석 엔진 단위 테스트
"""
import pytest
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyzer import parse_ai_response, build_classification_prompt, classify_batch


# ── AI 응답 JSON 파싱 테스트 ──

class TestParseAiResponse:
    def test_valid_json(self):
        """정상 JSON 응답 파싱"""
        raw = json.dumps([
            {
                "id": "abc123",
                "content_type": "A",
                "category": "마케팅",
                "hook_style": "질문형",
                "summary": "네이버 플레이스 상위 노출 방법 안내"
            }
        ])
        results = parse_ai_response(raw)
        assert len(results) == 1
        assert results[0]["content_type"] == "A"
        assert results[0]["category"] == "마케팅"
        assert results[0]["hook_style"] == "질문형"

    def test_multiple_items(self):
        """복수 항목 파싱"""
        raw = json.dumps([
            {"id": "1", "content_type": "A", "category": "SEO", "hook_style": "정보형", "summary": "요약1"},
            {"id": "2", "content_type": "B", "category": "마케팅", "hook_style": "공감형", "summary": "요약2"},
        ])
        results = parse_ai_response(raw)
        assert len(results) == 2

    def test_json_in_markdown_block(self):
        """마크다운 코드블록 안의 JSON 파싱"""
        raw = '```json\n[{"id":"1","content_type":"C","category":"후기","hook_style":"경험형","summary":"요약"}]\n```'
        results = parse_ai_response(raw)
        assert len(results) == 1
        assert results[0]["content_type"] == "C"

    def test_invalid_json(self):
        """잘못된 JSON → 빈 리스트"""
        results = parse_ai_response("이건 JSON이 아닙니다")
        assert results == []

    def test_missing_fields(self):
        """필수 필드 누락 → 기본값 적용"""
        raw = json.dumps([{"id": "1"}])
        results = parse_ai_response(raw)
        assert len(results) == 1
        assert results[0]["content_type"] == "unknown"
        assert results[0]["category"] == "기타"

    def test_invalid_content_type(self):
        """유효하지 않은 content_type → unknown"""
        raw = json.dumps([
            {"id": "1", "content_type": "Z", "category": "SEO", "hook_style": "정보형", "summary": "요약"}
        ])
        results = parse_ai_response(raw)
        assert results[0]["content_type"] == "unknown"


# ── 프롬프트 빌드 테스트 ──

class TestBuildPrompt:
    def test_prompt_contains_source_id(self):
        """프롬프트에 소재 ID 포함"""
        sources = [
            {"id": "test-id-1", "text_content": "테스트 내용입니다.", "source_type": "threads"},
        ]
        prompt = build_classification_prompt(sources)
        assert "test-id-1" in prompt
        assert "테스트 내용입니다" in prompt

    def test_prompt_has_json_format(self):
        """프롬프트에 JSON 형식 지시 포함"""
        sources = [
            {"id": "1", "text_content": "내용", "source_type": "threads"},
        ]
        prompt = build_classification_prompt(sources)
        assert "JSON" in prompt

    def test_prompt_truncates_long_text(self):
        """긴 텍스트는 잘림"""
        sources = [
            {"id": "1", "text_content": "가" * 5000, "source_type": "threads"},
        ]
        prompt = build_classification_prompt(sources)
        assert len(prompt) < 15000  # 합리적 길이 제한
