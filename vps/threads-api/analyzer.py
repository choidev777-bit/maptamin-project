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
DEFAULT_BATCH_SIZE = 5
DEFAULT_MODEL = "glm-4.7"
TEXT_MAX_LENGTH = 3000  # 내용 소재 핵심 포인트 추출을 위해 허용 길이 확장


# ── 프롬프트 ──

SYSTEM_PROMPT = """당신은 소셜미디어 마케팅 콘텐츠 분석 전문가입니다.
주어진 소재(스레드 글, 유튜브 자막, 웹 글)를 분석하여 JSON 배열로 응답하세요.

분류 기준:
1. source_role (마케팅 자동화 용도):
   - content: 지식, 정보, 사례 등 글의 내용적 바탕이 될 소재. (유의미한 정보성 요소가 있어야 함)
   - pattern: 글쓰기 구조, 어투, 훅 방식, 템플릿 등 형식적 바탕이 될 소재. (주로 짧고 임팩트 있는 스레드/트위터 글 등)
   - both: 내용과 형식 모두 훌륭하여 양쪽 모두 참고할 가치가 있는 소재.
   - none: 개인적인 일기, 단순 광고, 욕설 등 자동화 소재로 부적합한 소재.

2. content_type (글의 역할/목적):
   - A = 트래픽 유도 (짧고 자극적, 어그로, 논란, 궁금증 유발, 댓글 유도형)
   - B = 인사이트 (유익한 정보, 팁, 체크리스트, 리스트, 가이드, 소장 가치)
   - C = 라포/신뢰 (경험담, 일상, 공감, 후기, 스토리텔링, 개인적 이야기)
   - D = 트렌드 (시사, 뉴스 반응, 빠른 타이밍, 이슈 코멘트)

3. 공통:
   - category: 소재의 주제 (예: 마케팅, SEO, 플레이스, 소상공인, 브랜딩 등)
   - hook_style: 소재의 도입부 스타일 (예: 질문형, 위협형, 라벨링형 등)
   - summary: 소재의 핵심 내용 한 줄 요약 (30자 이내)

4. 내용 관련 (source_role이 content/both인 경우만 채우고, 아니면 빈 배열):
   - key_points: 소재의 가장 핵심 정보/주장/팁을 3~5개의 구체적인 문장(문자열 배열)으로 요약.

5. 패턴 관련 (source_role이 pattern/both인 경우만 채우고, 아니면 빈 문자열):
   - pattern_name: 이 패턴의 직관적인 이름 (예: 리스트형 질문 패턴)
   - hook_template: 도입부 템플릿 요약 (예: [고민] + [확신에 찬 해결책 제시])
   - body_structure: 본문 전개 구조 요약 (예: 문제 상황 -> 3가지 팁 제시 -> 적용 사례)
   - cta_template: 도달/댓글 유도 방식 결론 (예: 상세 정보를 요청하도록 유도)

반드시 순수 JSON 배열만 출력하세요. 마크다운이나 설명을 붙이지 마세요."""


def build_classification_prompt(sources: list[dict]) -> str:
    """
    소재 목록 → AI에게 보낼 프롬프트 생성
    """
    items = []
    for s in sources:
        # 이미 역할이 지정된 수동 소재 처리
        role_hint = f"\n용도 힌트(수동지정): {s.get('source_role')}" if s.get('source_role') else ""
        text = (s.get("text_content") or "")[:TEXT_MAX_LENGTH]
        items.append(
            f"---\nID: {s['id']}\n출처: {s.get('source_type', 'unknown')}{role_hint}\n내용: {text}\n---"
        )

    return f"""다음 {len(sources)}개 소재를 분류하세요.

{chr(10).join(items)}

응답 JSON 형식:
[
  {{
    "id": "소재ID",
    "source_role": "content / pattern / both / none",
    "content_type": "A/B/C/D",
    "category": "주제",
    "hook_style": "스타일",
    "summary": "한줄요약",
    "key_points": ["핵심1", "핵심2", "핵심3"],
    "pattern_name": "이름",
    "hook_template": "도입부",
    "body_structure": "전개",
    "cta_template": "결론"
  }}
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
            
        sr = str(item.get("source_role", "none")).lower().strip().split("/")[0]
        if sr not in ("content", "pattern", "both", "none"):
            sr = "none"
            
        kp = item.get("key_points")
        if not isinstance(kp, list):
            kp = []

        results.append({
            "id": item.get("id", ""),
            "source_role": sr,
            "content_type": ct,
            "category": str(item.get("category", "기타"))[:50],
            "hook_style": str(item.get("hook_style", "기타"))[:50],
            "summary": str(item.get("summary", ""))[:100],
            "key_points": kp,
            "pattern_name": str(item.get("pattern_name", ""))[:100],
            "hook_template": str(item.get("hook_template", "")),
            "body_structure": str(item.get("body_structure", "")),
            "cta_template": str(item.get("cta_template", ""))
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

    resp = requests.post(OPENCLAW_API_URL, json=payload, headers=headers, timeout=120)
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


def update_analysis_results(results: list[dict], original_sources: list[dict] = None):
    """
    분류 결과를 DB에 업데이트하고, 패턴인 경우 threads_patterns에도 추가 등록.
    """
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    
    source_map = {s["id"]: s for s in original_sources} if original_sources else {}

    for r in results:
        if not r.get("id"):
            continue

        try:
            # 원본 소스 정보 읽어오기 (기존에 DB에 보존된 source_role이 수동으로 지정되어 있을 수 있음)
            original = source_map.get(r["id"], {})
            
            # 수동 등록 소재의 경우(이미 source_role 지정됨), 기존 role을 유지
            final_role = original.get("source_role") or r["source_role"]

            supabase.table("threads_raw_sources").update({
                "source_role": final_role,
                "content_type": r["content_type"],
                "category": r["category"],
                "hook_style": r["hook_style"],
                "ai_summary": r["summary"],
                "ai_key_points": r["key_points"],
                "analyzed_at": now,
            }).eq("id", r["id"]).execute()
            
            # 패턴 소재인 경우 threads_patterns 에 삽입 (미리 삽입된 적 없을 때만 하거나 그냥 추가)
            if final_role in ("pattern", "both") and r["content_type"] in VALID_TYPES:
                # 간단한 engagement_score 계산 (패턴 테이블 초기값으로 참고)
                base_engagement = original.get("likes", 0) * 1.0 + original.get("replies", 0) * 2.0
                
                p_data = {
                    "parent_type": r["content_type"],
                    "pattern_name": r["pattern_name"] or "미분류 패턴",
                    "hook_template": r["hook_template"],
                    "body_structure": r["body_structure"],
                    "cta_template": r["cta_template"],
                    "avg_engagement": float(base_engagement),
                    "usage_count": 0,
                    "success_rate": 0
                }
                # insert만 수행 (패턴은 중복되더라도 일단 쌓기)
                supabase.table("threads_patterns").insert(p_data).execute()

            updated += 1
        except Exception as e:
            print(f"  ❌ DB 업데이트 실패 [{r['id']}]: {e}")

    return updated


# ── 메인 실행 ──

def cleanup_none_sources() -> int:
    """
    AI 분석 완료 후 source_role='none'으로 판정된 행 제거.
    마케팅 소재로 부적합한 쓸모없는 데이터를 정리하여 DB 비대화 방지.
    """
    try:
        result = (
            supabase.table("threads_raw_sources")
            .delete()
            .eq("source_role", "none")
            .not_.is_("analyzed_at", "null")
            .execute()
        )
        deleted = len(result.data) if result.data else 0
        print(f"\n[정리] source_role=none 삭제: {deleted}개")
        return deleted
    except Exception as e:
        print(f"  ❌ 정리 필터 실패: {e}")
        return 0


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
                updated = update_analysis_results(results, batch)
                total_analyzed += updated
                print(f"  ✅ {updated}개 분류 완료")
            else:
                total_failed += len(batch)
                print(f"  ❌ AI 응답 파싱 실패")
        except Exception as e:
            total_failed += len(batch)
            print(f"  ❌ 배치 처리 실패: {e}")

    print(f"\n[RESULT] 전체: {len(sources)}개 | 분류: {total_analyzed}개 | 실패: {total_failed}개")

    # 분석 완료 후 none 소재 자동 정리
    deleted = cleanup_none_sources()

    return {"total": len(sources), "analyzed": total_analyzed, "failed": total_failed, "deleted": deleted}


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
