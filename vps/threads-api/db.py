"""
Supabase CRUD 헬퍼
threads_ 접두사 테이블과의 모든 상호작용을 관리
"""
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, validate_config

validate_config()
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── raw_sources ──

def save_sources(posts: list[dict]) -> int:
    """
    소재를 배치 저장. 중복(content_hash)은 자동으로 무시.
    Returns: 새로 저장된 행 수
    """
    if not posts:
        return 0

    # upsert with onConflict to skip duplicates
    result = supabase.table("threads_raw_sources").upsert(
        posts,
        on_conflict="content_hash",
        ignore_duplicates=True,
    ).execute()

    return len(result.data) if result.data else 0


def check_duplicates(hashes: list[str]) -> set[str]:
    """
    이미 DB에 존재하는 content_hash 목록 반환
    """
    if not hashes:
        return set()

    result = (
        supabase.table("threads_raw_sources")
        .select("content_hash")
        .in_("content_hash", hashes)
        .execute()
    )
    return {row["content_hash"] for row in (result.data or [])}


def get_top_sources(limit: int = 50, order_by: str = "likes") -> list[dict]:
    """
    참여도 상위 글 조회 (조회수 추출용)
    """
    result = (
        supabase.table("threads_raw_sources")
        .select("id, source_url, likes, views")
        .order(order_by, desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def update_source_views(source_id: str, views: int):
    """
    특정 소재의 조회수 업데이트
    """
    supabase.table("threads_raw_sources").update(
        {"views": views}
    ).eq("id", source_id).execute()


def get_unanalyzed_sources(limit: int = 100, source_role: str | None = None) -> list[dict]:
    """
    미분석(analyzed_at IS NULL) 소재 조회
    source_role: "pattern" | "content" | None (전체)
    """
    query = (
        supabase.table("threads_raw_sources")
        .select("id, text_content, likes, replies, reposts, views, source_type, source_role, input_method")
        .is_("analyzed_at", "null")
        .order("collected_at", desc=True)
        .limit(limit)
    )
    if source_role:
        query = query.eq("source_role", source_role)
    result = query.execute()
    return result.data or []


# ── accounts_config ──

def get_account_config(account: str) -> dict | None:
    """
    계정 설정 조회
    """
    result = (
        supabase.table("threads_accounts_config")
        .select("*")
        .eq("account", account)
        .single()
        .execute()
    )
    return result.data


def get_all_account_configs() -> list[dict]:
    """
    모든 계정 설정 조회
    """
    result = (
        supabase.table("threads_accounts_config")
        .select("*")
        .execute()
    )
    return result.data or []


# ── product_config ──

def get_product_config() -> dict | None:
    """
    전역 제품/자동화 설정 조회 (min_likes, min_views 등)
    """
    result = supabase.table("threads_product_config").select("*").limit(1).execute()
    return result.data[0] if result.data else None


# ── job_queue ──

def get_pending_jobs() -> list[dict]:
    """
    대기 중인 작업 조회
    """
    result = (
        supabase.table("threads_job_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


def update_job_status(job_id: str, status: str, error_message: str = None):
    """
    작업 상태 업데이트
    """
    from datetime import datetime, timezone

    update_data = {"status": status}

    if status == "running":
        update_data["started_at"] = datetime.now(timezone.utc).isoformat()
    elif status in ("done", "failed", "timeout"):
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    if error_message:
        update_data["error_message"] = error_message

    supabase.table("threads_job_queue").update(
        update_data
    ).eq("id", job_id).execute()


# ── raw_sources 헬퍼 ──

def get_source_by_id(source_id: str) -> dict | None:
    """
    특정 소재 1건 조회
    """
    result = (
        supabase.table("threads_raw_sources")
        .select("*")
        .eq("id", source_id)
        .single()
        .execute()
    )
    return result.data


def set_analyzed_at(source_id: str):
    """
    수동/자동 내용소재를 AI 분석 없이 즉시 분석완료 처리
    """
    from datetime import datetime, timezone
    supabase.table("threads_raw_sources").update({
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", source_id).execute()
