-- Paramètres d'envoi automatique du planning par email (niveau entreprise)
-- Le patron choisit si/quand envoyer le planning de la semaine prochaine aux employés

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_planning_email_settings'
  ) THEN
    CREATE TABLE public.company_planning_email_settings (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT false,
      send_day INTEGER NOT NULL DEFAULT 5 CHECK (send_day >= 0 AND send_day <= 6),
      send_hour INTEGER NOT NULL DEFAULT 18 CHECK (send_hour >= 0 AND send_hour <= 23),
      send_minute INTEGER NOT NULL DEFAULT 0 CHECK (send_minute >= 0 AND send_minute <= 59),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE INDEX idx_company_planning_email_company ON public.company_planning_email_settings(company_id);
    CREATE INDEX idx_company_planning_email_enabled ON public.company_planning_email_settings(enabled) WHERE enabled = true;
    
    ALTER TABLE public.company_planning_email_settings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Owners can manage planning email settings"
      ON public.company_planning_email_settings FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.company_users cu
          LEFT JOIN public.roles r ON r.id = cu.role_id
          WHERE cu.company_id = company_planning_email_settings.company_id
            AND cu.user_id = auth.uid()
            AND (cu.role IN ('owner', 'admin') OR r.slug IN ('owner', 'admin'))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.company_users cu
          LEFT JOIN public.roles r ON r.id = cu.role_id
          WHERE cu.company_id = company_planning_email_settings.company_id
            AND cu.user_id = auth.uid()
            AND (cu.role IN ('owner', 'admin') OR r.slug IN ('owner', 'admin'))
        )
      );
    
    COMMENT ON TABLE public.company_planning_email_settings IS 'Paramètres d''envoi automatique du planning par email (0=dim, 1=lun, ..., 5=ven, 6=sam)';
  END IF;
END $$;
