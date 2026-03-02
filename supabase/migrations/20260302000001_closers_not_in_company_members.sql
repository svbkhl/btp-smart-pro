-- Les closers ne doivent jamais apparaître comme membres des entreprises qu'ils créent.
-- 1. Nettoyer les données existantes
-- 2. Ajouter un trigger qui empêche les futurs ajouts

-- ─── 1. Suppression des closers de company_users ───────────────────────────
DELETE FROM public.company_users cu
WHERE EXISTS (
  SELECT 1 FROM public.closer_emails ce
  WHERE LOWER(ce.email) = (
    SELECT LOWER(u.email) FROM auth.users u WHERE u.id = cu.user_id LIMIT 1
  )
);

-- ─── 2. Suppression des closers de employees ───────────────────────────────
DELETE FROM public.employees e
WHERE EXISTS (
  SELECT 1 FROM public.closer_emails ce
  WHERE LOWER(ce.email) = LOWER(e.email)
);

-- ─── 3. Trigger : bloquer l'insertion de closers dans company_users ─────────
CREATE OR REPLACE FUNCTION public.prevent_closer_in_company_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le user_id correspond à un closer, on annule l'INSERT silencieusement
  IF EXISTS (
    SELECT 1
    FROM public.closer_emails ce
    JOIN auth.users u ON LOWER(u.email) = LOWER(ce.email)
    WHERE u.id = NEW.user_id
  ) THEN
    RETURN NULL; -- annule l'INSERT sans erreur
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_closer_in_company_users ON public.company_users;
CREATE TRIGGER trigger_prevent_closer_in_company_users
  BEFORE INSERT ON public.company_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closer_in_company_users();

-- ─── 4. Trigger : bloquer l'insertion de closers dans employees ─────────────
CREATE OR REPLACE FUNCTION public.prevent_closer_in_employees()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.closer_emails ce
    WHERE LOWER(ce.email) = LOWER(NEW.email)
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_closer_in_employees ON public.employees;
CREATE TRIGGER trigger_prevent_closer_in_employees
  BEFORE INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closer_in_employees();
