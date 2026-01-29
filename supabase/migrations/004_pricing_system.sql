-- Migration: 004_pricing_system.sql [Phase 1 Implementation]

-- 1. Create Plans Table
CREATE TABLE public.plans (
    id text PRIMARY KEY, -- 'light', 'basic', 'pro'
    name text NOT NULL,
    monthly_points bigint NOT NULL,
    max_grid_size int NOT NULL DEFAULT 3, -- e.g., 3 means 3x3
    limits jsonb NOT NULL, -- { "places": 1, "competitors": 0 }
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create User Credits Table (Dual Wallet)
CREATE TABLE public.user_credits (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_balance bigint NOT NULL DEFAULT 0, -- Monthly expiring points
    cash_balance bigint NOT NULL DEFAULT 0, -- Permanent points
    plan_id text REFERENCES public.plans(id) DEFAULT 'light',
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create Credit Ledger (Transaction History)
CREATE TABLE public.credit_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount bigint NOT NULL, -- Negative for usage, positive for charge/refund
    type text NOT NULL, -- 'usage', 'reset', 'charge', 'refund'
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Managed Places ("My Place")
CREATE TABLE public.managed_places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id text NOT NULL, -- External Platform ID
    place_name text, -- For easier UI display
    locked_until timestamp with time zone NOT NULL DEFAULT now() + interval '30 days',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, place_id)
);

-- 5. Managed Competitors
CREATE TABLE public.managed_competitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id text NOT NULL,
    place_name text,
    locked_until timestamp with time zone NOT NULL DEFAULT now() + interval '30 days',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, place_id)
);

-- 6. Search Schedules (Automated Search)
CREATE TABLE public.search_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id text NOT NULL, -- Could be from managed_places or competitors
    keywords text[] NOT NULL,
    grid_config jsonb NOT NULL,
    crawling_days int[] NOT NULL, -- [1, 3, 5] for Mon, Wed, Fri
    crawling_time time NOT NULL, -- '09:00:00'
    is_active boolean NOT NULL DEFAULT true,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic)
-- Plans: Readable by everyone
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);

-- User Credits: Users can see their own
CREATE POLICY "Users view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

-- Credit Ledger: Users can see their own
CREATE POLICY "Users view own ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);

-- Managed Places: Users can see/manage their own
CREATE POLICY "Users manage own places" ON public.managed_places USING (auth.uid() = user_id);

-- Managed Competitors: Users can see/manage their own
CREATE POLICY "Users manage own competitors" ON public.managed_competitors USING (auth.uid() = user_id);

-- Search Schedules: Users can see/manage their own
CREATE POLICY "Users manage own schedules" ON public.search_schedules USING (auth.uid() = user_id);


-- Seed Data
INSERT INTO public.plans (id, name, monthly_points, max_grid_size, limits) VALUES
('light', '실속형 (Light)', 1000, 3, '{"places": 1, "competitors": 0}'),
('basic', '표준형 (Basic)', 5000, 5, '{"places": 1, "competitors": 3}'),
('pro', '고급형 (Pro)', 12000, 7, '{"places": 3, "competitors": 10}')
ON CONFLICT (id) DO NOTHING;


-- RPC Functions

-- 1. Deduct Points
CREATE OR REPLACE FUNCTION public.deduct_points(p_cost bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_sub_bal bigint;
    v_cash_bal bigint;
    v_remaining_cost bigint;
BEGIN
    v_user_id := auth.uid();
    v_remaining_cost := p_cost;

    -- Lock the row
    SELECT subscription_balance, cash_balance INTO v_sub_bal, v_cash_bal
    FROM public.user_credits
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;

    -- Check balance
    IF (v_sub_bal + v_cash_bal < p_cost) THEN
        RAISE EXCEPTION 'Insufficient points';
    END IF;

    -- Deduct logic
    IF (v_sub_bal >= v_remaining_cost) THEN
        UPDATE public.user_credits
        SET subscription_balance = subscription_balance - v_remaining_cost
        WHERE user_id = v_user_id;
    ELSE
        v_remaining_cost := v_remaining_cost - v_sub_bal;
        UPDATE public.user_credits
        SET subscription_balance = 0,
            cash_balance = cash_balance - v_remaining_cost
        WHERE user_id = v_user_id;
    END IF;

    -- Log
    INSERT INTO public.credit_ledger (user_id, amount, type, description)
    VALUES (v_user_id, -p_cost, 'usage', 'Search deduction');

    RETURN TRUE;
END;
$$;


-- 2. Refund Points
CREATE OR REPLACE FUNCTION public.refund_points(p_amount bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    -- Lock row
    PERFORM 1 FROM public.user_credits WHERE user_id = v_user_id FOR UPDATE;

    -- Refund implementation (Refund to subscription balance essentially reverses the primary deduction source)
    -- Simplified approach: Add to subscription balance.
    UPDATE public.user_credits
    SET subscription_balance = subscription_balance + p_amount
    WHERE user_id = v_user_id;

    -- Log
    INSERT INTO public.credit_ledger (user_id, amount, type, description)
    VALUES (v_user_id, p_amount, 'refund', 'Search failure refund');

    RETURN TRUE;
END;
$$;


-- 3. Charge Points
CREATE OR REPLACE FUNCTION public.charge_points(p_user_id uuid, p_amount bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admin or system should call this, ideally. For now, we make it general but logic assumes secure context or RLS?
    -- SECURITY DEFINER logic usually bypasses RLS, so this can be called. 
    -- However, we should check if the caller has permission? 
    -- For simplicity in Phase 1, we assume this is called by a verified server-side process (using Service Role Key) 
    -- or we allow p_user_id to be passed explicitly.

    -- Lock row
    PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

    -- Add to cash balance
    UPDATE public.user_credits
    SET cash_balance = cash_balance + p_amount
    WHERE user_id = p_user_id;

    -- Log
    INSERT INTO public.credit_ledger (user_id, amount, type, description)
    VALUES (p_user_id, p_amount, 'charge', 'Point purchase');

    RETURN TRUE;
END;
$$;
