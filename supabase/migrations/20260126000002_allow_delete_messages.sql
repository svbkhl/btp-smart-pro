-- =====================================================
-- Autoriser la suppression des messages par leur propriétaire
-- =====================================================
-- Permet à l'utilisateur de supprimer ses propres messages
-- depuis la page Messagerie (sélection multiple).
-- =====================================================

DROP POLICY IF EXISTS "Messages cannot be deleted" ON public.messages;

CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete their own messages" ON public.messages IS
  'Permet à l''utilisateur de supprimer ses propres messages depuis la messagerie';
