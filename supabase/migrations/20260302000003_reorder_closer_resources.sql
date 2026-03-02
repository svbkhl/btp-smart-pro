-- Remettre Fiche Produit en premier, puis Script R1, Script R2, Process
UPDATE public.closer_resources SET sort_order = 0 WHERE category = 'fiche_produit';
UPDATE public.closer_resources SET sort_order = 1 WHERE category = 'script_r1';
UPDATE public.closer_resources SET sort_order = 2 WHERE category = 'script_r2';
UPDATE public.closer_resources SET sort_order = 3 WHERE category = 'process';
UPDATE public.closer_resources SET sort_order = 4 WHERE category = 'autre';
