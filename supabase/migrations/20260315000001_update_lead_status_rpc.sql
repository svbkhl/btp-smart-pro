-- 1) Supprimer l'ancienne contrainte AVANT toute modification (sinon l'UPDATE échoue)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- 2) Migrer les anciens "CONTACTED" vers "TO_CALLBACK"
UPDATE public.leads SET status = 'TO_CALLBACK' WHERE status = 'CONTACTED';

-- 3) Nouvelle contrainte : accepter uniquement les 7 statuts
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'NEW',
    'TO_CALLBACK',
    'NO_ANSWER',
    'NOT_INTERESTED',
    'QUALIFIED',
    'SIGNED',
    'LOST'
  )
);

-- 4) RPC pour changer le statut d'un lead (contourne RLS, vérifie owner côté serveur)
CREATE OR REPLACE FUNCTION public.update_lead_status(
  p_lead_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_is_admin BOOLEAN;
  v_row public.leads%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Statuts autorisés (aligné avec la contrainte leads_status_check)
  IF p_status IS NULL OR p_status NOT IN (
    'NEW', 'TO_CALLBACK', 'NO_ANSWER', 'NOT_INTERESTED', 'QUALIFIED', 'SIGNED', 'LOST'
  ) THEN
    RAISE EXCEPTION 'Statut invalide : %', p_status;
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.leads WHERE id = p_lead_id LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  v_is_admin := (auth.jwt() -> 'user_metadata' ->> 'is_system_admin')::boolean IS TRUE;
  IF v_owner_id <> auth.uid() AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Vous ne pouvez modifier que vos propres leads';
  END IF;

  UPDATE public.leads
  SET status = p_status, updated_at = NOW()
  WHERE id = p_lead_id
  RETURNING * INTO v_row;

  RETURN row_to_json(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lead_status(UUID, TEXT) TO authenticated;
