-- ============================================================
-- Suppression de tous les leads générés pour le département 01
-- (dept_code incorrect car l'ancien générateur utilisait le dept du JOB
--  au lieu du vrai département de l'adresse)
-- ============================================================

-- 1. Supprimer les leads (assignés ou non) du département 01
DELETE FROM public.leads
WHERE dept_code = '01';

-- 2. Supprimer aussi les leads_fixed du département 01
DELETE FROM public.leads_fixed
WHERE dept_code = '01';

-- 3. Remettre le job 01 en FAILED pour pouvoir le relancer proprement
UPDATE public.lead_jobs
SET
  status         = 'FAILED',
  processed_cells = 0,
  total_cells    = 0,
  total_found    = 0,
  total_inserted = 0,
  total_skipped  = 0,
  progress_cursor = '{}',
  error_log      = 'Reset manuel — leads supprimés pour recalcul des vrais dept_code',
  finished_at    = NULL
WHERE dept_code = '01';

-- Vérification
SELECT 'leads supprimés' AS info, COUNT(*) FROM public.leads WHERE dept_code = '01'
UNION ALL
SELECT 'leads_fixed supprimés', COUNT(*) FROM public.leads_fixed WHERE dept_code = '01'
UNION ALL
SELECT 'jobs 01 réinitialisés', COUNT(*) FROM public.lead_jobs WHERE dept_code = '01' AND status = 'FAILED';
