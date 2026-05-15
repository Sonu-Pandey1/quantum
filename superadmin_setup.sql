-- ===========================================================================
-- QUANTUM GROWTH OS - SUPER ADMIN & REWARDS SETUP
-- Execute this script in your Supabase SQL Editor
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

-- 2. Rewards System (For Issue 5)
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
