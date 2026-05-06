import type { Invoice } from "@/hooks/useInvoices";
import type { UserSettings } from "@/hooks/useUserSettings";
import { formatClientBlock, clientRowToBlockInput } from "@/utils/formatClientBlock";
import { resolveVatLegalMention } from "@/utils/vatRegime";
import { PDF_COLORS_HEX, HTML_PAGE_PX, HTML_FONT_SIZE_PX } from "@/services/pdf/pdfTokens";

interface InvoicePreviewProps {
  invoice: Invoice;
  companyInfo?: UserSettings;
  clientRow?: { name?: string | null; titre?: string | null; prenom?: string | null; phone?: string | null; location?: string | null };
  mode?: "facture" | "devis";
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return "0,00 €";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(num);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/**
 * Aperçu HTML/CSS du document en mode "Éditorial v2".
 * Mêmes tokens que `renderInvoiceEditorial` (jsPDF) → cohérence pixel-near.
 */
export function InvoicePreview({ invoice, companyInfo, clientRow, mode = "facture" }: InvoicePreviewProps) {
  const accent = companyInfo?.brand_color || PDF_COLORS_HEX.defaultAccent;
  const clientLines = formatClientBlock(
    clientRowToBlockInput({
      name: clientRow?.name ?? invoice.client_name ?? null,
      titre: clientRow?.titre ?? null,
      prenom: clientRow?.prenom ?? null,
    })
  );
  const mention = invoice.vat_legal_mention ?? resolveVatLegalMention(invoice.vat_regime ?? null);
  const totalHt = invoice.total_ht ?? invoice.amount_ht ?? 0;
  const tva = invoice.tva ?? invoice.vat_amount ?? 0;
  const totalTtc = invoice.total_ttc ?? invoice.amount_ttc ?? invoice.amount ?? totalHt;
  const hasVat = (tva ?? 0) > 0;
  const vatPercent = invoice.vat_rate_snapshot != null
    ? Math.round(invoice.vat_rate_snapshot * 1000) / 10
    : invoice.vat_rate ?? (totalHt > 0 ? Math.round((tva / totalHt) * 1000) / 10 : 0);

  const lines = invoice.service_lines ?? [];

  return (
    <div
      className="mx-auto bg-white shadow-sm"
      style={{
        width: HTML_PAGE_PX.width,
        minHeight: HTML_PAGE_PX.height,
        padding: `${HTML_PAGE_PX.marginY}px ${HTML_PAGE_PX.marginX}px`,
        color: PDF_COLORS_HEX.ink,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* HEADER */}
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          {companyInfo?.company_logo_url ? (
            <img
              src={companyInfo.company_logo_url}
              alt={companyInfo.company_name || "Logo"}
              style={{ maxHeight: 40, maxWidth: 160, objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: HTML_FONT_SIZE_PX.lg, fontWeight: 600 }}>
              {companyInfo?.company_name || "Votre Entreprise"}
            </span>
          )}
          {companyInfo?.company_logo_url && companyInfo?.company_name && (
            <span style={{ fontSize: HTML_FONT_SIZE_PX.sm, color: PDF_COLORS_HEX.muted, marginTop: 4 }}>
              {companyInfo.company_name}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: HTML_FONT_SIZE_PX.xs,
            letterSpacing: "0.18em",
            fontWeight: 600,
            color: PDF_COLORS_HEX.label,
            textTransform: "uppercase",
          }}
        >
          {mode === "devis" ? "Devis" : "Facture"}
        </div>
      </header>

      <hr style={{ marginTop: 24, marginBottom: 24, border: 0, borderTop: `1px solid ${PDF_COLORS_HEX.line}` }} />

      {/* PARTIES */}
      <section className="grid grid-cols-2 gap-10">
        <div>
          <div style={{ fontSize: HTML_FONT_SIZE_PX.xs, letterSpacing: "0.14em", fontWeight: 600, color: PDF_COLORS_HEX.label, textTransform: "uppercase", marginBottom: 6 }}>
            Émetteur
          </div>
          <div style={{ fontSize: HTML_FONT_SIZE_PX.base, fontWeight: 600 }}>
            {companyInfo?.company_name || "—"}
          </div>
          <div style={{ fontSize: HTML_FONT_SIZE_PX.sm, lineHeight: 1.5, marginTop: 4 }}>
            {companyInfo?.address && <div>{companyInfo.address}</div>}
            {(companyInfo?.postal_code || companyInfo?.city) && (
              <div>
                {[companyInfo?.postal_code, companyInfo?.city].filter(Boolean).join(" ")}
              </div>
            )}
            {companyInfo?.siret && <div>SIRET {companyInfo.siret}</div>}
            {companyInfo?.phone && <div>{companyInfo.phone}</div>}
            {companyInfo?.email && <div>{companyInfo.email}</div>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: HTML_FONT_SIZE_PX.xs, letterSpacing: "0.14em", fontWeight: 600, color: PDF_COLORS_HEX.label, textTransform: "uppercase", marginBottom: 6 }}>
            Destinataire
          </div>
          {clientLines[0] && (
            <div style={{ fontSize: HTML_FONT_SIZE_PX.base, fontWeight: 600 }}>{clientLines[0]}</div>
          )}
          <div style={{ fontSize: HTML_FONT_SIZE_PX.sm, lineHeight: 1.5, marginTop: 4 }}>
            {clientLines[1] && <div>{clientLines[1]}</div>}
            {(invoice.client_address || clientRow?.location) && (
              <div>{invoice.client_address || clientRow?.location}</div>
            )}
            {clientRow?.phone && <div>{clientRow.phone}</div>}
            {invoice.client_email && <div>{invoice.client_email}</div>}
          </div>
        </div>
      </section>

      <hr style={{ marginTop: 28, marginBottom: 24, border: 0, borderTop: `1px solid ${PDF_COLORS_HEX.line}` }} />

      {/* META */}
      <div>
        <div style={{ fontSize: HTML_FONT_SIZE_PX.lg, fontWeight: 600, color: accent }}>
          N° {invoice.invoice_number || "—"}
        </div>
        <div style={{ fontSize: HTML_FONT_SIZE_PX.sm, color: PDF_COLORS_HEX.muted, marginTop: 4 }}>
          {mode === "devis" ? "Émis le " : "Émise le "}
          {formatDate(invoice.created_at)}
          {invoice.due_date && (
            <>
              {" · "}Échéance {formatDate(invoice.due_date)}
            </>
          )}
          {invoice.service_date && mode === "facture" && (
            <>
              {" · "}Prestation le {formatDate(invoice.service_date)}
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full" style={{ marginTop: 24, borderCollapse: "collapse", fontSize: HTML_FONT_SIZE_PX.sm }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${PDF_COLORS_HEX.line}`, color: PDF_COLORS_HEX.label, fontSize: HTML_FONT_SIZE_PX.xs, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 600 }}>Désignation</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, width: 60 }}>Qté</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, width: 110 }}>PU HT</th>
            <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, width: 110 }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: 16, textAlign: "center", color: PDF_COLORS_HEX.muted, fontStyle: "italic" }}>
                Aucune prestation détaillée
              </td>
            </tr>
          ) : (
            lines.map((line, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${PDF_COLORS_HEX.line}` }}>
                <td style={{ padding: "10px 0" }}>{line.description}</td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>{line.quantity || 1}</td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>{formatCurrency(line.unit_price)}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 500 }}>{formatCurrency(line.total)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="flex justify-end" style={{ marginTop: 16 }}>
        <div style={{ minWidth: 280, fontSize: HTML_FONT_SIZE_PX.sm }}>
          {hasVat && (
            <>
              <div className="flex justify-between" style={{ padding: "4px 0", color: PDF_COLORS_HEX.muted }}>
                <span>Sous-total HT</span>
                <span style={{ color: PDF_COLORS_HEX.ink }}>{formatCurrency(totalHt)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "4px 0", color: PDF_COLORS_HEX.muted }}>
                <span>TVA ({vatPercent}%)</span>
                <span style={{ color: PDF_COLORS_HEX.ink }}>{formatCurrency(tva)}</span>
              </div>
            </>
          )}
          <div style={{ borderTop: `2px solid ${accent}`, marginTop: 8, paddingTop: 10 }} className="flex items-baseline justify-between">
            <span style={{ fontSize: HTML_FONT_SIZE_PX.md, fontWeight: 600 }}>
              {hasVat ? "Total TTC" : "Total"}
            </span>
            <span style={{ fontSize: HTML_FONT_SIZE_PX.xl, fontWeight: 600, color: accent }}>
              {formatCurrency(totalTtc)}
            </span>
          </div>
        </div>
      </div>

      <hr style={{ marginTop: 36, marginBottom: 16, border: 0, borderTop: `1px solid ${PDF_COLORS_HEX.line}` }} />

      {/* MENTIONS */}
      <div style={{ fontSize: HTML_FONT_SIZE_PX.xs, fontStyle: "italic", color: PDF_COLORS_HEX.muted, lineHeight: 1.6 }}>
        {mode === "facture" ? (
          <>
            <div>Pénalités de retard : 3 fois le taux d'intérêt légal en vigueur.</div>
            <div>Indemnité forfaitaire de recouvrement : 40 €.</div>
          </>
        ) : (
          <div>Devis gratuit et sans engagement. Valable 30 jours.</div>
        )}
        {mention && <div>{mention}</div>}
      </div>

      {/* FOOTER */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: `1px solid ${PDF_COLORS_HEX.line}`,
          textAlign: "center",
          fontSize: HTML_FONT_SIZE_PX.xs,
          color: PDF_COLORS_HEX.muted,
        }}
      >
        {[
          companyInfo?.company_name,
          companyInfo?.legal_form,
          companyInfo?.capital_social ? `Capital ${formatCurrency(companyInfo.capital_social)}` : null,
          companyInfo?.siret ? `SIRET ${companyInfo.siret}` : null,
          companyInfo?.ape_code ? `APE ${companyInfo.ape_code}` : null,
          companyInfo?.vat_number ? `TVA ${companyInfo.vat_number}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </div>
  );
}
