-- ================================================================
-- 024_remove_yearly_billing.sql
-- 연간(yearly) 결제 제거 — 월간(monthly) 결제 전용으로 전환
--
-- NHN KCP PG 심사 요구사항:
-- "당사는 월단위 정기결제만 지원이 가능하며, 연구독은 입점이 불가합니다."
--
-- 변경 사항:
-- 1. activate_subscription RPC에서 yearly 분기 제거 (항상 30일)
-- 2. 기존 yearly 데이터를 monthly로 마이그레이션
-- 3. billing_cycle CHECK 제약을 monthly만 허용하도록 변경
-- ================================================================

-- ================================================================
-- 1. 기존 yearly 데이터 마이그레이션 (있는 경우)
-- ================================================================
UPDATE subscription_billing
SET billing_cycle = 'monthly',
    updated_at = NOW()
WHERE billing_cycle = 'yearly';

-- ================================================================
-- 2. billing_cycle CHECK 제약 변경: monthly만 허용
-- ================================================================
-- 기존 CHECK 제약 제거
ALTER TABLE subscription_billing
  DROP CONSTRAINT IF EXISTS subscription_billing_billing_cycle_check;

-- 새 CHECK 제약 추가 (monthly만 허용)
ALTER TABLE subscription_billing
  ADD CONSTRAINT subscription_billing_billing_cycle_check
    CHECK (billing_cycle = 'monthly');

-- ================================================================
-- 3. activate_subscription RPC 업데이트 (yearly 분기 제거)
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
BEGIN
  -- 1. 플랜 정보 조회
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan_id');
  END IF;

  -- 기간 계산: 항상 30일 (월간 결제 전용)
  v_period_start := NOW();
  v_period_end := NOW() + INTERVAL '30 days';

  -- 2. subscription_billing Upsert (사용자당 1개)
  INSERT INTO subscription_billing (
    user_id, billing_key, card_last4, card_brand,
    plan_id, status, billing_cycle, next_billing_date
  )
  VALUES (
    p_user_id, p_billing_key, p_card_last4, p_card_brand,
    p_plan_id, 'active', 'monthly', v_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    billing_key = EXCLUDED.billing_key,
    card_last4 = EXCLUDED.card_last4,
    card_brand = EXCLUDED.card_brand,
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_cycle = 'monthly',
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
    'billing_cycle', 'monthly',
    'tickets_naver', v_plan.monthly_tickets_naver,
    'tickets_google', v_plan.monthly_tickets_google,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;
