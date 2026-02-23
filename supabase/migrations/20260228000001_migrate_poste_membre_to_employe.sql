-- Migration : remplacer poste 'Membre' par 'Employé' dans employees
UPDATE public.employees SET poste = 'Employé', updated_at = now() WHERE poste = 'Membre';
