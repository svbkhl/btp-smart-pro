-- =====================================================
-- FIX : company_id null sur invoices à l'insert
-- =====================================================
-- Ce trigger remplit company_id depuis company_users si null
-- à l'insert. À exécuter dans Supabase Dashboard → SQL Editor.
-- Résout l'erreur "null value in column company_id" même si
-- l'Edge Function déployée est une ancienne version.
-- =====================================================

CREATE OR REPLACE FUNCTION public.invoices_fill_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_new_company_id UUID;
BEGIN
  -- Si company_id est déjà renseigné, ne rien faire
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Récupérer le company_id depuis company_users pour cet utilisateur
  SELECT cu.company_id INTO v_company_id
  FROM public.company_users cu
  WHERE cu.user_id = NEW.user_id
  LIMIT 1;

  -- 2) Si aucun : créer une entreprise par défaut et lier l'utilisateur
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, owner_id)
    VALUES ('Entreprise par défaut', NEW.user_id)
    RETURNING id INTO v_new_company_id;

    IF v_new_company_id IS NOT NULL THEN
      INSERT INTO public.company_users (company_id, user_id, role)
      VALUES (v_new_company_id, NEW.user_id, 'owner');
      v_company_id := v_new_company_id;
    END IF;
  END IF;

  IF v_company_id IS NOT NULL THEN
    NEW.company_id := v_company_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existait déjà (éviter doublons)
DROP TRIGGER IF EXISTS invoices_fill_company_id_trigger ON public.invoices;

-- Créer le trigger BEFORE INSERT
CREATE TRIGGER invoices_fill_company_id_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.invoices_fill_company_id();

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger invoices_fill_company_id_trigger créé : company_id sera rempli depuis company_users si null à l''insert.';
END $$;
