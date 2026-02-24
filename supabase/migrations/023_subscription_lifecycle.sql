-- ================================================================
-- 023_subscription_lifecycle.sql
-- 구독 라이프사이클 관리: cancel_scheduled 상태, pending_plan_id,
-- 만료 감지 RPC, 결제 실패 만료 RPC
-- ================================================================

-- ================================================================
-- 1. status CHECK 제약 조건 변경 (cancel_scheduled 추가)
-- ================================================================
-- 인라인 CHECK 제약 조건의 자동 이름: subscription_billing_status_check
ALTER TABLE subscription_billing
  DROP CONSTRAINT IF EXISTS subscription_billing_status_check;

ALTER TABLE subscription_billing
  ADD CONSTRAINT subscription_billing_status_check
  CHECK (status IN ('active', 'cancelled', 'cancel_scheduled', 'past_due', 'expired'));


-- ================================================================
-- 2. pending_plan_id 컬럼 추가 (다음 결제일 플랜 변경용)
-- ================================================================
ALTER TABLE subscription_billing
  ADD COLUMN IF NOT EXISTS pending_plan_id TEXT;

COMMENT ON COLUMN subscription_billing.pending_plan_id
  IS '다음 결제일부터 적용할 플랜 ID (null이면 변경 없음)';


-- ================================================================
-- 3. 만료 감지 RPC: expire_cancelled_subscriptions
--    CRON에서 매일 호출하여 cancel_scheduled 중 기간 만료된 구독을 expired로 전환
--    CTE + RETURNING 패턴으로 정확히 이번에 만료된 user_id만 추적
-- ================================================================
CREATE OR REPLACE FUNCTION expire_cancelled_subscriptions()
RETURNS TABLE(expired_user_id uuid, expired_billing_key text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE subscription_billing
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'cancel_scheduled'
      AND next_billing_date < now()
    RETURNING user_id, billing_key
  ),
  downgraded AS (
    UPDATE user_subscriptions
    SET plan_id = 'free',
        remaining_tickets_naver = 0,
        remaining_tickets_google = 0,
        current_period_end = now(),
        updated_at = now()
    WHERE user_id IN (SELECT user_id FROM expired)
    RETURNING user_id
  )
  SELECT e.user_id AS expired_user_id,
         e.billing_key AS expired_billing_key
  FROM expired e;
END;
$$;

COMMENT ON FUNCTION expire_cancelled_subscriptions()
  IS 'CRON에서 호출: cancel_scheduled 중 기간 만료된 구독을 expired로 전환하고 plan_id=free로 다운그레이드. 만료된 user_id + billing_key 반환하여 CRON에서 빌링키 삭제에 사용.';


-- ================================================================
-- 4. 결제 실패 3회 만료 처리 RPC: expire_failed_subscription
--    Webhook handlePaymentFailed에서 최대 재시도 초과 시 호출
-- ================================================================
CREATE OR REPLACE FUNCTION expire_failed_subscription(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 구독 billing 상태를 expired로
  UPDATE subscription_billing
  SET status = 'expired',
      updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'past_due';

  -- 사용자 구독을 free로 다운그레이드 + 티켓 리셋
  UPDATE user_subscriptions
  SET plan_id = 'free',
      remaining_tickets_naver = 0,
      remaining_tickets_google = 0,
      current_period_end = now(),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION expire_failed_subscription(uuid)
  IS 'Webhook에서 호출: 결제 실패 3회 초과 시 구독을 expired로 전환하고 plan_id=free로 다운그레이드.';
