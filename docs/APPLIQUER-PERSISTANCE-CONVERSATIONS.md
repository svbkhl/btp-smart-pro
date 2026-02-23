# Persistance des conversations IA (comme ChatGPT)

Si vos conversations disparaissent après un rafraîchissement de la page, appliquez ce script SQL dans Supabase.

## Étapes

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu du fichier `supabase/migrations/20260221000001_ai_conversations_persist_fallback.sql`
3. Cliquez sur **Run**

Ou exécutez directement ce SQL :

```sql
-- Fallback RLS pour ai_conversations : persistance des conversations comme ChatGPT
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
```

## Vérification

Après avoir exécuté le script :

- Créez une nouvelle conversation dans l’assistant IA
- Actualisez la page (F5)
- La conversation doit rester affichée dans la barre à gauche
