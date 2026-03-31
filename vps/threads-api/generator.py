"""
AI 콘텐츠 생성기
수집·분석된 소재 + 패턴을 기반으로 발행 가능한 글을 자동 생성

사용법:
    python generator.py                          # 기본 (계정당 사이클 1회)
    python generator.py --account bono --count 2 # bono 계정 사이클 2회
    python generator.py --account bono --type A  # bono 계정 A타입만 1개
    python generator.py --type B --count 3       # 모든 계정 B타입 3개씩
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

# 하위 호환용 기본 사이클 순서
CYCLE_ORDER = ["A", "B", "C", "D"]

# 계정별 발행 사이클 순서 (Task 2.1)
ACCOUNT_CYCLE_TYPES: dict[str, list[str]] = {
    "bono":  ["A", "D", "B", "C"],   # 어그로→트렌드→인사이트(링크)→라포
    "place": ["B", "A", "D"],         # 인사이트(링크)→어그로→트렌드 (C 없음)
}

# 계정별 링크 허용 타입 (Task 2.1)
ACCOUNT_LINK_TYPES: dict[str, list[str]] = {
    "bono":  ["A", "B"],   # A+B에 맵타민 링크
    "place": ["B"],         # B에만 맵타민 링크
}


# ── DB 헬퍼 ──

def get_content_source(account: str | None = None) -> dict | None:
    """
    내용 소재 1개 조회 (source_role = content 또는 both, 분석 완료)
    account가 지정되면 해당 계정 소재 우선, 없으면 account=NULL인 공용 소재 사용.
    가장 오래된(먼저 등록된) 것부터 소비
    """
    query = (
        supabase.table("threads_raw_sources")
        .select("id, text_content, ai_key_points, ai_summary, source_type, category")
        .or_("source_role.eq.content,source_role.eq.both")
        .not_.is_("analyzed_at", "null")
        .order("collected_at", desc=False)
        .limit(1)
    )
    if account:
        # 해당 계정 소재 먼저 시도
        result = query.eq("account", account).execute()
        if result.data:
            return result.data[0]
        # 없으면 공용(account=NULL) 소재 폴백
        result = (
            supabase.table("threads_raw_sources")
            .select("id, text_content, ai_key_points, ai_summary, source_type, category")
            .or_("source_role.eq.content,source_role.eq.both")
            .not_.is_("analyzed_at", "null")
            .is_("account", "null")
            .order("collected_at", desc=False)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    else:
        result = query.execute()
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
    """계정의 최근 발행 타입 기반으로 다음 사이클 타입 결정 (Task 2.2)"""
    result = (
        supabase.table("threads_contents")
        .select("parent_type")
        .eq("account", account)
        .in_("status", ["published", "queued", "approved"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    # 계정별 사이클 목록 (fallback: 전역 CYCLE_ORDER)
    acc_types = ACCOUNT_CYCLE_TYPES.get(account, CYCLE_ORDER)

    if not result.data:
        return acc_types[0]  # 이력 없으면 첫 번째 타입 시작

    last = result.data[0]["parent_type"]
    idx = acc_types.index(last) if last in acc_types else -1
    return acc_types[(idx + 1) % len(acc_types)]


def save_content(content: dict):
    supabase.table("threads_contents").insert(content).execute()


# ── AI 프롬프트 ──

def build_generation_prompt(
    account_config: dict,
    product_config: dict | None,
    content_type: str,
    content_source: dict | None,
    patterns: list[dict],
    force_link: bool = False,
) -> str:
    """콘텐츠 생성 프롬프트 빌드 (XML 구획 + CoT _thought 파이프라인) (Task 2.3a)"""

    # ── 소재 블록 ──
    if content_source:
        key_points = content_source.get("ai_key_points") or []
        category = content_source.get("category", "")
        summary = content_source.get("ai_summary", "")
        if key_points:
            kp_str = "\n".join(f"  - {kp}" for kp in key_points)
            source_block = f"주제: {category}\n원문 요약: {summary}\n핵심 포인트:\n{kp_str}"
        else:
            raw = (content_source.get("text_content") or "")[:2000]
            source_block = f"주제: {category}\n원문 (참고용):\n{raw}"
    else:
        source_block = "(소재 없음. 계정 전문 분야에 맞춰 스스로 유용한 내용을 창작하세요.)"

    # ── 패턴 블록 ──
    if patterns:
        p = patterns[0]
        pattern_hint = (
            f"\n\n<pattern_hint>\n"
            f"추천 패턴: {p.get('pattern_name', '')}\n"
            f"훅 스타일: {p.get('hook_template', '없음')}\n"
            f"전개 구조: {p.get('body_structure', '없음')}\n"
            f"CTA: {p.get('cta_template', '없음')}\n"
            f"</pattern_hint>"
        )
    else:
        pattern_hint = ""

    # ── 제품 정보 (force_link일 때만) ──
    if product_config and force_link:
        templates = ", ".join(product_config.get("link_comment_templates", []))
        product_block = (
            f"\n\n<product_info>\n"
            f"이름: {product_config.get('product_name', '')}\n"
            f"설명: {product_config.get('product_description', '')}\n"
            f"링크: {product_config.get('product_link', '')}\n"
            f"댓글 템플릿 예시: {templates}\n"
            f"</product_info>"
        )
    else:
        product_block = ""

    # ── 타입별 지시 블록 ──
    type_desc = {
        "A": "트래픽 유도 / 타래 (스크롤 멈추는 훅 + 자답 댓글 체인)",
        "B": "인사이트 (유익한 정보, 팁, 체크리스트, 리스트, 가이드. 150~400자)",
        "C": "라포/신뢰 (경험담, 일상, 공감, 개인적 이야기. 100~250자)",
        "D": "트렌드 (시사/뉴스 반응, 빠른 타이밍. 80~200자)",
    }

    if content_type == "A":
        format_block = """# A타입(타래) 작성 지시:
1. thread_parts[0] (본문): 스크롤을 멈추게 하는 50자 내외의 강렬한 훅.
   - 핵심 정보를 절대 공개하지 말 것. 궁금증/충격만 유발.
   - 줄바꿈 1~2회 포함.
2. thread_parts[1~N] (자답 댓글): 원문 핵심 포인트를 썰 풀듯이 전개.
   - 소재 분량에 따라 자동 결정: 짧으면 0개, 방대하면 최대 8개.
   - 억지로 늘리지 말 것. 할 말이 없으면 줄이세요.
   - 각 댓글 첫 줄: "#번호. 소제목" 형식 (예: "#1. 블로그 체험단의 함정")."""
        link_instruction = (
            "link_eligible: true로 설정하고, link_comment를 자연스럽고 짧게 작성하세요."
            if force_link else
            "link_eligible: false로 설정하고, link_comment는 null로 두세요. 제품을 절대 언급하지 마세요."
        )
        output_schema = (
            '{"_thought": "50자 이내 검토", '
            '"thread_parts": ["본문", "#1. 소제목\\n내용..."], '
            '"link_eligible": true/false, '
            '"link_comment": "댓글 내용 or null"}'
        )
    else:
        format_block = f"# {content_type}타입 작성 지시:\n{type_desc.get(content_type, '')}"
        link_instruction = (
            "link_eligible: true로 설정하고, link_comment를 자연스럽고 짧게 작성하세요."
            if force_link else
            "link_eligible: false로 설정하고, link_comment는 null로 두세요. 제품을 절대 언급하지 마세요."
        )
        output_schema = (
            '{"_thought": "50자 이내 검토", '
            '"text": "글 내용", '
            '"link_eligible": true/false, '
            '"link_comment": "댓글 내용 or null"}'
        )

    banned = ", ".join(account_config.get("banned_words", []))

    return f"""<persona>
계정명: @{account_config.get('display_name', '')}
전문 분야: {account_config.get('topic', '')}
말투 톤: {account_config.get('tone', '')}
절대 금지어: {banned}
</persona>

<source_material>
{source_block}
</source_material>

<target_format>
타입: {content_type} ({type_desc.get(content_type, '')})

{format_block}
</target_format>
{pattern_hint}{product_block}

<anti_patterns>
이 중 하나라도 어기면 생성 실패입니다:
1. 서론 금지: "안녕하세요", "~에 대해 알아볼까요?", "오늘 준비한 내용은" 절대 금지. 첫 문장부터 본론으로 찌르세요.
2. 마무리 금지: "결론적으로", "정리하자면", "궁금한 점은 댓글로" 같은 기계적 멘트 금지.
3. 어미 반복 금지: "~거든요", "~인데요"가 한 글에 2번 이상 나오면 안 됨.
4. 나열 금지: "첫째, 둘째, 셋째" 대신 단답형 불릿 사용.
5. 금지어({banned}) 및 해시태그(#키워드) 절대 사용 불가.
6. 이모지는 전체 글에서 최대 2개만 허용.
</anti_patterns>

<output_instruction>
결과를 출력하기 전에 _thought 필드에 아래 사고 과정을 50자 이내로 적으세요:
1. 페르소나와 톤이 맞는지?
2. anti_patterns를 하나라도 어기지 않았는지?
3. {link_instruction}

그 후 순수 JSON 객체 하나만 출력하세요:
{output_schema}
</output_instruction>"""


# ── AI 호출 ──

def call_ai(prompt: str, content_type: str | None = None) -> str:
    """GLM API 호출. A타입은 thread_parts 전용 system 프롬프트 사용 (Task 2.8)"""
    base_system = (
        "당신은 한국의 Threads SNS에서 활동하는 '산전수전 다 겪은 1인 비즈니스 대표이자 실무자'입니다. "
        "절대 마케팅 대행사나 AI 티를 내지 않고 날것의 인사이트를 던집니다."
    )
    if content_type == "A":
        system_msg = (
            f"{base_system} "
            "반드시 제공된 지시사항(XML 태그)을 읽고, 타래 형식의 thread_parts 배열과 "
            "_thought 필드가 포함된 순수 JSON 객체 단 하나만 응답하세요. "
            "마크다운(```)은 절대 사용하지 마세요."
        )
    else:
        system_msg = (
            f"{base_system} "
            "반드시 제공된 지시사항(XML 태그)을 읽고, text 필드와 "
            "_thought 필드가 포함된 순수 JSON 객체 단 하나만 응답하세요. "
            "마크다운(```)은 절대 사용하지 마세요."
        )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENCLAW_API_KEY}",
    }
    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
    }
    resp = requests.post(OPENCLAW_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def parse_generation_response(raw: str) -> dict | None:
    """AI 생성 응답 파싱. thread_parts 키 존재 여부로 A타입/그외 분기 (Task 2.4)"""
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
        # _thought는 파싱하지 않고 무시 (CoT 내부 사고 필드)

        # A타입 타래 응답 (thread_parts 키 존재 여부로 판단)
        if "thread_parts" in data and isinstance(data["thread_parts"], list) and data["thread_parts"]:
            parts = data["thread_parts"][:9]  # 최대 본문+댓글8개 캡
            return {
                "text": parts[0],          # 본문 (text_content 저장용)
                "thread_parts": parts,     # 전체 배열
                "link_eligible": bool(data.get("link_eligible", False)),
                "link_comment": data.get("link_comment"),
            }

        # 기존 응답 (B/C/D타입)
        return {
            "text": data.get("text", ""),
            "thread_parts": None,
            "link_eligible": bool(data.get("link_eligible", False)),
            "link_comment": data.get("link_comment"),
        }
    except Exception:
        print(f"  ❌ JSON 파싱 실패: {raw[:200]}...")
        return None


# ── 메인 생성 로직 ──

def generate_for_account(account: str, content_type: str | None, count: int = 1):
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
        # 타입 결정: 명시 지정 or get_next_cycle_type() 자동 사이클 (Task 2.5)
        ct = content_type if content_type else get_next_cycle_type(account)

        # 링크 여부: 계정별 링크 허용 타입에 해당하면 True (link_every_n 제거)
        force_link = (ct in ACCOUNT_LINK_TYPES.get(account, [])) and (prod_config is not None)

        # 내용 소재 조회 (계정별 소재 우선, 없으면 공용 폴백)
        content_source = get_content_source(account)
        if content_source:
            print(f"  [{i+1}/{count}] {account} / 타입 {ct} / 소재: {content_source['id'][:8]}... / 링크: {force_link}")
        else:
            print(f"  [{i+1}/{count}] {account} / 타입 {ct} / 소재: 없음(폴백) / 링크: {force_link}")

        # 패턴 조회 (타입별)
        patterns = get_patterns(ct)

        prompt = build_generation_prompt(acc_config, prod_config, ct, content_source, patterns, force_link)

        try:
            raw = call_ai(prompt, ct)
            result = parse_generation_response(raw)
            if not result or not result["text"].strip():
                print(f"  ❌ 빈 결과")
                continue

            # force_link 규칙을 코드 레벨에서 최종 강제 (AI 판단 오버라이드)
            result["link_eligible"] = force_link
            if not force_link:
                result["link_comment"] = None

            # DB 저장 (thread_parts 포함)
            source_ids = [content_source["id"]] if content_source else []
            save_content({
                "account": account,
                "text_content": result["text"],
                "thread_parts": result.get("thread_parts"),   # A타입만 non-NULL
                "parent_type": ct,
                "pattern_id": patterns[0]["id"] if patterns else None,
                "source_ids": source_ids,
                "status": "draft",
                "link_eligible": result["link_eligible"],
                "link_comment": result["link_comment"],
                "reviewed_by": "auto",
            })
            generated += 1
            tp_count = len(result.get("thread_parts") or [])
            print(f"  ✅ 생성 완료 (link: {result['link_eligible']}, thread_parts: {tp_count}개)")

            # 사용된 내용 소재 삭제
            if content_source:
                delete_content_source(content_source["id"])

        except Exception as e:
            print(f"  ❌ 생성 실패: {e}")

    return generated


def generate_all(count: int = 1, content_type: str | None = None):
    """모든 활성 계정에 대해 생성 (Task 2.6 - 루프 재설계)

    count의 의미:
    - content_type 미지정: 계정별 사이클 'count' 회전
      → bono: count × 4개 (ADBC), place: count × 3개 (BAD)
    - content_type 지정: 해당 타입만 각 count개
    """
    print(f"\n{'='*50}")
    print(f"[GENERATOR] 콘텐츠 생성 시작")
    print(f"  타입: {content_type or '사이클 자동'} | count={count}")
    print(f"{'='*50}")

    accounts = ["bono", "place"]
    total = 0

    for acc in accounts:
        print(f"\n[{acc}] 생성 시작...")
        if content_type:
            # --type 명시: 해당 타입만 count개
            n = generate_for_account(acc, content_type, count)
        else:
            # 타입 미지정: get_next_cycle_type()이 ADBC/BAD 자동 결정
            acc_types = ACCOUNT_CYCLE_TYPES.get(acc, CYCLE_ORDER)
            total_count = count * len(acc_types)
            print(f"  사이클 {count}회 → 총 {total_count}개 ({' → '.join(acc_types)} × {count})")
            n = generate_for_account(acc, None, total_count)
        total += n
        print(f"  [{acc}] {n}개 생성 완료")

    print(f"\n[RESULT] 총 {total}개 콘텐츠 생성")
    return total


def main():
    parser = argparse.ArgumentParser(description="AI 콘텐츠 생성기")
    parser.add_argument("--account", type=str, choices=["bono", "place"], help="특정 계정만")
    parser.add_argument("--type", type=str, choices=["A", "B", "C", "D"], help="특정 타입만")
    parser.add_argument("--count", type=int, default=1, help="사이클 회전 수 (타입 미지정 시) 또는 타입당 개수")
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
