-- ============================================
-- FIX : Corriger le trigger notify_on_client_created
-- ============================================
-- Ce script corrige le trigger qui cause l'erreur
-- "invalid input syntax for type uuid: \"clients\""
-- ============================================

-- Désactiver temporairement le trigger problématique
DROP TRIGGER IF EXISTS trigger_notify_client_created ON public.clients;

-- Recréer le trigger avec une meilleure gestion des erreurs
CREATE OR REPLACE FUNCTION public.notify_on_client_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que la table notifications existe avant d'insérer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    BEGIN
      PERFORM public.create_notification(
        NEW.user_id,
        'Nouveau client ajouté',
        'Le client "' || NEW.name || '" a été ajouté avec succès.',
        'success',
        'clients'::TEXT,  -- S'assurer que c'est bien un TEXT
        NEW.id::UUID      -- S'assurer que c'est bien un UUID
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si la création de notification échoue, ne pas bloquer l'insertion du client
      RAISE WARNING 'Erreur lors de la création de la notification: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trigger_notify_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_created();









