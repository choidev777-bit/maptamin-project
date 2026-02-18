-- ================================================================
-- 016_add_free_plan.sql
-- free 플랜 추가 + 신규 가입자 기본 플랜을 free로 변경
-- ================================================================

-- ================================================================
-- 1. plans 테이블에 free 플랜 추가
-- ================================================================
INSERT INTO plans (
  id, name, monthly_points, max_grid_size, limits,
  price, max_keywords_naver, max_keywords_google,
  monthly_tickets_naver, monthly_tickets_google,
  max_competitors, channels, place_lock
)
VALUES (
  'free', '무료 (Free)', 0, 0,
  '{"places": 0, "competitors": 0}',
  0, 0, 0, 0, 0, 0, 'none', false
)
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- 2. handle_new_user 트리거 함수 재정의
--    plan_id = 'starter' → 'free' 로 변경
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 새 사용자를 user_subscriptions에 등록 (free 플랜, 티켓 0)
  INSERT INTO public.user_subscriptions (
    user_id, plan_id,
    remaining_tickets_naver, remaining_tickets_google,
    onboarding_completed, welcome_report_sent
  )
  VALUES (
    NEW.id, 'free',
    0, 0,
    false, false
  );
  RETURN NEW;
END;
$$;

-- 트리거 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
