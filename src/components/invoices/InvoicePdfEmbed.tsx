import { useEffect, useState } from "react";
import type { Invoice } from "@/hooks/useInvoices";
import { useUserSettings } from "@/hooks/useUserSettings";
import { generateInvoicePDFAsBase64 } from "@/services/invoicePdfService";
import { Loader2 } from "lucide-react";

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

interface InvoicePdfEmbedProps {
  invoice: Invoice;
}

/**
 * Aperçu PDF inline (iframe) — même rendu que le téléchargement.
 */
export function InvoicePdfEmbed({ invoice }: InvoicePdfEmbedProps) {
  const { data: companyInfo } = useUserSettings();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      try {
        const b64 = await generateInvoicePDFAsBase64({
          invoice,
          companyInfo: companyInfo || undefined,
        });
        const blob = base64ToBlob(b64, "application/pdf");
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible de générer le PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice.id, companyInfo?.company_name, companyInfo?.invoice_template_version]);

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

  if (!url) {
    return null;
  }

  return (
    <iframe
      title={`Aperçu ${invoice.invoice_number}`}
      src={`${url}#toolbar=1`}
      className="h-[min(75vh,900px)] w-full rounded-lg border border-border bg-muted/30"
    />
  );
}
