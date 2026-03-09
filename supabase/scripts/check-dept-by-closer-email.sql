-- Département(s) assignés à un closer (remplace l'email ci-dessous)
SELECT l.dept_code, COUNT(*) AS nb_leads
FROM public.leads l
JOIN auth.users u ON u.id = l.owner_id
WHERE LOWER(u.email) = LOWER('epanouissementfeminin@gmail.com')
GROUP BY l.dept_code
ORDER BY l.dept_code;
