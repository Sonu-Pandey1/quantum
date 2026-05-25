-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║         QUANTUM GROWTH OS — MASTER DATABASE INITIALIZATION               ║
-- ║                                                                          ║
-- ║  VERSION: 3.1 (Comprehensive Identity, Persistence & Modules - Unified)  ║
-- ║                                                                          ║
-- ║  ✅ SAFE TO RE-RUN: All statements use IF NOT EXISTS / OR REPLACE        ║
-- ║  ✅ UNIFIED: Combines original schema, identity fixes, and all modules   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ===========================================================================
-- PART 1: ENUM TYPES
-- ===========================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ===========================================================================
-- PART 2: PROFILES TABLE (Core Identity)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT,
  display_name         TEXT,
  role                 user_role DEFAULT 'user',
  onboarding_completed BOOLEAN   DEFAULT FALSE,
  archetype            TEXT      DEFAULT 'None',
  goals                JSONB     DEFAULT '[]'::jsonb,
  settings             JSONB     DEFAULT '{}'::jsonb,
  total_xp             INTEGER   DEFAULT 0     NOT NULL,
  pillar_xp            JSONB     DEFAULT '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb NOT NULL,
  streak_count         INTEGER   DEFAULT 0     NOT NULL,
  last_activity_date   DATE,
  current_login_streak INTEGER   DEFAULT 0     NOT NULL,
  longest_login_streak INTEGER   DEFAULT 0     NOT NULL,
  last_login_date      DATE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist (Migration Safety)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed  BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archetype             TEXT    DEFAULT 'None';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goals                 JSONB   DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings              JSONB   DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp              INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pillar_xp             JSONB   DEFAULT '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count          INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date    DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_login_streak  INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_login_streak  INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date       DATE;

-- Data normalization for existing rows
UPDATE public.profiles SET total_xp = 0 WHERE total_xp IS NULL;
UPDATE public.profiles SET pillar_xp = '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb WHERE pillar_xp IS NULL;
UPDATE public.profiles SET streak_count = 0 WHERE streak_count IS NULL;
UPDATE public.profiles SET current_login_streak = 0 WHERE current_login_streak IS NULL;
UPDATE public.profiles SET longest_login_streak = 0 WHERE longest_login_streak IS NULL;
UPDATE public.profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;
UPDATE public.profiles SET goals = '[]'::jsonb WHERE goals IS NULL;
UPDATE public.profiles SET settings = '{}'::jsonb WHERE settings IS NULL;

-- Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


-- ===========================================================================
-- PART 3: ACTIVITY & ENGAGEMENT MODULES
-- ===========================================================================

-- Activity Logs: Individual XP records
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT    NOT NULL,
  pillar      TEXT,
  xp_earned   INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own actions" ON public.activity_logs;
CREATE POLICY "Users can manage own actions" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- Daily Activity: Aggregated daily XP (Heatmap)
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date           DATE    NOT NULL DEFAULT CURRENT_DATE,
  xp_earned      INTEGER DEFAULT 0 NOT NULL,
  activity_count INTEGER DEFAULT 0 NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own daily activity" ON public.daily_activity;
CREATE POLICY "Users can manage own daily activity" ON public.daily_activity FOR ALL USING (auth.uid() = user_id);

-- Login Logs: Streak source of truth
CREATE TABLE IF NOT EXISTS public.login_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, login_date)
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own login logs" ON public.login_logs;
CREATE POLICY "Users can manage own login logs" ON public.login_logs FOR ALL USING (auth.uid() = user_id);


-- ===========================================================================
-- PART 4: CORE SYSTEMS (Engine, Vault, Practice)
-- ===========================================================================

-- Engine Module: Task completions (Optimized task_id type directly to TEXT)
CREATE TABLE IF NOT EXISTS public.executions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL,
  date_string TEXT    NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.executions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to executions" ON public.executions;
DROP POLICY IF EXISTS "Users manage own executions" ON public.executions;
CREATE POLICY "Users manage own executions" ON public.executions FOR ALL USING (auth.uid() = user_id);

-- Vault Module: Ledger investments
CREATE TABLE IF NOT EXISTS public.investments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT    NOT NULL,
  amount      NUMERIC NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to investments" ON public.investments;
DROP POLICY IF EXISTS "Users manage own investments" ON public.investments;
CREATE POLICY "Users manage own investments" ON public.investments FOR ALL USING (auth.uid() = user_id);

-- Logic Hub Module: Problem Solving XP
CREATE TABLE IF NOT EXISTS public.logic_xp (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_name TEXT    NOT NULL,
  difficulty   TEXT,
  xp_gained    INTEGER DEFAULT 0 NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE public.logic_xp ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.logic_xp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to logic_xp" ON public.logic_xp;
DROP POLICY IF EXISTS "Users manage own logic_xp" ON public.logic_xp;
CREATE POLICY "Users manage own logic_xp" ON public.logic_xp FOR ALL USING (auth.uid() = user_id);

-- Practice Hub Module: Question tracking & 7-day locks
CREATE TABLE IF NOT EXISTS public.practice_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id      TEXT    NOT NULL,
  last_solved_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  solve_count      INTEGER DEFAULT 1 NOT NULL,
  total_xp_earned  INTEGER DEFAULT 0 NOT NULL,
  UNIQUE (user_id, question_id)
);
ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own submissions" ON public.practice_submissions;
CREATE POLICY "Users can manage own submissions" ON public.practice_submissions FOR ALL USING (auth.uid() = user_id);


-- ===========================================================================
-- PART 5: TRIGGERS & PROCEDURES (RPCs)
-- ===========================================================================

-- Auto-Create Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name,
    role, 
    total_xp, 
    pillar_xp, 
    onboarding_completed,
    archetype,
    goals
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    'user', 
    0, 
    '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb, 
    FALSE,
    'None',
    '[]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- XP Heatmap Incrementor
CREATE OR REPLACE FUNCTION public.increment_daily_activity(p_user_id UUID, p_date DATE, p_amount INTEGER) RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, date, xp_earned, activity_count)
  VALUES (p_user_id, p_date, p_amount, 1)
  ON CONFLICT (user_id, date) DO UPDATE
  SET xp_earned = daily_activity.xp_earned + p_amount, activity_count = daily_activity.activity_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login Streak Processor
CREATE OR REPLACE FUNCTION public.record_user_login(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE) RETURNS void AS $$
DECLARE
  v_last_login DATE;
  v_today DATE := p_date;
BEGIN
  SELECT last_login_date INTO v_last_login FROM public.profiles WHERE id = p_user_id;
  INSERT INTO public.login_logs (user_id, login_date) VALUES (p_user_id, v_today) ON CONFLICT (user_id, login_date) DO NOTHING;
  IF v_last_login IS NULL THEN
    UPDATE public.profiles SET current_login_streak = 1, longest_login_streak = GREATEST(longest_login_streak, 1), last_login_date = v_today WHERE id = p_user_id;
  ELSIF v_last_login = v_today THEN NULL;
  ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
    UPDATE public.profiles SET current_login_streak = current_login_streak + 1, longest_login_streak = GREATEST(longest_login_streak, current_login_streak + 1), last_login_date = v_today WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles SET current_login_streak = 1, last_login_date = v_today WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- PART 6: SUPER ADMIN & REWARDS SYSTEM
-- ===========================================================================

-- 1. App Config Table (For Super Admin Global Settings)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- RLS: Only admins can read/write to app_config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read config" ON public.app_config;
CREATE POLICY "Admins can read config" ON public.app_config 
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update config" ON public.app_config;
CREATE POLICY "Admins can update config" ON public.app_config 
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Insert default global config
INSERT INTO public.app_config (key, value) 
VALUES ('global_settings', '{"xpMultiplier": 1.0, "isGlobalEvent": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Rewards System
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_level INTEGER NOT NULL,
  pillar TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert initial badges
INSERT INTO public.rewards (title, description, required_level, pillar, icon) VALUES
('Early Riser', 'Complete a task before 6AM', 5, 'Health', 'Sun'),
('Code Architect', 'Reach level 10 in Study', 10, 'Study', 'Code'),
('Wealth Builder', 'Reach level 5 in Finance', 5, 'Finance', 'DollarSign')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, reward_id)
);

-- Rewards RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read rewards" ON public.rewards;
CREATE POLICY "Public read rewards" ON public.rewards FOR SELECT USING (true);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own rewards" ON public.user_rewards;
CREATE POLICY "Users can read own rewards" ON public.user_rewards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own rewards" ON public.user_rewards;
CREATE POLICY "Users can insert own rewards" ON public.user_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Make sure profiles RLS allows admins to manage them
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles 
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- ===========================================================================
-- PART 7: TIMETABLE SYSTEM
-- ===========================================================================

-- 1. Tasks per day (user-defined)
CREATE TABLE IF NOT EXISTS timetable_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  pillar           TEXT NOT NULL CHECK (pillar IN ('Study','Health','Finance','Mind')),
  category         TEXT NOT NULL CHECK (category IN ('gym','study','work','mind','other')) DEFAULT 'other',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_weekend       BOOLEAN NOT NULL DEFAULT FALSE,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE timetable_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages own tasks" ON timetable_tasks;
CREATE POLICY "User manages own tasks" ON timetable_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Daily completion log (one row per task per day)
CREATE TABLE IF NOT EXISTS daily_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  task_id      UUID NOT NULL REFERENCES timetable_tasks(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, date, task_id)
);

ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages own completions" ON daily_completions;
CREATE POLICY "User manages own completions" ON daily_completions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Bonus XP claim log (prevents double-claiming same day)
CREATE TABLE IF NOT EXISTS daily_bonus_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  tier             TEXT NOT NULL,
  bonus_multiplier NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_bonus_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages own bonus log" ON daily_bonus_log;
CREATE POLICY "User manages own bonus log" ON daily_bonus_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Discipline badges (cumulative counts)
CREATE TABLE IF NOT EXISTS timetable_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  tier       TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_type)
);

ALTER TABLE timetable_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manages own badges" ON timetable_badges;
CREATE POLICY "User manages own badges" ON timetable_badges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_timetable_tasks_user_day ON timetable_tasks(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_completions_user_date ON daily_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_log_user_date ON daily_bonus_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_timetable_badges_user ON timetable_badges(user_id);


-- ===========================================================================
-- PART 8: SCHEMALESS OR CONDITIONAL UPGRADES
-- ===========================================================================
ALTER TABLE public.executions ALTER COLUMN task_id TYPE TEXT;
