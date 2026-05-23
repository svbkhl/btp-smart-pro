-- Trigger: notifier quand un devis est signé (ai_quotes.signed_at change)
CREATE OR REPLACE TRIGGER trigger_notify_quote_signed
  AFTER UPDATE ON public.ai_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_quote_signed();

-- Trigger: notifier quand une facture est signée (invoices.status → 'signed')
CREATE OR REPLACE TRIGGER trigger_notify_invoice_signed
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_signed();
