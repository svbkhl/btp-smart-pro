-- Assigner des leads de test à sabbg.du73100@gmail.com pour test d'interface.
-- À exécuter dans le SQL Editor Supabase (Dashboard > SQL Editor).

DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE LOWER(email) = LOWER('sabbg.du73100@gmail.com')
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sabbg.du73100@gmail.com introuvable dans auth.users. Créez le compte ou vérifiez l''email.';
  END IF;

  INSERT INTO public.leads (
    place_id,
    name,
    address,
    dept_code,
    job_dept,
    status,
    owner_id,
    phone_mobile,
    website,
    category,
    size_bucket,
    priority
  ) VALUES
    (
      'test-fake-sabbg-001',
      'SARL Maçonnerie Dupont',
      '12 avenue des Chantiers, 73000 Chambéry',
      '73',
      '73',
      'NEW',
      v_owner_id,
      '06 12 34 56 78',
      'https://maconnerie-dupont-test.fr',
      'Maçonnerie',
      '4-10',
      'A'
    ),
    (
      'test-fake-sabbg-002',
      'Électricité Pro Savoie',
      '8 rue de la Gare, 73100 Aix-les-Bains',
      '73',
      '73',
      'NEW',
      v_owner_id,
      '06 98 76 54 32',
      NULL,
      'Électricité',
      '0-3',
      'B'
    ),
    (
      'test-fake-sabbg-003',
      'Plomberie Chambéry',
      '3 place du Marché, 73000 Chambéry',
      '73',
      '73',
      'CONTACTED',
      v_owner_id,
      '04 79 00 00 01',
      'https://plomberie-chambery-test.fr',
      'Plomberie',
      '10-50',
      'A'
    )
  ON CONFLICT (place_id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    status = EXCLUDED.status,
    updated_at = NOW();

  RAISE NOTICE '3 leads de test assignés à sabbg.du73100@gmail.com (place_id: test-fake-sabbg-001 à 003).';
END $$;
