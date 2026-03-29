"""
AI 분석 엔진
수집된 소재를 z.ai GLM API로 분류 (타입/카테고리/훅스타일)

사용법:
    python analyzer.py                    # 미분석 소재 전체 분류
    python analyzer.py --limit 10         # 10개만 분류
    python analyzer.py --batch-size 5     # 5개씩 배치 처리
"""
import argparse
import json
import re
import sys
import traceback
from datetime import datetime, timezone

import requests

from config import OPENCLAW_API_URL, OPENCLAW_API_KEY
from db import get_unanalyzed_sources, supabase
from telegram_notify import notify_scan_result, notify_error


# ── 설정 ──

VALID_TYPES = {"A", "B", "C", "D"}
DEFAULT_BATCH_SIZE = 10
DEFAULT_MODEL = "glm-4.5-air"
TEXT_MAX_LENGTH = 800  # 소재별 텍스트 최대 길이 (토큰 절약)


# ── 프롬프트 ──

SYSTEM_PROMPT = """당신은 소셜미디어 마케팅 콘텐츠 분석 전문가입니다.
주어진 소재(스레드 글, 유튜브 자막)를 분석하여 JSON 형식으로 분류하세요.

분류 기준:
- content_type (글의 역할/목적 기준):
  A = 트래픽 유도 (짧고 자극적, 어그로, 논란, 궁금증 유발, 댓글 유도형)
  B = 인사이트 (유익한 정보, 팁, 체크리스트, 리스트, 가이드, 소장 가치)
  C = 라포/신뢰 (경험담, 일상, 공감, 후기, 스토리텔링, 개인적 이야기)
  D = 트렌드 (시사, 뉴스 반응, 빠른 타이밍, 이슈 코멘트)

- category: 소재의 주제 (예: 마케팅, SEO, 플레이스, 소상공인, 브랜딩, SNS, 창업 등)

- hook_style: 소재의 도입부 스타일 (예: 위협형, 라벨링형, 질문형, 충격형, 공감형, 리스트형, 반전형, 고백형)

- summary: 소재의 핵심 내용 한 줄 요약 (30자 이내)

반드시 순수 JSON 배열만 출력하세요. 마크다운이나 설명을 붙이지 마세요."""


def build_classification_prompt(sources: list[dict]) -> str:
    """
    소재 목록 → AI에게 보낼 프롬프트 생성
    """
    items = []
    for s in sources:
        text = (s.get("text_content") or "")[:TEXT_MAX_LENGTH]
        items.append(
            f"---\nID: {s['id']}\n출처: {s.get('source_type', 'unknown')}\n내용: {text}\n---"
        )

    return f"""다음 {len(sources)}개 소재를 분류하세요.

{chr(10).join(items)}

각 소재에 대해 다음 형식의 JSON 배열로 응답하세요:
[
  {{"id": "소재ID", "content_type": "A/B/C/D", "category": "주제", "hook_style": "스타일", "summary": "한줄요약"}}
]"""


# ── AI 응답 파싱 ──

def parse_ai_response(raw_text: str) -> list[dict]:
    """
    AI 응답 텍스트에서 JSON 배열 추출 및 검증.
    마크다운 코드블록(```json...```) 안의 JSON도 처리.
    """
    text = raw_text.strip()

    # 마크다운 코드블록 제거
    code_block_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    # JSON 배열 찾기
    bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
    if bracket_match:
        text = bracket_match.group(0)

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print(f"  ❌ JSON 파싱 실패: {raw_text[:200]}...")
        return []

    if not isinstance(data, list):
        data = [data]

    # 필드 검증 및 기본값 적용
    results = []
    for item in data:
        ct = item.get("content_type", "unknown")
        if ct not in VALID_TYPES:
            ct = "unknown"

        results.append({
            "id": item.get("id", ""),
            "content_type": ct,
            "category": item.get("category", "기타"),
            "hook_style": item.get("hook_style", "기타"),
            "summary": item.get("summary", ""),
        })

    return results


# ── AI API 호출 ──

def call_ai(prompt: str) -> str:
    """
    z.ai GLM API 호출 (OpenAI 호환 형식)
    """
    if not OPENCLAW_API_URL or not OPENCLAW_API_KEY:
        raise RuntimeError("OPENCLAW_API_URL 또는 OPENCLAW_API_KEY가 설정되지 않았습니다")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENCLAW_API_KEY}",
    }

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
    }

    resp = requests.post(OPENCLAW_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    return data["choices"][0]["message"]["content"]


# ── 배치 분류 ──

def classify_batch(sources: list[dict]) -> list[dict]:
    """
    소재 배치를 AI에 보내고 분류 결과 반환.
    """
    if not sources:
        return []

    prompt = build_classification_prompt(sources)
    raw_response = call_ai(prompt)
    results = parse_ai_response(raw_response)

    return results


def update_analysis_results(results: list[dict]):
    """
    분류 결과를 DB에 업데이트.
    """
    now = datetime.now(timezone.utc).isoformat()
    updated = 0

    for r in results:
        if not r.get("id"):
            continue

        try:
            supabase.table("threads_raw_sources").update({
                "content_type": r["content_type"],
                "category": r["category"],
                "hook_style": r["hook_style"],
                "ai_summary": r["summary"],
                "analyzed_at": now,
            }).eq("id", r["id"]).execute()
            updated += 1
        except Exception as e:
            print(f"  ❌ DB 업데이트 실패 [{r['id']}]: {e}")

    return updated


# ── 메인 실행 ──

def analyze_all(limit: int = 100, batch_size: int = DEFAULT_BATCH_SIZE):
    """
    미분석 소재를 배치로 AI 분류 + DB 업데이트.
    """
    print(f"\n{'='*50}")
    print(f"[ANALYZER] AI 분류 시작")
    print(f"  최대: {limit}개 | 배치: {batch_size}개씩")
    print(f"  모델: {DEFAULT_MODEL}")
    print(f"{'='*50}")

    sources = get_unanalyzed_sources(limit)
    if not sources:
        print("\n[ANALYZER] 미분석 소재 없음")
        return {"total": 0, "analyzed": 0, "failed": 0}

    print(f"\n[ANALYZER] 미분석 소재: {len(sources)}개")

    total_analyzed = 0
    total_failed = 0

    # 배치 처리
    for i in range(0, len(sources), batch_size):
        batch = sources[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(sources) + batch_size - 1) // batch_size

        print(f"\n[BATCH {batch_num}/{total_batches}] {len(batch)}개 분류 중...")

        try:
            results = classify_batch(batch)
            if results:
                updated = update_analysis_results(results)
                total_analyzed += updated
                print(f"  ✅ {updated}개 분류 완료")
            else:
                total_failed += len(batch)
                print(f"  ❌ AI 응답 파싱 실패")
        except Exception as e:
            total_failed += len(batch)
            print(f"  ❌ 배치 처리 실패: {e}")

    print(f"\n[RESULT] 전체: {len(sources)}개 | 분류: {total_analyzed}개 | 실패: {total_failed}개")
    return {"total": len(sources), "analyzed": total_analyzed, "failed": total_failed}


def main():
    arg_parser = argparse.ArgumentParser(description="AI 분석 엔진")
    arg_parser.add_argument("--limit", type=int, default=100, help="분석할 최대 소재 수")
    arg_parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="배치 크기")

    args = arg_parser.parse_args()

    try:
        result = analyze_all(args.limit, args.batch_size)
        notify_scan_result(
            "AI_분류",
            result["total"],
            result["analyzed"],
            result["failed"],
        )
    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error("AI 분석 엔진", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
