-- ================================================================
-- 015_v2_schema_upgrade.sql
-- ERD v2.2 기반: 포인트 시스템 → 티켓 시스템 전환
-- ================================================================

-- ================================================================
-- 1. plans 테이블 ALTER (새 컬럼 추가 + seed data)
-- ================================================================
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_keywords_naver INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_keywords_google INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_tickets_naver INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS monthly_tickets_google INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_competitors INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS channels TEXT NOT NULL DEFAULT 'naver',
  ADD COLUMN IF NOT EXISTS place_lock BOOLEAN NOT NULL DEFAULT true;

-- STEP 1: 먼저 새 플랜을 INSERT (FK 참조 대상이 먼저 존재해야 함)
-- monthly_points, limits는 레거시 NOT NULL 컬럼 → 더미 값으로 채움
INSERT INTO plans (id, name, monthly_points, max_grid_size, limits, price, max_keywords_naver, max_keywords_google, monthly_tickets_naver, monthly_tickets_google, max_competitors, channels, place_lock)
VALUES
  ('starter', '스타터 (Starter)', 0, 3, '{"places": 1, "competitors": 0}', 9900, 2, 0, 2, 0, 0, 'naver', true),
  ('pro', '프로 (Pro)', 0, 5, '{"places": 1, "competitors": 1}', 29000, 5, 0, 10, 0, 1, 'naver', true),
  ('premium', '프리미엄 (Premium)', 0, 7, '{"places": 3, "competitors": 10}', 99000, 5, 5, 15, 15, 10, 'naver+google', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_points = EXCLUDED.monthly_points,
  limits = EXCLUDED.limits,
  price = EXCLUDED.price,
  max_grid_size = EXCLUDED.max_grid_size,
  max_keywords_naver = EXCLUDED.max_keywords_naver,
  max_keywords_google = EXCLUDED.max_keywords_google,
  monthly_tickets_naver = EXCLUDED.monthly_tickets_naver,
  monthly_tickets_google = EXCLUDED.monthly_tickets_google,
  max_competitors = EXCLUDED.max_competitors,
  channels = EXCLUDED.channels,
  place_lock = EXCLUDED.place_lock;

-- STEP 2: 기존 user_credits의 FK 참조를 업데이트 (이제 starter/pro가 존재함)
UPDATE user_credits SET plan_id = 'starter' WHERE plan_id = 'light';
UPDATE user_credits SET plan_id = 'pro' WHERE plan_id = 'basic';

-- STEP 3: 이제 안전하게 구 플랜 삭제
DELETE FROM plans WHERE id IN ('light', 'basic');


-- ================================================================
-- 2. user_subscriptions 테이블 (user_credits 대체)
-- ================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) DEFAULT 'starter',
  phone TEXT,  -- 알림톡 수신 전화번호 (형식: 01012345678)
  remaining_tickets_naver INTEGER NOT NULL DEFAULT 0,
  remaining_tickets_google INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  welcome_report_sent BOOLEAN NOT NULL DEFAULT false,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화 + 정책 (검토에서 누락 발견 → 추가)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);


-- ================================================================
-- 3. managed_keywords 테이블 (신규)
-- ================================================================
CREATE TABLE IF NOT EXISTS managed_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver', 'google')),
  keyword TEXT NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, keyword)
);

ALTER TABLE managed_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keywords"
  ON managed_keywords USING (auth.uid() = user_id);


-- ================================================================
-- 4. searches 테이블 ALTER (report_type 추가)
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'searches' AND column_name = 'report_type'
  ) THEN
    ALTER TABLE searches ADD COLUMN report_type TEXT DEFAULT 'realtime';
    ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
      CHECK (report_type IN ('weekly', 'realtime', 'welcome'));
  END IF;
END $$;


-- ================================================================
-- 5. search_schedules 테이블 ALTER
-- ================================================================
DO $$
BEGIN
  -- 5-1. crawling_day 단일 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_schedules' AND column_name = 'crawling_day'
  ) THEN
    ALTER TABLE search_schedules ADD COLUMN crawling_day INTEGER;
    -- 기존 배열의 첫 번째 값 마이그레이션
    UPDATE search_schedules SET crawling_day = crawling_days[1]
    WHERE crawling_days IS NOT NULL AND array_length(crawling_days, 1) > 0;
  END IF;

  -- 5-2. grid_distance 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_schedules' AND column_name = 'grid_distance'
  ) THEN
    ALTER TABLE search_schedules ADD COLUMN grid_distance DECIMAL DEFAULT 0.5;
  END IF;

  -- 5-3. distance_unit 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_schedules' AND column_name = 'distance_unit'
  ) THEN
    ALTER TABLE search_schedules ADD COLUMN distance_unit TEXT DEFAULT 'km';
  END IF;
END $$;


-- ================================================================
-- 6. managed_places UNIQUE 제약 조건 복원
-- (012에서 user_id, platform, place_id로 변경 → user_id, platform으로 복원)
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_places_user_id_platform_place_id_key'
  ) THEN
    ALTER TABLE managed_places
    DROP CONSTRAINT managed_places_user_id_platform_place_id_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'managed_places_user_id_platform_key'
  ) THEN
    ALTER TABLE managed_places
    ADD CONSTRAINT managed_places_user_id_platform_key UNIQUE (user_id, platform);
  END IF;
END $$;


-- ================================================================
-- 7. notification_schedules 테이블 (신규)
-- ================================================================
CREATE TABLE IF NOT EXISTS notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_schedule_id UUID REFERENCES search_schedules(id) ON DELETE CASCADE,
  is_immediate BOOLEAN NOT NULL DEFAULT true,
  notify_day INTEGER CHECK (notify_day BETWEEN 0 AND 6),
  notify_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, search_schedule_id)
);

ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification schedules"
  ON notification_schedules USING (auth.uid() = user_id);


-- ================================================================
-- 8. notification_logs 테이블 (신규)
-- ================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'weekly', 'realtime')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_via TEXT NOT NULL DEFAULT 'solapi',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notification_logs FOR SELECT USING (auth.uid() = user_id);


-- ================================================================
-- 9. ticket_ledger 테이블 (credit_ledger 대체)
-- ================================================================
CREATE TABLE IF NOT EXISTS ticket_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver', 'google')),
  amount INTEGER NOT NULL,  -- -1: 사용, +1: 환불, +N: 충전
  type TEXT NOT NULL CHECK (type IN ('usage', 'refund', 'monthly_reset', 'welcome_bonus')),
  description TEXT,
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticket_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ticket history"
  ON ticket_ledger FOR SELECT USING (auth.uid() = user_id);


-- ================================================================
-- 10. RPC 함수: deduct_ticket (deduct_points 대체)
-- ================================================================
CREATE OR REPLACE FUNCTION deduct_ticket(p_platform TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_remaining INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF p_platform = 'naver' THEN
    SELECT remaining_tickets_naver INTO v_remaining
    FROM user_subscriptions WHERE user_id = v_user_id FOR UPDATE;

    IF v_remaining <= 0 THEN
      RAISE EXCEPTION 'No remaining naver tickets';
    END IF;

    UPDATE user_subscriptions
    SET remaining_tickets_naver = remaining_tickets_naver - 1, updated_at = NOW()
    WHERE user_id = v_user_id;
  ELSIF p_platform = 'google' THEN
    SELECT remaining_tickets_google INTO v_remaining
    FROM user_subscriptions WHERE user_id = v_user_id FOR UPDATE;

    IF v_remaining <= 0 THEN
      RAISE EXCEPTION 'No remaining google tickets';
    END IF;

    UPDATE user_subscriptions
    SET remaining_tickets_google = remaining_tickets_google - 1, updated_at = NOW()
    WHERE user_id = v_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid platform: %', p_platform;
  END IF;

  -- 이력 기록
  INSERT INTO ticket_ledger (user_id, platform, amount, type, description)
  VALUES (v_user_id, p_platform, -1, 'usage', 'Real-time diagnosis');

  RETURN TRUE;
END;
$$;


-- ================================================================
-- 11. RPC 함수: refund_ticket (refund_points 대체)
-- ================================================================
CREATE OR REPLACE FUNCTION refund_ticket(p_platform TEXT, p_search_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

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


-- ================================================================
-- 12. RPC 함수: reset_monthly_tickets (월초 리셋)
-- ================================================================
CREATE OR REPLACE FUNCTION reset_monthly_tickets()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE user_subscriptions us
    SET
      remaining_tickets_naver = p.monthly_tickets_naver,
      remaining_tickets_google = p.monthly_tickets_google,
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
    FROM plans p
    WHERE us.plan_id = p.id
      AND us.current_period_end <= NOW()
    RETURNING us.user_id
  )
  SELECT COUNT(*) INTO reset_count FROM updated;

  RETURN reset_count;
END;
$$;


-- ================================================================
-- 13. handle_new_user 트리거 업데이트
-- (user_credits → user_subscriptions로 변경)
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 새 사용자를 user_subscriptions에 등록
  INSERT INTO public.user_subscriptions (
    user_id, plan_id,
    remaining_tickets_naver, remaining_tickets_google,
    onboarding_completed, welcome_report_sent
  )
  VALUES (
    NEW.id, 'starter',
    0, 0,  -- 결제 전이므로 티켓 0
    false, false
  );
  RETURN NEW;
END;
$$;

-- 트리거 재생성 (동일 이름이므로 DROP 후 CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- starter 플랜이 존재하는지 보장
INSERT INTO public.plans (id, name, monthly_points, max_grid_size, limits)
VALUES ('starter', '스타터 (Starter)', 0, 3, '{"places": 1, "competitors": 0}')
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- 14. 레거시 함수 DROP (검토에서 1개 누락 발견 → 추가 반영)
-- ================================================================
DROP FUNCTION IF EXISTS public.deduct_points(bigint);
DROP FUNCTION IF EXISTS public.refund_points(bigint);
DROP FUNCTION IF EXISTS public.charge_points(uuid, bigint);
DROP FUNCTION IF EXISTS public.deduct_credits_and_track_usage(uuid, integer, text, date);
DROP FUNCTION IF EXISTS public.increment_daily_usage(uuid, date);
DROP FUNCTION IF EXISTS public.increment_daily_usage(uuid, date, text);
