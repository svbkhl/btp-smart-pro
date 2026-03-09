-- ============================================================
-- LEADS LINKEDIN — source + catégorie "Cherche Assistante"
-- ============================================================

-- 1. Colonne source pour distinguer Google Maps vs LinkedIn
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps';
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- 2. RPC upsert d'un lead LinkedIn (dédup via place_id généré)
--    place_id = "li_<slug_nom>_<dept_code>" → unicité garantie
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
  -- Département : depuis l'adresse si non fourni
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

  -- place_id unique pour LinkedIn
  v_place_id := 'li_'
    || lower(regexp_replace(unaccent(coalesce(p_name, 'unknown')), '[^a-z0-9]+', '_', 'g'))
    || '_' || v_dept;

  -- Catégorie finale
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
    p_linkedin_url,   -- on stocke l'URL LinkedIn dans maps_url
    v_dept,
    v_dept,
    v_category,
    'linkedin',
    'NEW',
    'A',              -- priorité A car lead chaud
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
