import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { generateQuotePDFBase64 } from "@/services/pdfService";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useQuoteLines } from "@/hooks/useQuoteLines";
import { useQuoteSections } from "@/hooks/useQuoteSections";
import { useClients } from "@/hooks/useClients";

interface QuotePdfEmbedProps {
  quote: any;
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function QuotePdfEmbed({ quote }: QuotePdfEmbedProps) {
  const { data: userSettings } = useUserSettings();
  const { data: lines = [] } = useQuoteLines(quote.id);
  const { data: sections = [] } = useQuoteSections(quote.id);
  const { data: clients = [] } = useClients();

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ready = userSettings !== undefined;

  useEffect(() => {
    if (!ready) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });

      try {
        const tvaRate = quote.tva_rate ?? 0.20;
        const tva293b = quote.tva_non_applicable_293b ?? false;
        const effectiveTvaRate = tva293b ? 0 : tvaRate;

        const clientRecord = clients.find((c: any) => c.id === quote.client_id);
        const pdfLines = lines.map((l: any) => ({
          label: l.label,
          description: l.description,
          unit: l.unit || "",
          quantity: l.quantity || 0,
          unit_price_ht: l.unit_price_ht || 0,
          total_ht: l.total_ht,
          tva_rate: effectiveTvaRate,
          total_tva: tva293b ? 0 : l.total_ht * effectiveTvaRate,
          total_ttc: tva293b ? l.total_ht : l.total_ht * (1 + effectiveTvaRate),
          section_id: l.section_id,
        }));
        const pdfSections = sections.map((s: any) => ({ id: s.id, title: s.title, position: s.position }));
        const subtotal_ht = quote.subtotal_ht ?? quote.estimated_cost ?? 0;
        const total_ttc = quote.total_ttc ?? (subtotal_ht * (1 + effectiveTvaRate));

        const companyInfo = {
          company_id: userSettings?.company_id || "",
          companyName: userSettings?.company_name || "",
          company_name: userSettings?.company_name || "",
          address: userSettings?.address || "",
          city: userSettings?.city || "",
          postalCode: userSettings?.postal_code || "",
          postal_code: userSettings?.postal_code || "",
          phone: userSettings?.phone || "",
          email: userSettings?.email || "",
          siret: userSettings?.siret || "",
          vatNumber: userSettings?.vat_number || "",
          vat_number: userSettings?.vat_number || "",
          logoUrl: userSettings?.company_logo_url || "",
          company_logo_url: userSettings?.company_logo_url || "",
          signature_name: userSettings?.signature_name || "",
          terms_and_conditions: userSettings?.terms_and_conditions || "",
          legal_form: userSettings?.legal_form || "",
          ape_code: userSettings?.ape_code || "",
          invoice_template_version: userSettings?.invoice_template_version || "",
        };

        const { base64 } = await generateQuotePDFBase64({
          result: { estimatedCost: total_ttc, quote_number: quote.quote_number },
          companyInfo,
          clientInfo: {
            name: quote.client_name || clientRecord?.name || "",
            civility: clientRecord?.titre || undefined,
            firstName: (clientRecord as any)?.prenom || undefined,
            email: quote.client_email || clientRecord?.email || undefined,
            phone: quote.client_phone || clientRecord?.phone || undefined,
            location: quote.client_address || clientRecord?.location || undefined,
          },
          quoteDate: quote.created_at ? new Date(quote.created_at) : new Date(),
          quoteNumber: quote.quote_number,
          mode: lines.length > 0 ? "detailed" : "simple",
          tvaRate: effectiveTvaRate,
          tva293b,
          sections: pdfSections,
          lines: pdfLines,
          subtotal_ht,
          total_tva: tva293b ? 0 : (quote.total_tva ?? subtotal_ht * effectiveTvaRate),
          total_ttc,
          signatureData: quote.signature_data || undefined,
          signedBy: quote.signed_by || undefined,
          signedAt: quote.signed_at || undefined,
        });

        const blob = base64ToBlob(base64, "application/pdf");
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Impossible de générer l'aperçu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [quote.id, ready, lines.length, sections.length]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Génération de l&apos;aperçu PDF…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!url) return null;

  return (
    <iframe
      title={`Aperçu ${quote.quote_number}`}
      src={`${url}#toolbar=1`}
      className="h-[min(75vh,900px)] w-full rounded-lg border border-border bg-muted/30"
    />
  );
}
