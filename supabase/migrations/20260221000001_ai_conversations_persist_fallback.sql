-- Fallback RLS pour ai_conversations : persistance des conversations comme ChatGPT
-- Permet à l'utilisateur de voir ses conversations même si company_id bloque (rétrocompatibilité)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_conversations') THEN
    DROP POLICY IF EXISTS "Users can always view own conversations fallback" ON public.ai_conversations;
    CREATE POLICY "Users can always view own conversations fallback"
      ON public.ai_conversations FOR SELECT
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can always insert own conversations fallback" ON public.ai_conversations;
    CREATE POLICY "Users can always insert own conversations fallback"
      ON public.ai_conversations FOR INSERT
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can always update own conversations fallback" ON public.ai_conversations;
    CREATE POLICY "Users can always update own conversations fallback"
      ON public.ai_conversations FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can always delete own conversations fallback" ON public.ai_conversations;
    CREATE POLICY "Users can always delete own conversations fallback"
      ON public.ai_conversations FOR DELETE
      USING (user_id = auth.uid());

    RAISE NOTICE '✅ Policies fallback user_id pour ai_conversations créées';
  END IF;
END $$;
