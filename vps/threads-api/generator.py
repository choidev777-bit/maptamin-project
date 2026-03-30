"""
AI 콘텐츠 생성기
수집·분석된 소재 + 패턴을 기반으로 발행 가능한 글을 자동 생성

사용법:
    python generator.py                         # 기본 (계정당 3개씩)
    python generator.py --account bono --count 5 # bono 계정 5개
    python generator.py --type A                 # A 타입만 생성
"""
import argparse
import json
import re
import sys
import traceback
from datetime import datetime, timezone

import requests

from config import OPENCLAW_API_URL, OPENCLAW_API_KEY
from db import supabase, get_account_config, get_product_config
from telegram_notify import send_telegram, notify_error


# ── 설정 ──

DEFAULT_MODEL = "glm-4.7"
CYCLE_ORDER = ["A", "B", "C", "D"]  # 사이클 패턴


# ── DB 헬퍼 ──

def get_content_source() -> dict | None:
    """
    내용 소재 1개 조회 (source_role = content 또는 both, 분석 완료, ABCD 타입 무관)
    가장 오래된(먼저 등록된) 것부터 소비
    """
    result = (
        supabase.table("threads_raw_sources")
        .select("id, text_content, ai_key_points, ai_summary, source_type, category")
        .or_("source_role.eq.content,source_role.eq.both")
        .not_.is_("analyzed_at", "null")
        .order("collected_at", desc=False)  # 오래된 것 먼저
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def delete_content_source(source_id: str):
    """사용된 내용 소재 삭제"""
    supabase.table("threads_raw_sources").delete().eq("id", source_id).execute()
    print(f"  🗑️ 내용 소재 삭제: {source_id[:8]}...")

def get_patterns(content_type: str) -> list[dict]:
    result = (
        supabase.table("threads_patterns")
        .select("*")
        .eq("parent_type", content_type)
        .order("success_rate", desc=True)
        .limit(3)
        .execute()
    )
    return result.data or []

def get_next_cycle_type(account: str) -> str:
    """계정의 최근 발행 타입 기반으로 다음 사이클 타입 결정"""
    result = (
        supabase.table("threads_contents")
        .select("parent_type")
        .eq("account", account)
        .in_("status", ["published", "queued", "approved"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return "A"
    last = result.data[0]["parent_type"]
    idx = CYCLE_ORDER.index(last) if last in CYCLE_ORDER else -1
    return CYCLE_ORDER[(idx + 1) % len(CYCLE_ORDER)]

def save_content(content: dict):
    supabase.table("threads_contents").insert(content).execute()


# ── AI 프롬프트 ──

def build_generation_prompt(
    account_config: dict,
    product_config: dict | None,
    content_type: str,
    content_source: dict | None,
    patterns: list[dict],
) -> str:
    """콘텐츠 생성 프롬프트 빌드"""

    # 내용 소재 포맷 (ai_key_points 우선, 없으면 text_content 폴백)
    content_text = ""
    if content_source:
        key_points = content_source.get("ai_key_points") or []
        category = content_source.get("category", "")
        summary = content_source.get("ai_summary", "")

        if key_points:
            kp_formatted = "\n".join(f"  - {kp}" for kp in key_points)
            content_text = f"""\n\n📝 아래 소재의 내용을 바탕으로 글을 작성하세요:
주제: {category}
요약: {summary}
핵심 포인트:
{kp_formatted}"""
        else:
            # key_points 없으면 본문 직접 전달
            raw = (content_source.get("text_content") or "")[:2000]
            content_text = f"""\n\n📝 아래 소재의 내용을 바탕으로 글을 작성하세요:
주제: {category}
원문 (참고용):
{raw}"""

    # 패턴 포맷
    pattern_text = ""
    if patterns:
        p = patterns[0]
        pattern_text = f"\n\n🎯 추천 패턴 (이 구조/스타일로 작성): {p.get('pattern_name', '')}\n" \
                       f"훅: {p.get('hook_template', '없음')}\n" \
                       f"구조: {p.get('body_structure', '없음')}\n" \
                       f"CTA: {p.get('cta_template', '없음')}"

    # 제품 정보
    product_text = ""
    if product_config:
        product_text = f"\n\n제품 정보 (link_eligible=true일 때만 댓글에 자연스럽게 언급):\n" \
                       f"이름: {product_config.get('product_name', '')}\n" \
                       f"설명: {product_config.get('product_description', '')}\n" \
                       f"링크: {product_config.get('product_link', '')}\n" \
                       f"댓글 템플릿: {', '.join(product_config.get('link_comment_templates', []))}"

    type_desc = {
        "A": "트래픽 유도 (짧고 자극적, 어그로, 논란, 궁금증, 댓글 유도형. 2~4줄)",
        "B": "인사이트 (유익한 정보, 팁, 체크리스트, 리스트, 가이드. 5~10줄)",
        "C": "라포/신뢰 (경험담, 일상, 공감, 개인적 이야기. 3~6줄)",
        "D": "트렌드 (시사/뉴스 반응, 빠른 타이밍. 2~5줄)",
    }

    banned = ", ".join(account_config.get("banned_words", []))

    # 폴백 안내 (내용 소재 없을 때)
    fallback_note = ""
    if not content_source:
        fallback_note = "\n\n(내용 소재가 없습니다. 계정 주제를 바탕으로 자체적으로 유용한 글을 작성하세요.)"

    return f"""당신은 Threads 소셜미디어 마케터입니다.

계정 정보:
- 표시명: @{account_config.get('display_name', '')}
- 주제: {account_config.get('topic', '')}
- 말투: {account_config.get('tone', '')}
- 금지어: {banned}

생성할 콘텐츠 타입: {content_type} ({type_desc.get(content_type, '')})
{pattern_text}{content_text}{product_text}{fallback_note}

다음 규칙을 반드시 지키세요:
1. 금지어는 절대 사용하지 마세요.
2. 자연스러운 한국어로 작성하세요. AI가 쓴 느낌이 나면 안 됩니다.
3. 해시태그를 넣지 마세요.
4. 이모지는 최소한으로 사용하세요 (0~2개).
5. link_eligible은 글의 주제가 제품과 자연스럽게 연결될 때만 true로 설정하세요.
6. link_comment는 link_eligible=true일 때만 작성하세요. 자연스럽고 짧게.

순수 JSON으로만 응답하세요:
{{"text": "글 내용", "link_eligible": true/false, "link_comment": "댓글 내용 or null"}}"""


# ── AI 호출 ──

def call_ai(prompt: str) -> str:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENCLAW_API_KEY}",
    }
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": "당신은 Threads 소셜미디어 마케팅 전문 카피라이터입니다. 순수 JSON으로만 응답하세요."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
    }
    resp = requests.post(OPENCLAW_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def parse_generation_response(raw: str) -> dict | None:
    """AI 생성 응답 파싱"""
    text = raw.strip()
    # 마크다운 코드블록 제거
    code_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if code_match:
        text = code_match.group(1).strip()
    # JSON 객체 추출
    obj_match = re.search(r"\{.*\}", text, re.DOTALL)
    if obj_match:
        text = obj_match.group(0)
    try:
        data = json.loads(text)
        return {
            "text": data.get("text", ""),
            "link_eligible": bool(data.get("link_eligible", False)),
            "link_comment": data.get("link_comment"),
        }
    except Exception:
        print(f"  ❌ JSON 파싱 실패: {raw[:200]}...")
        return None


# ── 메인 생성 로직 ──

def generate_for_account(account: str, content_type: str | None, count: int = 3):
    """특정 계정에 대해 콘텐츠 생성"""
    acc_config = get_account_config(account)
    if not acc_config:
        print(f"  ❌ 계정 설정 없음: {account}")
        return 0

    if not acc_config.get("is_active", True):
        print(f"  ⏸️ 비활성 계정: {account}")
        return 0

    prod_config = get_product_config()
    generated = 0

    for i in range(count):
        # 타입 결정 (지정 or 사이클)
        ct = content_type if content_type else get_next_cycle_type(account)

        # 내용 소재 조회 (ABCD 무관, 1개)
        content_source = get_content_source()
        if content_source:
            print(f"  [{i+1}/{count}] {account} / 타입 {ct} / 내용소재: {content_source['id'][:8]}...")
        else:
            print(f"  [{i+1}/{count}] {account} / 타입 {ct} / 내용소재: 없음 (폴백)")

        # 패턴 조회 (타입별)
        patterns = get_patterns(ct)

        prompt = build_generation_prompt(acc_config, prod_config, ct, content_source, patterns)

        try:
            raw = call_ai(prompt)
            result = parse_generation_response(raw)
            if not result or not result["text"].strip():
                print(f"  ❌ 빈 결과")
                continue

            # DB 저장
            source_ids = [content_source["id"]] if content_source else []
            save_content({
                "account": account,
                "text_content": result["text"],
                "parent_type": ct,
                "pattern_id": patterns[0]["id"] if patterns else None,
                "source_ids": source_ids,
                "status": "draft",
                "link_eligible": result["link_eligible"],
                "link_comment": result["link_comment"],
                "reviewed_by": "auto",
            })
            generated += 1
            print(f"  ✅ 생성 완료 (link: {result['link_eligible']})")

            # 사용된 내용 소재 삭제 (source_role=both인 경우에도 삭제)
            if content_source:
                delete_content_source(content_source["id"])

        except Exception as e:
            print(f"  ❌ 생성 실패: {e}")

    return generated


def generate_all(count: int = 3, content_type: str | None = None):
    """모든 활성 계정에 대해 생성 (타입별 count개씩)"""
    types = [content_type] if content_type else CYCLE_ORDER  # ABCD 각각
    total_per_account = count * len(types)

    print(f"\n{'='*50}")
    print(f"[GENERATOR] 콘텐츠 생성 시작")
    print(f"  타입: {', '.join(types)} | 타입당: {count}개 | 계정당 총: {total_per_account}개")
    print(f"{'='*50}")

    accounts = ["bono", "place"]
    total = 0

    for acc in accounts:
        print(f"\n[{acc}] 생성 시작...")
        for ct in types:
            n = generate_for_account(acc, ct, count)
            total += n
            print(f"  [{acc}/{ct}] {n}개 생성")

    print(f"\n[RESULT] 총 {total}개 콘텐츠 생성")
    return total


def main():
    parser = argparse.ArgumentParser(description="AI 콘텐츠 생성기")
    parser.add_argument("--account", type=str, choices=["bono", "place"], help="특정 계정만")
    parser.add_argument("--type", type=str, choices=["A", "B", "C", "D"], help="특정 타입만")
    parser.add_argument("--count", type=int, default=3, help="계정당 생성 수")
    args = parser.parse_args()

    try:
        if args.account:
            n = generate_for_account(args.account, args.type, args.count)
        else:
            n = generate_all(args.count, args.type)

        send_telegram(
            f"🤖 <b>콘텐츠 생성 완료</b>\n"
            f"생성: {n}개 | 타입: {args.type or '사이클'}"
        )
    except Exception as e:
        error_msg = f"{e}\n{traceback.format_exc()}"
        print(f"[FATAL] {error_msg}")
        notify_error("콘텐츠 생성기", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
