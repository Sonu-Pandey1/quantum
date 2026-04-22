-- ============================================================
-- QUANTUM GROWTH OS — XP PERSISTENCE FIX
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor
-- It is safe to re-run multiple times (all statements are idempotent)
-- ============================================================

-- ── 1. Ensure all required columns exist on profiles ─────────────────────────
-- (Safe: ADD COLUMN IF NOT EXISTS does nothing if already there)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp             INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pillar_xp            JSONB   DEFAULT '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_count         INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date   DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role                 TEXT    DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_login_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_login_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date      DATE;

-- ── 2. Ensure activity_logs table exists ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  pillar      TEXT,
  xp_earned   INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. Ensure daily_activity table exists ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_activity (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned      INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ── 4. Enable RLS on all tables (safe if already enabled) ────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- ── 5. Drop and recreate RLS policies (idempotent) ───────────────────────────

-- profiles: read own
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- profiles: update own
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- activity_logs: insert own
DROP POLICY IF EXISTS "Users can insert own actions" ON public.activity_logs;
CREATE POLICY "Users can insert own actions"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- activity_logs: read own
DROP POLICY IF EXISTS "Users can read own actions" ON public.activity_logs;
CREATE POLICY "Users can read own actions"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- daily_activity: all operations on own rows
DROP POLICY IF EXISTS "Users can manage own daily activity" ON public.daily_activity;
CREATE POLICY "Users can manage own daily activity"
  ON public.daily_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 6. Ensure the auto-create profile trigger exists ─────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, total_xp, pillar_xp)
  VALUES (
    new.id,
    'user',
    0,
    '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 7. Ensure increment_daily_activity RPC exists ────────────────────────────

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
  SET xp_earned      = daily_activity.xp_earned + p_amount,
      activity_count = daily_activity.activity_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Backfill: ensure your existing user has a profile row ─────────────────
-- This handles the case where the trigger didn't run for existing auth users.
-- Replace 'your-email@example.com' with your actual login email if needed.

INSERT INTO public.profiles (id, role, total_xp, pillar_xp)
SELECT id, 'user', 0, '{"Study":0,"Health":0,"Finance":0,"Mind":0}'::jsonb
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- After running this, refresh the app. XP should now persist correctly.
