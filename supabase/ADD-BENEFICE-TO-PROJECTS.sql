-- =====================================================
-- AJOUTER LE CHAMP BÉNÉFICE AUX PROJETS
-- =====================================================
-- Ce script ajoute le champ benefice calculé aux projets terminés
-- =====================================================

-- 1. Ajouter le champ benefice aux projets si elle n'existe pas
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS benefice NUMERIC;

-- 2. Créer une fonction pour calculer le bénéfice d'un projet
CREATE OR REPLACE FUNCTION public.calculate_project_profit(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_revenue NUMERIC := 0;
  project_costs NUMERIC := 0;
  project_profit NUMERIC := 0;
BEGIN
  -- Récupérer les coûts du projet
  SELECT COALESCE(costs, 0) INTO project_costs
  FROM public.projects
  WHERE id = p_project_id;
  
  -- Calculer le CA depuis les devis liés au projet
  SELECT COALESCE(SUM(
    CASE 
      -- Si le devis a un estimated_cost, utiliser celui-ci (avec TVA 20%)
      WHEN aq.estimated_cost IS NOT NULL THEN aq.estimated_cost * 1.20
      -- Sinon, essayer d'extraire depuis details
      WHEN aq.details::text LIKE '%estimatedCost%' THEN 
        ((aq.details->>'estimatedCost')::NUMERIC) * 1.20
      ELSE 0
    END
  ), 0)
  INTO project_revenue
  FROM public.ai_quotes aq
  WHERE aq.project_id = p_project_id
    AND aq.status IN ('signed', 'accepted', 'sent');
  
  -- Si aucun devis lié, utiliser le budget comme fallback
  IF project_revenue = 0 THEN
    SELECT COALESCE(budget, 0) INTO project_revenue
    FROM public.projects
    WHERE id = p_project_id;
  END IF;
  
  -- Bénéfice = CA - Coûts
  project_profit := project_revenue - project_costs;
  
  RETURN project_profit;
END;
$$;

-- 3. Créer un trigger pour calculer automatiquement le bénéfice quand un projet est terminé
CREATE OR REPLACE FUNCTION public.update_project_profit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le projet passe à "terminé", calculer le bénéfice
  IF NEW.status = 'terminé' THEN
    NEW.benefice := public.calculate_project_profit(NEW.id);
  ELSE
    -- Si le projet n'est plus terminé, remettre le bénéfice à NULL
    NEW.benefice := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_project_profit ON public.projects;
CREATE TRIGGER trigger_update_project_profit
BEFORE INSERT OR UPDATE OF status, costs, budget ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_project_profit();

-- 4. Mettre à jour les projets déjà terminés avec leur bénéfice
UPDATE public.projects
SET benefice = public.calculate_project_profit(id)
WHERE status = 'terminé' AND benefice IS NULL;

-- 5. Commentaire pour documentation
COMMENT ON COLUMN public.projects.benefice IS 'Bénéfice calculé pour les projets terminés (CA TTC - Coûts réels)';

SELECT '✅ Script ADD-BENEFICE-TO-PROJECTS.sql exécuté avec succès.' AS status;


