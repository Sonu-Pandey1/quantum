-- ============================================================================
-- QUANTUM PULSE MASTER DATABASE UPGRADE
-- Execute this script in Supabase SQL Editor
-- ============================================================================

-- 1. Fix foreign key cascade on daily_completions -> timetable_tasks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_completions_task_id_fkey' 
      AND table_name = 'daily_completions'
  ) THEN
    ALTER TABLE public.daily_completions DROP CONSTRAINT daily_completions_task_id_fkey;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'daily_completions' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'timetable_tasks' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.daily_completions
      ADD CONSTRAINT daily_completions_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.timetable_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Create public.habits table
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  survival_name text,
  pillar text NOT NULL DEFAULT 'Study' CHECK (pillar IN ('Study', 'Health', 'Finance', 'Mind')),
  icon text NOT NULL DEFAULT 'flame',
  color text NOT NULL DEFAULT '#3b82f6',
  habit_type text NOT NULL DEFAULT 'check' CHECK (habit_type IN ('check', 'counter')),
  daily_goal integer NOT NULL DEFAULT 1,
  unit text DEFAULT 'times',
  target_days_per_week smallint NOT NULL DEFAULT 7 CHECK (target_days_per_week BETWEEN 1 AND 7),
  xp_reward integer NOT NULL DEFAULT 30,
  time_of_day text NOT NULL DEFAULT 'anytime',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create public.habit_logs table
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  count_value integer NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT true,
  xp_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, completed_date)
);

-- 4. Create public.daily_biometrics table
CREATE TABLE IF NOT EXISTS public.daily_biometrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric DEFAULT 75.0,
  water_liters numeric DEFAULT 0,
  sleep_hours numeric DEFAULT 7.5,
  daily_win text,
  tomorrow_priority text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_biometrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist
DROP POLICY IF EXISTS "Users can manage their own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can manage their own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can manage their own daily biometrics" ON public.daily_biometrics;

-- Create full RLS policies (auth.uid() = user_id)
CREATE POLICY "Users can manage their own habits"
  ON public.habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own habit logs"
  ON public.habit_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own daily biometrics"
  ON public.daily_biometrics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_daily_biometrics_user_date ON public.daily_biometrics(user_id, log_date);

