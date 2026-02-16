-- =====================================================
-- TABLE ai_estimations - Historique des estimations IA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_estimations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Estimation',
  description TEXT,
  estimation_result TEXT NOT NULL,
  images_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_estimations_user_id ON public.ai_estimations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_estimations_created_at ON public.ai_estimations(created_at DESC);

-- RLS
ALTER TABLE public.ai_estimations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own estimations" ON public.ai_estimations;
CREATE POLICY "Users can view own estimations"
  ON public.ai_estimations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own estimations" ON public.ai_estimations;
CREATE POLICY "Users can create own estimations"
  ON public.ai_estimations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own estimations" ON public.ai_estimations;
CREATE POLICY "Users can delete own estimations"
  ON public.ai_estimations FOR DELETE
  USING (auth.uid() = user_id);
