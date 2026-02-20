-- ================================================================
-- 018_subscription_billing.sql
-- 정기 구독 결제를 위한 빌링키 및 구독 상태 관리 테이블
-- ================================================================

-- ================================================================
-- 1. subscription_billing 테이블 (빌링키 + 구독 상태)
-- ================================================================
CREATE TABLE IF NOT EXISTS subscription_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,                  -- PortOne 빌링키
  card_last4 TEXT,                            -- 카드 마지막 4자리 (표시용)
  card_brand TEXT,                            -- 카드 브랜드 (신한, 국민 등)
  plan_id TEXT REFERENCES plans(id),          -- 구독 중인 플랜
  status TEXT NOT NULL DEFAULT 'active'       -- active / cancelled / past_due / expired
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  next_payment_id TEXT,                       -- 다음 예약 결제 paymentId
  next_billing_date TIMESTAMPTZ,              -- 다음 결제 예정일
  retry_count INTEGER NOT NULL DEFAULT 0,     -- 결제 실패 재시도 횟수
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                             -- 사용자당 1개 구독
);

-- RLS 활성화
ALTER TABLE subscription_billing ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독 정보만 조회 가능
CREATE POLICY "Users view own billing"
  ON subscription_billing FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 구독 정보만 업데이트 가능
CREATE POLICY "Users update own billing"
  ON subscription_billing FOR UPDATE
  USING (auth.uid() = user_id);

-- Service Role만 INSERT 가능 (API Route에서 처리)
CREATE POLICY "Service role insert billing"
  ON subscription_billing FOR INSERT
  WITH CHECK (true);


-- ================================================================
-- 2. subscription_payment_history 테이블 (구독 결제 이력)
-- ================================================================
CREATE TABLE IF NOT EXISTS subscription_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_id UUID REFERENCES subscription_billing(id) ON DELETE SET NULL,
  payment_id TEXT NOT NULL UNIQUE,            -- PortOne paymentId (중복 방지)
  plan_id TEXT REFERENCES plans(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'failed', 'refunded')),
  period_start TIMESTAMPTZ,                   -- 이 결제가 커버하는 구독 기간 시작
  period_end TIMESTAMPTZ,                     -- 이 결제가 커버하는 구독 기간 끝
  failure_reason TEXT,                        -- 실패 시 사유
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription payments"
  ON subscription_payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role insert subscription payments"
  ON subscription_payment_history FOR INSERT
  WITH CHECK (true);


-- ================================================================
-- 3. RPC: activate_subscription (구독 활성화 + 티켓 충전)
-- ================================================================
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_billing_key TEXT,
  p_card_last4 TEXT DEFAULT NULL,
  p_card_brand TEXT DEFAULT NULL
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

  v_period_start := NOW();
  v_period_end := NOW() + INTERVAL '30 days';

  -- 2. subscription_billing Upsert (사용자당 1개)
  INSERT INTO subscription_billing (
    user_id, billing_key, card_last4, card_brand,
    plan_id, status, next_billing_date
  )
  VALUES (
    p_user_id, p_billing_key, p_card_last4, p_card_brand,
    p_plan_id, 'active', v_period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    billing_key = EXCLUDED.billing_key,
    card_last4 = EXCLUDED.card_last4,
    card_brand = EXCLUDED.card_brand,
    plan_id = EXCLUDED.plan_id,
    status = 'active',
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
    'tickets_naver', v_plan.monthly_tickets_naver,
    'tickets_google', v_plan.monthly_tickets_google,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;
