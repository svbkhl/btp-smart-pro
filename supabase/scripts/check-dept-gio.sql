-- Département(s) assignés à Gio (comptes dont l'email contient "gio")
SELECT u.email, l.dept_code, COUNT(*) AS nb_leads
FROM public.leads l
JOIN auth.users u ON u.id = l.owner_id
WHERE LOWER(u.email) LIKE '%gio%'
GROUP BY u.email, l.dept_code
ORDER BY u.email, l.dept_code;
