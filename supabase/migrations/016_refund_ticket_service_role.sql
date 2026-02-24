-- ================================================================
-- refund_ticket RPC 업데이트: service role (p_user_id) 지원 추가
-- 
-- 사용법: Supabase Dashboard → SQL Editor에 복사-붙여넣기 → Run
-- 
-- 변경 내용:
--   기존: auth.uid()로만 사용자 식별 (로그인 필수)
--   변경: auth.uid()가 NULL이면 p_user_id를 사용 (service role 호출 지원)
--   기존 클라이언트 호출은 그대로 호환됨 (p_user_id 미전달 시 auth.uid() 사용)
-- ================================================================

CREATE OR REPLACE FUNCTION refund_ticket(
    p_platform TEXT,
    p_search_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- auth.uid()가 NULL이면 (service role 호출) p_user_id를 사용
  v_user_id := COALESCE(auth.uid(), p_user_id);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required (either via auth or p_user_id parameter)';
  END IF;

  IF p_platform = 'naver' THEN
    UPDATE user_subscriptions
    SET remaining_tickets_naver = remaining_tickets_naver + 1, updated_at = NOW()
    WHERE user_id = v_user_id;
  ELSIF p_platform = 'google' THEN
    UPDATE user_subscriptions
    SET remaining_tickets_google = remaining_tickets_google + 1, updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  INSERT INTO ticket_ledger (user_id, platform, amount, type, description, search_id)
  VALUES (v_user_id, p_platform, 1, 'refund', 'Search failure refund', p_search_id);

  RETURN TRUE;
END;
$$;
