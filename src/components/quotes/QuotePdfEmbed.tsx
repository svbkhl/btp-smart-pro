import { useEffect, useState } from "react";
import type { Quote } from "@/hooks/useQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useUserSettings } from "@/hooks/useUserSettings";
import { buildQuotePdfDownloadParams } from "@/utils/buildQuotePdfDownloadParams";
import { getQuotePdfBlob } from "@/services/pdfService";
import { Loader2 } from "lucide-react";

interface QuotePdfEmbedProps {
  quote: Quote;
}

/**
 * Aperçu PDF inline (iframe) — même rendu que le bouton PDF / téléchargement.
 */
export function QuotePdfEmbed({ quote }: QuotePdfEmbedProps) {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
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
        const params = await buildQuotePdfDownloadParams(quote, {
          user,
          companyId,
          companyInfo,
        });
        const blob = await getQuotePdfBlob(params);
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
  }, [
    quote.id,
    quote.updated_at,
    companyInfo?.company_name,
    companyInfo?.invoice_template_version,
    user?.id,
    companyId,
  ]);

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
      title={`Aperçu ${quote.quote_number ?? "devis"}`}
      src={`${url}#toolbar=1`}
      className="h-[min(75vh,900px)] w-full rounded-lg border border-border bg-muted/30"
    />
  );
}
