-- Corriger les listes déjà générées : un lead = un département (celui de l'adresse).
-- On aligne job_dept sur dept_code pour que partout (assignation, stats, closer) 
-- chaque lead n'apparaisse que dans le département correspondant à son adresse.

UPDATE public.leads
SET job_dept = dept_code
WHERE job_dept IS DISTINCT FROM dept_code;
