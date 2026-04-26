-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║         QUANTUM GROWTH OS — ONBOARDING & IDENTITY FIX                     ║
-- ║  Run this in the Supabase SQL Editor to enable cross-device persistence.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Add missing identity columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archetype            TEXT    DEFAULT 'None';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goals                JSONB   DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name          TEXT;

-- 2. Update existing users who might have already "completed" onboarding locally
-- (Optional: This doesn't hurt anyone)
UPDATE public.profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;

-- 3. Ensure the handle_new_user trigger includes these new fields (if needed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    role,
    onboarding_completed,
    archetype,
    goals
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    'user',
    FALSE,
    'None',
    '[]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
