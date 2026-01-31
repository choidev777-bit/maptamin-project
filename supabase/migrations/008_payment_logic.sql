-- Function to deduct credits and track daily usage atomically
-- Deducts from subscription_balance first, then cash_balance
-- Returns the remaining total balance

CREATE OR REPLACE FUNCTION deduct_credits_and_track_usage(
  p_user_id UUID,
  p_cost INTEGER,
  p_platform TEXT, -- 'naver' or 'google'
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_balance INTEGER;
  v_cash_balance INTEGER;
  v_total_balance INTEGER;
  v_sub_deduction INTEGER := 0;
  v_cash_deduction INTEGER := 0;
  v_remaining_cost INTEGER := p_cost;
BEGIN
  -- 1. Lock and Get current balance
  SELECT subscription_balance, cash_balance
  INTO v_sub_balance, v_cash_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  v_total_balance := v_sub_balance + v_cash_balance;

  -- 2. Check sufficient funds
  IF v_total_balance < p_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_cost, v_total_balance;
  END IF;

  -- 3. Calculate deductions
  -- Try to deduct from subscription balance first
  IF v_sub_balance >= v_remaining_cost THEN
    v_sub_deduction := v_remaining_cost;
    v_remaining_cost := 0;
  ELSE
    v_sub_deduction := v_sub_balance;
    v_remaining_cost := v_remaining_cost - v_sub_balance;
  END IF;

  -- Deduct remaining from cash balance
  IF v_remaining_cost > 0 THEN
    v_cash_deduction := v_remaining_cost;
  END IF;

  -- 4. Update balances
  UPDATE user_credits
  SET 
    subscription_balance = subscription_balance - v_sub_deduction,
    cash_balance = cash_balance - v_cash_deduction,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 5. Track daily usage (Upsert)
  INSERT INTO daily_usage (user_id, usage_date, platform, search_count)
  VALUES (p_user_id, p_date, p_platform, 1)
  ON CONFLICT (user_id, usage_date, platform)
  DO UPDATE SET
    search_count = daily_usage.search_count + 1,
    updated_at = NOW();

  -- 6. Log Transaction (Optional but recommended for audit)
  -- Assuming credit_transactions table exists? If not, skip or create.
  -- For now, we skip explicit transaction log to keep it simple, 
  -- relying on user_credits update. Ideally handled by triggers or separate log.

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'deducted_sub', v_sub_deduction,
    'deducted_cash', v_cash_deduction,
    'new_total_balance', (v_total_balance - p_cost)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
