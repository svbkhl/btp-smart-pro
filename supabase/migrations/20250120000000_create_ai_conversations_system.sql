-- =====================================================
-- SYSTÈME COMPLET DE CONVERSATIONS IA
-- =====================================================
-- Création des tables pour un système de conversations
-- similaire à ChatGPT avec persistance totale
-- =====================================================

-- 1. TABLE: ai_conversations (conversations principales)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  metadata JSONB DEFAULT '{}'::jsonb, -- type: btp, rh, devis, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false
);

-- Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- Ajouter updated_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.ai_conversations 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
    -- Mettre à jour les valeurs NULL avec la date actuelle
    UPDATE public.ai_conversations 
    SET updated_at = COALESCE(created_at, now()) 
    WHERE updated_at IS NULL;
    -- Maintenant rendre la colonne NOT NULL
    ALTER TABLE public.ai_conversations 
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now();
    RAISE NOTICE 'Colonne updated_at ajoutée à ai_conversations';
  END IF;

  -- Ajouter last_message_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations' 
    AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE public.ai_conversations 
    ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Colonne last_message_at ajoutée à ai_conversations';
  END IF;

  -- Ajouter is_archived si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations' 
    AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE public.ai_conversations 
    ADD COLUMN is_archived BOOLEAN DEFAULT false;
    RAISE NOTICE 'Colonne is_archived ajoutée à ai_conversations';
  END IF;

  -- Ajouter title si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.ai_conversations 
    ADD COLUMN title TEXT;
    -- Mettre à jour les valeurs NULL avec une valeur par défaut
    UPDATE public.ai_conversations 
    SET title = 'Nouvelle conversation' 
    WHERE title IS NULL;
    -- Maintenant rendre la colonne NOT NULL
    ALTER TABLE public.ai_conversations 
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN title SET DEFAULT 'Nouvelle conversation';
    RAISE NOTICE 'Colonne title ajoutée à ai_conversations';
  END IF;

  -- Ajouter metadata si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.ai_conversations 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne metadata ajoutée à ai_conversations';
  END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON public.ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message_at ON public.ai_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived ON public.ai_conversations(is_archived) WHERE is_archived = false;

-- 2. TABLE: ai_messages (messages individuels)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sequence_number INTEGER NOT NULL DEFAULT 0 -- Ordre dans la conversation
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_sequence ON public.ai_messages(conversation_id, sequence_number);

-- 3. ACTIVER RLS
-- =====================================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES RLS POUR ai_conversations
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 5. POLICIES RLS POUR ai_messages
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.ai_messages;
CREATE POLICY "Users can view messages from their conversations"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.ai_messages;
CREATE POLICY "Users can create messages in their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.ai_messages;
CREATE POLICY "Users can update messages in their conversations"
  ON public.ai_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON public.ai_messages;
CREATE POLICY "Users can delete messages from their conversations"
  ON public.ai_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- 6. FONCTION: Mettre à jour updated_at et last_message_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET updated_at = now(),
      last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour les timestamps lors de l'ajout d'un message
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.ai_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- 7. FONCTION: Générer un titre automatique depuis le premier message
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_generate_conversation_title()
RETURNS TRIGGER AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  -- Si c'est le premier message de la conversation (user)
  IF NEW.role = 'user' AND NEW.sequence_number = 1 THEN
    -- Récupérer le contenu du message
    first_message := NEW.content;
    
    -- Générer un titre (premiers 50 caractères)
    generated_title := LEFT(TRIM(first_message), 50);
    IF generated_title = '' THEN
      generated_title := 'Nouvelle conversation';
    END IF;
    
    -- Mettre à jour le titre de la conversation
    UPDATE public.ai_conversations
    SET title = generated_title
    WHERE id = NEW.conversation_id
    AND (title = 'Nouvelle conversation' OR title IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour générer le titre automatiquement
DROP TRIGGER IF EXISTS auto_title_on_first_message ON public.ai_messages;
CREATE TRIGGER auto_title_on_first_message
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_conversation_title();

-- 8. MIGRATION DES DONNÉES EXISTANTES (si ai_conversations existe déjà)
-- =====================================================
DO $$
DECLARE
  old_conv RECORD;
  new_conv_id UUID;
  msg_count INTEGER;
BEGIN
  -- Vérifier si l'ancienne table existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_conversations'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_conversations' 
      AND column_name = 'message'
    )
  ) THEN
    -- Migrer les anciennes conversations vers le nouveau format
    FOR old_conv IN 
      SELECT DISTINCT ON (user_id, DATE(created_at))
        id, user_id, message, response, context, created_at
      FROM public.ai_conversations
      WHERE message IS NOT NULL
      ORDER BY user_id, DATE(created_at), created_at
    LOOP
      -- Créer une nouvelle conversation
      INSERT INTO public.ai_conversations (user_id, title, metadata, created_at, updated_at, last_message_at)
      VALUES (
        old_conv.user_id,
        LEFT(TRIM(old_conv.message), 50),
        COALESCE(old_conv.context, '{}'::jsonb),
        old_conv.created_at,
        old_conv.created_at,
        old_conv.created_at
      )
      RETURNING id INTO new_conv_id;
      
      -- Ajouter les messages
      INSERT INTO public.ai_messages (conversation_id, role, content, metadata, created_at, sequence_number)
      VALUES (new_conv_id, 'user', old_conv.message, '{}'::jsonb, old_conv.created_at, 1);
      
      IF old_conv.response IS NOT NULL THEN
        INSERT INTO public.ai_messages (conversation_id, role, content, metadata, created_at, sequence_number)
        VALUES (new_conv_id, 'assistant', old_conv.response, '{}'::jsonb, old_conv.created_at, 2);
      END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migration des anciennes conversations terminée';
  END IF;
END $$;

-- 9. VÉRIFICATION FINALE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SYSTÈME DE CONVERSATIONS IA CRÉÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables créées :';
  RAISE NOTICE '  - ai_conversations';
  RAISE NOTICE '  - ai_messages';
  RAISE NOTICE '========================================';
END $$;

