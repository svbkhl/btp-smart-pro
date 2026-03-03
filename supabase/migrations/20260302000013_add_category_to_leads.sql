-- Ajoute la colonne category à la table leads pour filtrer par métier
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category TEXT;

-- Index pour les filtres par catégorie
CREATE INDEX IF NOT EXISTS idx_leads_category ON public.leads(category);
