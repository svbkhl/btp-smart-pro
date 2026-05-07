import { supabase } from "@/integrations/supabase/client";
import type { Quote } from "@/hooks/useQuotes";
import type { User } from "@supabase/supabase-js";
import type { UserSettings } from "@/hooks/useUserSettings";
import type { DownloadQuotePDFParams } from "@/services/pdfService";

/**
 * Construit les paramètres pour downloadQuotePDF / aperçu PDF (même logique que QuoteActionButtons).
 */
export async function buildQuotePdfDownloadParams(
  quote: Quote,
  ctx: { user: User | null | undefined; companyId: string | null | undefined; companyInfo: UserSettings | undefined }
): Promise<DownloadQuotePDFParams> {
  const { user, companyId, companyInfo } = ctx;

  const quoteMode = quote.mode || (quote.details?.format === "simplified" ? "simple" : "detailed");
  const tvaRateRaw = quote.tva_non_applicable_293b ? 0 : (quote.tva_rate ?? 0.2);
  const tva293b = quote.tva_non_applicable_293b || false;
  const effectiveTvaRate = tva293b ? 0 : tvaRateRaw;

  let pdfSections: DownloadQuotePDFParams["sections"];
  let pdfLines: DownloadQuotePDFParams["lines"];

  if (quoteMode === "detailed" && quote.id && user && companyId) {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("quote_sections")
        .select("*")
        .eq("quote_id", quote.id)
        .eq("company_id", companyId)
        .order("position", { ascending: true });

      if (!sectionsError && sectionsData) {
        pdfSections = sectionsData.map((section) => ({
          id: section.id,
          title: section.title,
          position: section.position,
        }));
      }

      const { data: linesData, error: linesError } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quote.id)
        .eq("company_id", companyId)
        .order("section_id", { ascending: true, nullsFirst: false })
        .order("position", { ascending: true });

      if (!linesError && linesData) {
        pdfLines = linesData.map((line) => ({
          label: line.label,
          description: line.description,
          unit: line.unit || "",
          quantity: line.quantity || 0,
          unit_price_ht: line.unit_price_ht || 0,
          total_ht: line.total_ht || 0,
          tva_rate: effectiveTvaRate,
          total_tva: line.total_tva || 0,
          total_ttc: line.total_ttc || 0,
          section_id: line.section_id,
        }));
      }
    } catch {
      /* lignes optionnelles */
    }
  }

  return {
    result: quote.details || {},
    companyInfo: companyInfo || {},
    clientInfo: {
      name: quote.client_name,
      email: quote.client_email,
      phone: quote.client_phone,
      location: quote.client_address,
    },
    surface: "",
    workType: "",
    quoteDate: new Date(quote.created_at),
    quoteNumber: quote.quote_number,
    mode: quoteMode as "simple" | "detailed",
    tvaRate: effectiveTvaRate,
    tva293b,
    sections: pdfSections,
    lines: pdfLines,
    subtotal_ht: quote.subtotal_ht,
    total_tva: quote.total_tva,
    total_ttc: quote.total_ttc || quote.estimated_cost,
    signatureData: companyInfo?.signature_data,
    signedBy: companyInfo?.signature_name || companyInfo?.company_name,
    signedAt: new Date().toISOString(),
  };
}
