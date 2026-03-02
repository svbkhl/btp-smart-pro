-- Recoller dept_code sur le vrai département issu de l'adresse (code postal).
-- Chaque département n'a que les entreprises dont l'adresse est dans ce département.

WITH cp AS (
  SELECT id, (regexp_match(address, '\m(\d{5})\M'))[1] AS code_postal
  FROM leads
  WHERE address IS NOT NULL AND trim(address) <> ''
),
dept_real AS (
  SELECT id,
    CASE
      WHEN code_postal IS NULL THEN NULL
      WHEN code_postal ~ '^20[01]' THEN '2A'
      WHEN code_postal ~ '^20[2-6]' THEN '2B'
      WHEN code_postal ~ '^97|^98' THEN NULL
      ELSE substring(code_postal, 1, 2)
    END AS new_dept
  FROM cp
)
UPDATE leads l
SET dept_code = d.new_dept
FROM dept_real d
WHERE l.id = d.id AND d.new_dept IS NOT NULL;
