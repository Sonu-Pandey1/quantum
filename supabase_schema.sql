-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║         QUANTUM GROWTH OS — COMPLETE DATABASE SETUP                     ║
-- ║                                                                          ║
-- ║  HOW TO RUN:                                                             ║
-- ║  1. Go to supabase.com → your project → SQL Editor (left sidebar)       ║
-- ║  2. Click the [+] button to open a NEW query tab                        ║
-- ║  3. SELECT ALL text in this file (Ctrl+A) and paste it                  ║
-- ║  4. Click "Run" button (top right of the editor)                        ║
-- ║  5. Wait for "Success. No rows returned." message                       ║
-- ║                                                                          ║
-- ║  ✅ SAFE TO RE-RUN: All statements use IF NOT EXISTS / OR REPLACE       ║
-- ║  ✅ DELETE OLD SCRIPTS: You can delete all previous saved queries       ║
-- ║     in Supabase SQL Editor — this script replaces everything            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ===========================================================================
-- PART 1: ENUM TYPE
-- Used by: profiles.role column
-- ===========================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;  -- already exists, skip silently
END $$;


-- ===========================================================================
-- PART 2: PROFILES TABLE
-- Used by:  useProgression.tsx    → SELECT total_xp, pillar_xp, streak_count,
--                                          last_activity_date, role
--                                 → UPDATE total_xp, pillar_xp, streak_count,
--                                          last_activity_date
--           useEngagement.tsx     → SELECT current_login_streak,
--                                          longest_login_streak, last_login_date
--           ActivityGraph.tsx     → SELECT streak_count
--           App.tsx               → SELECT role  (admin check)
--           OnboardingScreen.tsx  → UPDATE username, role
--           AdminDashboard.tsx    → SELECT *  (admin view)
--           record_user_login()   → UPDATE current/longest streak, last_login_date
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT,
  role                 user_role DEFAULT 'user',
  total_xp             INTEGER   DEFAULT 0     NOT NULL,
  pillar_xp            JSONB     DEFAULT '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb NOT NULL,
  streak_count         INTEGER   DEFAULT 0     NOT NULL,   -- ACTIVITY streak (not login)
  last_activity_date   DATE,
  current_login_streak INTEGER   DEFAULT 0     NOT NULL,
  longest_login_streak INTEGER   DEFAULT 0     NOT NULL,
  last_login_date      DATE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe column adds: runs even if table already existed with old schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp             INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pillar_xp            JSONB   DEFAULT '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count         INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date   DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_login_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_login_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date      DATE;

-- Fix NULL values in case old rows have NULL in NOT NULL columns
UPDATE public.profiles SET total_xp             = 0  WHERE total_xp             IS NULL;
UPDATE public.profiles SET pillar_xp            = '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb
                       WHERE pillar_xp          IS NULL;
UPDATE public.profiles SET streak_count         = 0  WHERE streak_count         IS NULL;
UPDATE public.profiles SET current_login_streak = 0  WHERE current_login_streak IS NULL;
UPDATE public.profiles SET longest_login_streak = 0  WHERE longest_login_streak IS NULL;

-- Backfill: create a profile row for any auth user that doesn't have one yet
-- (handles existing accounts created before the auto-trigger was in place)
INSERT INTO public.profiles (id, role, total_xp, pillar_xp)
SELECT id, 'user', 0, '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb
FROM auth.users
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Own row: SELECT
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Own row: UPDATE
-- ⚠️  NO "WITH CHECK" here — WITH CHECK causes infinite recursion on some
--     Supabase/PostgREST versions when Postgres re-evaluates the policy
--     against the new row after the update.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Helper function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin SELECT: admins can read all profiles (needed for AdminDashboard page)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());


-- ===========================================================================
-- PART 3: ACTIVITY LOGS TABLE
-- Individual XP action records → powers the Engagement Hub recent feed
-- Used by:  useProgression.tsx    → INSERT (action_type, pillar, xp_earned)
--           useEngagement.tsx     → SELECT (action_type, pillar, xp_earned, created_at)
--           ActivityGraph.tsx     → SELECT per day (action_type, pillar, xp_earned)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT    NOT NULL,
  pillar      TEXT,
  xp_earned   INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own actions" ON public.activity_logs;
CREATE POLICY "Users can insert own actions"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own actions" ON public.activity_logs;
CREATE POLICY "Users can read own actions"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);


-- ===========================================================================
-- PART 4: DAILY ACTIVITY TABLE
-- Aggregated daily XP totals → powers the GitHub-style heatmap
-- Used by:  useProgression.tsx    → via increment_daily_activity() RPC
--           useEngagement.tsx     → SELECT COUNT(*) for totalActiveDays
--           ActivityGraph.tsx     → SELECT date, activity_count
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.daily_activity (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date           DATE    NOT NULL DEFAULT CURRENT_DATE,
  xp_earned      INTEGER DEFAULT 0 NOT NULL,
  activity_count INTEGER DEFAULT 0 NOT NULL,
  UNIQUE (user_id, date)   -- one row per user per day; enables ON CONFLICT upsert
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- Drop any old policy variants that may conflict
DROP POLICY IF EXISTS "Users can insert/update own activity"   ON public.daily_activity;
DROP POLICY IF EXISTS "Users can manage own daily activity"    ON public.daily_activity;
CREATE POLICY "Users can manage own daily activity"
  ON public.daily_activity FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ===========================================================================
-- PART 5: LOGIN LOGS TABLE
-- One row per user per calendar day → source of truth for login streaks
-- Used by:  useEngagement.tsx     → SELECT COUNT(*) for totalLoginDays
--           record_user_login()   → INSERT (called on every sign-in)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.login_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, login_date)   -- idempotent: same day = no duplicate
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own logins"       ON public.login_logs;
DROP POLICY IF EXISTS "Users can manage own login logs" ON public.login_logs;
CREATE POLICY "Users can manage own login logs"
  ON public.login_logs FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ===========================================================================
-- PART 6: EXECUTIONS TABLE
-- Engine Card task completions (stored per-day)
-- Used by:  EngineCard.tsx  → SELECT task_id WHERE date_string = today
--                           → INSERT task_id, date_string
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.executions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     INTEGER NOT NULL,
  date_string TEXT    NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- Public access: EngineCard doesn't filter by user_id — global task list
DROP POLICY IF EXISTS "Allow public access to executions" ON public.executions;
CREATE POLICY "Allow public access to executions"
  ON public.executions FOR ALL USING (true);


-- ===========================================================================
-- PART 7: INVESTMENTS TABLE
-- Ledger Card skill investment log
-- Used by:  LedgerCard.tsx  → SELECT * ORDER BY created_at DESC
--                           → INSERT (description, amount)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.investments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT    NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to investments" ON public.investments;
CREATE POLICY "Allow public access to investments"
  ON public.investments FOR ALL USING (true);


-- ===========================================================================
-- PART 8: LOGIC XP TABLE
-- Logic Hub problem-solving XP tracking
-- Used by:  LogicHub.tsx  → SELECT xp_gained (sum)
--                         → INSERT (problem_name, difficulty, xp_gained)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.logic_xp (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_name TEXT    NOT NULL,
  difficulty   TEXT,
  xp_gained    INTEGER DEFAULT 0 NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.logic_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to logic_xp" ON public.logic_xp;
CREATE POLICY "Allow public access to logic_xp"
  ON public.logic_xp FOR ALL USING (true);


-- ===========================================================================
-- PART 9: AUTO-CREATE PROFILE TRIGGER
-- Fires automatically when a NEW user signs up via Supabase Auth.
-- Creates their profiles row so the app never hits a "no profile" error.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    role,
    total_xp,
    pillar_xp,
    streak_count,
    current_login_streak,
    longest_login_streak
  ) VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    'user',
    0,
    '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ===========================================================================
-- PART 10: RPC — increment_daily_activity
-- Called by: useProgression.tsx → addXp() every time user earns XP
-- Signature: supabase.rpc('increment_daily_activity', {
--              p_user_id: string,  p_date: 'YYYY-MM-DD',  p_amount: number
--            })
-- SECURITY DEFINER = bypasses RLS; always works even if policy is wrong
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.increment_daily_activity(
  p_user_id UUID,
  p_date    DATE,
  p_amount  INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, date, xp_earned, activity_count)
  VALUES (p_user_id, p_date, p_amount, 1)
  ON CONFLICT (user_id, date) DO UPDATE
  SET xp_earned      = daily_activity.xp_earned      + p_amount,
      activity_count = daily_activity.activity_count  + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- PART 11: RPC — record_user_login
-- Called by: useEngagement.tsx → recordLoginToday() on every sign-in
-- Signature: supabase.rpc('record_user_login', {
--              p_user_id: string,  p_date: 'YYYY-MM-DD'
--            })
-- Logic:
--   • First login ever → streak = 1
--   • Same day again   → no-op  (idempotent)
--   • Consecutive day  → streak + 1, update longest if needed
--   • Gap > 1 day      → reset to 1
-- SECURITY DEFINER = bypasses RLS; login always records regardless of policies
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.record_user_login(
  p_user_id UUID,
  p_date    DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_last_login DATE;
  v_today      DATE := p_date;
BEGIN
  -- 1. Read current last login date from profile
  SELECT last_login_date INTO v_last_login
  FROM public.profiles
  WHERE id = p_user_id;

  -- 2. Record this login (silently ignore if already recorded today)
  INSERT INTO public.login_logs (user_id, login_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, login_date) DO NOTHING;

  -- 3. Update streak counters
  IF v_last_login IS NULL THEN
    -- First ever login
    UPDATE public.profiles
    SET current_login_streak = 1,
        longest_login_streak = GREATEST(longest_login_streak, 1),
        last_login_date      = v_today
    WHERE id = p_user_id;

  ELSIF v_last_login = v_today THEN
    -- Already processed today → pure no-op
    NULL;

  ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
    -- Consecutive day → extend streak
    UPDATE public.profiles
    SET current_login_streak = current_login_streak + 1,
        longest_login_streak = GREATEST(longest_login_streak, current_login_streak + 1),
        last_login_date      = v_today
    WHERE id = p_user_id;

  ELSE
    -- Missed one or more days → reset streak
    UPDATE public.profiles
    SET current_login_streak = 1,
        last_login_date      = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- ✅ ALL DONE
-- Expected result: "Success. No rows returned."
-- If you see errors, paste them to the assistant for diagnosis.
-- ===========================================================================
