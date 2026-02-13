-- 1. Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a row into public.user_credits
  INSERT INTO public.user_credits (user_id, subscription_balance, cash_balance, plan_id)
  VALUES (new.id, 0, 0, 'light');
  
  -- You can add other initialization logic here (e.g., creating a default workspace or profile)
  
  RETURN new;
END;
$$;

-- 2. Create a trigger to call the function on auth.users insert
-- Drop trigger if exists to avoid conflicts during repeated runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure Plans Table Data Exists (Foreign Key Requirement)
-- If 'light' plan doesn't exist, the insert above will fail.
INSERT INTO public.plans (id, name, monthly_points, max_grid_size, limits)
VALUES ('light', '실속형 (Light)', 1000, 3, '{"places": 1, "competitors": 0}')
ON CONFLICT (id) DO NOTHING;
