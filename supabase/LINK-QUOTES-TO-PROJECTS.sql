-- =====================================================
-- LIER LES DEVIS AUX PROJETS ET AJOUTER LES COÛTS
-- =====================================================
-- Ce script ajoute la liaison entre devis et projets
-- et permet de calculer les bénéfices
-- =====================================================

-- 1. Ajouter project_id à ai_quotes si elle n'existe pas
ALTER TABLE public.ai_quotes
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Ajouter costs (coûts réels) aux projets si elle n'existe pas
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS costs NUMERIC DEFAULT 0;

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_quotes_project_id ON public.ai_quotes(project_id) WHERE project_id IS NOT NULL;

-- 4. Créer une fonction pour calculer le CA total depuis les devis liés aux projets terminés
CREATE OR REPLACE FUNCTION public.calculate_total_revenue(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_revenue NUMERIC := 0;
BEGIN
  -- Calculer le CA total depuis les devis liés aux projets terminés
  SELECT COALESCE(SUM(
    CASE 
      -- Si le devis a un estimated_cost, utiliser celui-ci
      WHEN aq.estimated_cost IS NOT NULL THEN aq.estimated_cost
      -- Sinon, essayer d'extraire depuis details
      WHEN aq.details::text LIKE '%estimatedCost%' THEN 
        (aq.details->>'estimatedCost')::NUMERIC
      ELSE 0
    END
  ), 0)
  INTO total_revenue
  FROM public.ai_quotes aq
  INNER JOIN public.projects p ON p.id = aq.project_id
  WHERE p.user_id = p_user_id
    AND p.status = 'terminé'
    AND aq.status IN ('signed', 'accepted', 'sent');
  
  RETURN total_revenue;
END;
$$;

-- 5. Créer une fonction pour calculer le bénéfice total
CREATE OR REPLACE FUNCTION public.calculate_total_profit(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_revenue NUMERIC := 0;
  total_costs NUMERIC := 0;
  total_profit NUMERIC := 0;
BEGIN
  -- Calculer le CA total
  SELECT public.calculate_total_revenue(p_user_id) INTO total_revenue;
  
  -- Calculer les coûts totaux des projets terminés
  SELECT COALESCE(SUM(COALESCE(p.costs, 0)), 0)
  INTO total_costs
  FROM public.projects p
  WHERE p.user_id = p_user_id
    AND p.status = 'terminé';
  
  -- Bénéfice = CA - Coûts
  total_profit := total_revenue - total_costs;
  
  RETURN total_profit;
END;
$$;

-- 6. Ajouter total_profit à user_stats si elle n'existe pas
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS total_profit NUMERIC DEFAULT 0;

-- 7. Créer un trigger pour mettre à jour automatiquement les stats quand un projet change de statut
CREATE OR REPLACE FUNCTION public.update_stats_on_project_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le projet passe à "terminé", recalculer les stats
  IF NEW.status = 'terminé' AND (OLD.status IS NULL OR OLD.status != 'terminé') THEN
    -- Mettre à jour les stats via une fonction asynchrone (ou appeler l'Edge Function)
    -- Pour l'instant, on laisse le frontend gérer via useRecalculateStats
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stats_on_project_status ON public.projects;
CREATE TRIGGER trigger_update_stats_on_project_status
AFTER UPDATE OF status ON public.projects
FOR EACH ROW
WHEN (NEW.status = 'terminé' AND (OLD.status IS NULL OR OLD.status != 'terminé'))
EXECUTE FUNCTION public.update_stats_on_project_status_change();

-- 8. Commentaires pour documentation
COMMENT ON COLUMN public.ai_quotes.project_id IS 'Lien vers le projet associé à ce devis';
COMMENT ON COLUMN public.projects.costs IS 'Coûts réels engagés pour ce projet (pour calculer les bénéfices)';
COMMENT ON COLUMN public.user_stats.total_profit IS 'Bénéfice total (CA - Coûts)';

SELECT '✅ Script LINK-QUOTES-TO-PROJECTS.sql exécuté avec succès.' AS status;

