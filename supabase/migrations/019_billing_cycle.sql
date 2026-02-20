-- ================================================================
-- 019_billing_cycle.sql
-- 구독 시스템에 연간(yearly) 결제 지원 추가
-- ================================================================

-- ================================================================
-- 1. subscription_billing에 billing_cycle 컬럼 추가
-- ================================================================
ALTER TABLE subscription_billing
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- ================================================================
-- 2. activate_subscription RPC 업데이트 (billing_cycle 지원)
-- ================================================================
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_billing_key TEXT,
  p_card_last4 TEXT DEFAULT NULL,
  p_card_brand TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan RECORD;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_billing_cycle TEXT;
BEGIN
  -- 1. 플랜 정보 조회
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan_id');
  END IF;

  -- billing_cycle 유효성 검증
  v_billing_cycle := COALESCE(p_billing_cycle, 'monthly');
  IF v_billing_cycle NOT IN ('monthly', 'yearly') THEN
    v_billing_cycle := 'monthly';
  END IF;

  v_period_start := NOW();
  IF v_billing_cycle = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '365 days';
  ELSE
    v_period_end := NOW() + INTERVAL '30 days';
  END IF;

  -- 2. subscription_billing Upsert (사용자당 1개)
  INSERT INTO subscription_billing (
    user_id, billing_key, card_last4, card_brand,
    plan_id, status, billing_cycle, next_billing_date
  )
  VALUES (
    p_user_id, p_billing_key, p_card_last4, p_card_brand,
    p_plan_id, 'active', v_billing_cycle, v_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    billing_key = EXCLUDED.billing_key,
    card_last4 = EXCLUDED.card_last4,
    card_brand = EXCLUDED.card_brand,
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_cycle = EXCLUDED.billing_cycle,
    next_billing_date = v_period_end,
    retry_count = 0,
    cancelled_at = NULL,
    updated_at = NOW();

  -- 3. user_subscriptions 업데이트 (플랜 + 티켓 충전)
  UPDATE user_subscriptions
  SET
    plan_id = p_plan_id,
    remaining_tickets_naver = v_plan.monthly_tickets_naver,
    remaining_tickets_google = v_plan.monthly_tickets_google,
    current_period_start = v_period_start,
    current_period_end = v_period_end,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 4. ticket_ledger에 충전 이력 기록
  IF v_plan.monthly_tickets_naver > 0 THEN
    INSERT INTO ticket_ledger (user_id, platform, amount, type, description)
    VALUES (p_user_id, 'naver', v_plan.monthly_tickets_naver, 'monthly_reset', '구독 결제 티켓 충전');
  END IF;

  IF v_plan.monthly_tickets_google > 0 THEN
    INSERT INTO ticket_ledger (user_id, platform, amount, type, description)
    VALUES (p_user_id, 'google', v_plan.monthly_tickets_google, 'monthly_reset', '구독 결제 티켓 충전');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'billing_cycle', v_billing_cycle,
    'tickets_naver', v_plan.monthly_tickets_naver,
    'tickets_google', v_plan.monthly_tickets_google,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;
