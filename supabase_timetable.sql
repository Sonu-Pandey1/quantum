-- ============================================================
-- TIMETABLE SYSTEM — Safe to re-run (IF NOT EXISTS)
-- ============================================================

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
