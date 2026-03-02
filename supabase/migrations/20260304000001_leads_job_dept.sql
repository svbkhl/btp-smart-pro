-- job_dept = département du job de génération (pour assignation).
-- Permet d'assigner tous les leads d'un job (ex: 01 → 7395) même si l'adresse est en 74/69/38.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS job_dept TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_job_dept ON public.leads(job_dept);

-- Backfill: existants sans job_dept = dept_code (comportement actuel)
UPDATE public.leads SET job_dept = dept_code WHERE job_dept IS NULL;

-- Leads "égarés" (adresse en 74/69/38 mais générés par le job 01) → assignables au 01
UPDATE public.leads
SET job_dept = '01'
WHERE job_dept IN ('74', '69', '38', '73', '71', '42', '39', '25')
  AND owner_id IS NULL;
