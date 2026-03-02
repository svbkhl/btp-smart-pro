-- Fix dept_code : leads générés via job "01" mais tagués avec depts voisins → remettre en "01"
UPDATE leads
SET dept_code = '01'
WHERE dept_code IN ('69', '38', '74', '73', '71', '42', '39', '25')
  AND created_at >= NOW() - INTERVAL '2 days'
  AND owner_id IS NULL;
