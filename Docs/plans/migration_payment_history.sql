-- ============================================================================
-- payment_history 테이블 & add_tickets RPC 함수
-- ============================================================================
-- ⚠️ 이 파일은 설계 참고용입니다.
--    실제 마이그레이션 실행은 사용자 승인 후 supabase/migrations/에서 수행하세요.
-- ============================================================================

-- 1. payment_history 테이블 생성
CREATE TABLE IF NOT EXISTS payment_history (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id      TEXT NOT NULL UNIQUE,         -- PortOne paymentId (중복 방지 키)
    platform        TEXT NOT NULL CHECK (platform IN ('naver', 'google')),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    amount          INTEGER NOT NULL CHECK (amount > 0),  -- 결제 금액 (원)
    status          TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded')),
    order_name      TEXT,                         -- 주문명 (예: "네이버 실시간 진단 티켓 4장")
    refunded_at     TIMESTAMPTZ,                  -- 환불 일시
    refund_reason   TEXT,                         -- 환불 사유
    created_at      TIMESTAMPTZ DEFAULT NOW()     -- 결제 일시
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id
    ON payment_history(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id
    ON payment_history(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_status
    ON payment_history(status);

-- 3. RLS 정책 (Row Level Security)
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 결제 내역만 조회 가능
CREATE POLICY "Users can view own payment history"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);

-- 서버(service_role)만 INSERT/UPDATE 가능 (프론트에서 직접 삽입 불가)
CREATE POLICY "Service role can insert payment history"
    ON payment_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update payment history"
    ON payment_history FOR UPDATE
    USING (true);

-- 4. add_tickets RPC 함수 (티켓 구매 시 수량 증가)
CREATE OR REPLACE FUNCTION add_tickets(
    p_user_id UUID,
    p_platform TEXT,
    p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_platform = 'naver' THEN
        UPDATE user_subscriptions
        SET remaining_tickets_naver = remaining_tickets_naver + p_quantity
        WHERE user_id = p_user_id;
    ELSIF p_platform = 'google' THEN
        UPDATE user_subscriptions
        SET remaining_tickets_google = remaining_tickets_google + p_quantity
        WHERE user_id = p_user_id;
    ELSE
        RAISE EXCEPTION 'Invalid platform: %', p_platform;
    END IF;
END;
$$;

-- 5. deduct_tickets_for_refund RPC 함수 (환불 시 수량 차감)
CREATE OR REPLACE FUNCTION deduct_tickets_for_refund(
    p_user_id UUID,
    p_platform TEXT,
    p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_platform = 'naver' THEN
        UPDATE user_subscriptions
        SET remaining_tickets_naver = GREATEST(0, remaining_tickets_naver - p_quantity)
        WHERE user_id = p_user_id;
    ELSIF p_platform = 'google' THEN
        UPDATE user_subscriptions
        SET remaining_tickets_google = GREATEST(0, remaining_tickets_google - p_quantity)
        WHERE user_id = p_user_id;
    ELSE
        RAISE EXCEPTION 'Invalid platform: %', p_platform;
    END IF;
END;
$$;
