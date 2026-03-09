-- ============================================================
-- MIGRATIONS MANQUANTES — 20260307000002 + 20260309000001
-- ============================================================

-- ── Migration 20260307000002 ─────────────────────────────────
UPDATE public.closer_resources
SET content = replace(
  content,
  E'| Impayés qui s''accumulent | Relances automatiques par email |\n| Planning manuel sur papier |',
  E'| Impayés qui s''accumulent | Relances automatiques par email |\n| Devis oubliés ou non signés | Devis récupérés grâce à la relance automatique |\n| Planning manuel sur papier |'
),
updated_at = now()
WHERE category = 'fiche_produit'
  AND content LIKE '%Impayés qui s''accumulent%'
  AND content NOT LIKE '%Devis récupérés grâce à la relance%';

-- ── Migration 20260309000001 ─────────────────────────────────

-- 1. Colonne source
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps';
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- 2. RPC upsert_linkedin_lead
CREATE OR REPLACE FUNCTION public.upsert_linkedin_lead(
  p_name         TEXT,
  p_address      TEXT    DEFAULT NULL,
  p_phone        TEXT    DEFAULT NULL,
  p_website      TEXT    DEFAULT NULL,
  p_linkedin_url TEXT    DEFAULT NULL,
  p_dept_code    TEXT    DEFAULT NULL,
  p_category     TEXT    DEFAULT 'Artisan BTP',
  p_cherche_assistante BOOLEAN DEFAULT false
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_place_id TEXT;
  v_category TEXT;
  v_dept     TEXT;
BEGIN
  IF p_dept_code IS NOT NULL AND p_dept_code != '' THEN
    v_dept := p_dept_code;
  ELSE
    DECLARE m TEXT;
    BEGIN
      m := substring(p_address FROM '\b(\d{5})\b');
      IF m IS NOT NULL THEN
        IF m ~ '^200|^201' THEN v_dept := '2A';
        ELSIF m ~ '^202|^206' THEN v_dept := '2B';
        ELSE v_dept := left(m, 2);
        END IF;
      ELSE
        v_dept := '00';
      END IF;
    END;
  END IF;

  v_place_id := 'li_'
    || lower(regexp_replace(unaccent(coalesce(p_name, 'unknown')), '[^a-z0-9]+', '_', 'g'))
    || '_' || v_dept;

  IF p_cherche_assistante THEN
    v_category := 'Cherche Assistante';
  ELSE
    v_category := coalesce(nullif(trim(p_category), ''), 'Artisan BTP');
  END IF;

  INSERT INTO public.leads (
    place_id, name, address, phone_mobile, website, maps_url,
    dept_code, job_dept, category, source, status, priority, size_bucket
  ) VALUES (
    v_place_id,
    coalesce(p_name, 'Inconnu'),
    p_address,
    CASE WHEN p_phone ~ '^0[67]' THEN p_phone ELSE NULL END,
    p_website,
    p_linkedin_url,
    v_dept,
    v_dept,
    v_category,
    'linkedin',
    'NEW',
    'A',
    '0-3'
  )
  ON CONFLICT (place_id) DO UPDATE SET
    category   = EXCLUDED.category,
    website    = coalesce(EXCLUDED.website, leads.website),
    maps_url   = coalesce(EXCLUDED.maps_url, leads.maps_url),
    updated_at = NOW();

  RETURN v_place_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_linkedin_lead TO authenticated;

-- ── Enregistrer dans schema_migrations ───────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260307000002', '20260307000002_fiche_produit_devis_relance', ARRAY['UPDATE public.closer_resources SET content = content, updated_at = now() WHERE category = ''fiche_produit''']),
  ('20260309000001', '20260309000001_linkedin_leads', ARRAY['ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT ''google_maps'''])
ON CONFLICT (version) DO NOTHING;
