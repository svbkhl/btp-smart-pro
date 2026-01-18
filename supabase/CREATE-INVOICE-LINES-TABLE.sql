-- =====================================================
-- TABLE INVOICE_LINES (Lignes détaillées des factures)
-- =====================================================
-- Stocke les lignes de prestation détaillées pour chaque facture
-- Similaire à quote_lines pour les devis
-- =====================================================

-- Créer la table invoice_lines si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20 CHECK (tva_rate >= 0 AND tva_rate <= 1),
  total_tva NUMERIC(12,2) DEFAULT 0,
  total_ttc NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_company_id ON public.invoice_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_position ON public.invoice_lines(invoice_id, position);

-- Activer RLS
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour invoice_lines
DROP POLICY IF EXISTS "Users can view invoice lines of their invoices" ON public.invoice_lines;
CREATE POLICY "Users can view invoice lines of their invoices"
  ON public.invoice_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_lines.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert invoice lines for their invoices" ON public.invoice_lines;
CREATE POLICY "Users can insert invoice lines for their invoices"
  ON public.invoice_lines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_lines.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update invoice lines of their invoices" ON public.invoice_lines;
CREATE POLICY "Users can update invoice lines of their invoices"
  ON public.invoice_lines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_lines.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete invoice lines of their invoices" ON public.invoice_lines;
CREATE POLICY "Users can delete invoice lines of their invoices"
  ON public.invoice_lines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_lines.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Commentaires pour documentation
COMMENT ON TABLE public.invoice_lines IS 'Lignes détaillées de prestation pour les factures';
COMMENT ON COLUMN public.invoice_lines.position IS 'Ordre d''affichage des lignes dans la facture';
COMMENT ON COLUMN public.invoice_lines.label IS 'Nom/libellé de la prestation';
COMMENT ON COLUMN public.invoice_lines.unit_price_ht IS 'Prix unitaire HT';
COMMENT ON COLUMN public.invoice_lines.total_ht IS 'Total ligne HT (quantity * unit_price_ht)';
