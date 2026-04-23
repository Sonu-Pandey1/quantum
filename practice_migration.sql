-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║         PRACTICE HUB SYSTEM — DATABASE MIGRATION                        ║
-- ║                                                                          ║
-- ║  RUN THIS IN SUPABASE SQL EDITOR TO ENABLE PERSISTENCE & LOCK SYSTEM    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.practice_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id      TEXT    NOT NULL,
  last_solved_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  solve_count      INTEGER DEFAULT 1 NOT NULL,
  total_xp_earned  INTEGER DEFAULT 0 NOT NULL,
  UNIQUE (user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage own submissions" ON public.practice_submissions;
CREATE POLICY "Users can manage own submissions"
  ON public.practice_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
