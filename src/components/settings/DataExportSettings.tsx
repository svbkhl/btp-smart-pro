import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, FileSpreadsheet, Users, FileText, Receipt, Briefcase, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

// ── helpers ──────────────────────────────────────────────────────────────
const fmt = (v?: number | null) => (v ?? 0).toFixed(2);
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const statusLabel: Record<string, string> = {
  draft: "Brouillon", sent: "Envoyé", accepted: "Accepté",
  rejected: "Refusé", expired: "Expiré", signed: "Signé",
  paid: "Payé", cancelled: "Annulé", en_cours: "En cours",
  termine: "Terminé", annule: "Annulé", planifie: "Planifié",
  pending: "En attente", active: "Actif", inactive: "Inactif",
};

function addSheet(wb: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    const ws = XLSX.utils.aoa_to_sheet([[`Aucune donnée pour ${name}`]]);
    XLSX.utils.book_append_sheet(wb, ws, name);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);

  // Style en-têtes (largeur auto)
  const cols = Object.keys(rows[0]).map((k) => ({
    wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length), 10),
  }));
  ws["!cols"] = cols;

  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ── composant ────────────────────────────────────────────────────────────
export function DataExportSettings() {
  const { companyId } = useCompanyId();
  const { user } = useAuth();
  const { data: company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const runExport = async () => {
    if (!companyId || !user) return;
    setLoading(true);
    try {
      // ── Requêtes parallèles ──────────────────────────────────────────
      const [
        { data: clients },
        { data: quotes },
        { data: invoices },
        { data: projects },
        { data: employees },
        { data: payments },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("ai_quotes")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("employees")
          .select("*")
          .eq("company_id", companyId)
          .order("last_name", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
      ]);

      // Filtre date si renseigné
      const inRange = (d?: string | null) => {
        if (!d) return true;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo + "T23:59:59") return false;
        return true;
      };

      const filteredInvoices = (invoices ?? []).filter((i) => inRange(i.created_at));
      const filteredQuotes = (quotes ?? []).filter((q) => inRange(q.created_at));

      // ── Résumé ──────────────────────────────────────────────────────
      const totalCA = filteredInvoices
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + (i.total_ttc ?? i.amount ?? 0), 0);
      const totalImpaye = filteredInvoices
        .filter((i) => i.status !== "paid" && i.status !== "cancelled")
        .reduce((s, i) => s + (i.total_ttc ?? i.amount ?? 0), 0);
      const totalDevis = filteredQuotes
        .reduce((s, q) => s + (q.total_ttc ?? q.estimated_cost ?? 0), 0);
      const devisSignes = filteredQuotes.filter((q) => q.status === "signed" || q.status === "paid").length;
      const tauxConv = filteredQuotes.length
        ? Math.round((devisSignes / filteredQuotes.length) * 100)
        : 0;

      const companyName = company?.name ?? "Mon entreprise";
      const exportDate = new Date().toLocaleDateString("fr-FR");

      const resume = [
        { Indicateur: "Entreprise", Valeur: companyName },
        { Indicateur: "Date d'export", Valeur: exportDate },
        { Indicateur: "Période", Valeur: dateFrom && dateTo ? `${fmtDate(dateFrom)} → ${fmtDate(dateTo)}` : "Toutes les données" },
        { Indicateur: "", Valeur: "" },
        { Indicateur: "── FACTURATION ──", Valeur: "" },
        { Indicateur: "Chiffre d'affaires (encaissé)", Valeur: `${fmt(totalCA)} €` },
        { Indicateur: "Montant impayé", Valeur: `${fmt(totalImpaye)} €` },
        { Indicateur: "Nb factures total", Valeur: filteredInvoices.length },
        { Indicateur: "Nb factures payées", Valeur: filteredInvoices.filter((i) => i.status === "paid").length },
        { Indicateur: "Nb factures impayées", Valeur: filteredInvoices.filter((i) => ["draft","sent","signed"].includes(i.status)).length },
        { Indicateur: "", Valeur: "" },
        { Indicateur: "── DEVIS ──", Valeur: "" },
        { Indicateur: "Montant total des devis", Valeur: `${fmt(totalDevis)} €` },
        { Indicateur: "Nb devis total", Valeur: filteredQuotes.length },
        { Indicateur: "Nb devis signés / acceptés", Valeur: devisSignes },
        { Indicateur: "Taux de conversion", Valeur: `${tauxConv} %` },
        { Indicateur: "", Valeur: "" },
        { Indicateur: "── PORTEFEUILLE ──", Valeur: "" },
        { Indicateur: "Nb clients", Valeur: (clients ?? []).length },
        { Indicateur: "Nb chantiers", Valeur: (projects ?? []).length },
        { Indicateur: "Chantiers en cours", Valeur: (projects ?? []).filter((p) => p.status === "en_cours").length },
        { Indicateur: "Nb employés", Valeur: (employees ?? []).length },
      ];

      // ── Clients ──────────────────────────────────────────────────────
      const clientsRows = (clients ?? []).map((c) => ({
        "Nom": c.last_name ?? "",
        "Prénom": c.first_name ?? c.name ?? "",
        "Email": c.email ?? "",
        "Téléphone": c.phone ?? "",
        "Adresse": c.address ?? c.location ?? "",
        "Ville": c.city ?? "",
        "Statut": statusLabel[c.status] ?? c.status ?? "",
        "Client depuis": fmtDate(c.created_at),
      }));

      // ── Devis ────────────────────────────────────────────────────────
      const devisRows = filteredQuotes.map((q) => ({
        "N° Devis": q.quote_number ?? "",
        "Client": q.client_name ?? "",
        "Email client": q.client_email ?? "",
        "Montant HT (€)": fmt(q.subtotal_ht ?? q.estimated_cost),
        "TVA (€)": fmt(q.total_tva),
        "Montant TTC (€)": fmt(q.total_ttc ?? q.estimated_cost),
        "Statut": statusLabel[q.status] ?? q.status,
        "Date création": fmtDate(q.created_at),
        "Date envoi": fmtDate(q.sent_at),
        "Date signature": fmtDate(q.signed_at),
        "Signé par": q.signed_by ?? q.signer_name ?? "",
      }));

      // ── Factures ─────────────────────────────────────────────────────
      const facturesRows = filteredInvoices.map((i) => ({
        "N° Facture": i.invoice_number ?? "",
        "Client": i.client_name ?? "",
        "Email client": i.client_email ?? "",
        "Montant HT (€)": fmt(i.total_ht ?? i.amount_ht),
        "TVA (€)": fmt(i.vat_amount ?? i.tva),
        "Montant TTC (€)": fmt(i.total_ttc ?? i.amount_ttc ?? i.amount),
        "Statut": statusLabel[i.status] ?? i.status,
        "Date création": fmtDate(i.created_at),
        "Date échéance": fmtDate(i.due_date),
        "Date paiement": fmtDate(i.paid_at),
        "Adresse client": i.client_address ?? "",
      }));

      // ── Chantiers ────────────────────────────────────────────────────
      const chantiersRows = (projects ?? []).map((p) => ({
        "Nom chantier": p.name ?? "",
        "Statut": statusLabel[p.status] ?? p.status ?? "",
        "Date début": fmtDate(p.start_date),
        "Date fin prévue": fmtDate(p.end_date),
        "Budget (€)": fmt(p.budget),
        "Coûts réels (€)": fmt(p.costs),
        "CA réalisé (€)": fmt(p.actual_revenue),
        "Adresse": p.location ?? p.address ?? "",
        "Description": p.description ?? "",
      }));

      // ── Employés ─────────────────────────────────────────────────────
      const employesRows = (employees ?? []).map((e) => ({
        "Nom": e.last_name ?? "",
        "Prénom": e.first_name ?? "",
        "Email": e.email ?? "",
        "Téléphone": e.phone ?? "",
        "Poste": e.position ?? e.role ?? "",
        "Date d'embauche": fmtDate(e.hire_date ?? e.created_at),
        "Statut": statusLabel[e.status] ?? e.status ?? "Actif",
      }));

      // ── Paiements ────────────────────────────────────────────────────
      const paiementsRows = (payments ?? []).map((p) => ({
        "Date": fmtDate(p.created_at),
        "Client": p.client_name ?? "",
        "Référence": p.invoice_id ?? p.quote_id ?? "",
        "Montant (€)": fmt(p.amount),
        "Méthode": p.payment_type ?? p.method ?? "",
        "Statut": statusLabel[p.status] ?? p.status ?? "",
        "Référence paiement": p.payment_reference ?? p.external_id ?? "",
      }));

      // ── Génération workbook ──────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      addSheet(wb, "Résumé", resume as Record<string, unknown>[]);
      addSheet(wb, "Clients", clientsRows);
      addSheet(wb, "Devis", devisRows);
      addSheet(wb, "Factures", facturesRows);
      addSheet(wb, "Chantiers", chantiersRows);
      addSheet(wb, "Employés", employesRows);
      if (paiementsRows.length) addSheet(wb, "Paiements", paiementsRows);

      const filename = `export-${companyName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export réussi",
        description: `${filename} téléchargé avec ${[clientsRows, devisRows, facturesRows, chantiersRows, employesRows].reduce((s, a) => s + a.length, 0)} enregistrements.`,
      });
    } catch (err: unknown) {
      console.error("Export error:", err);
      toast({
        title: "Erreur export",
        description: err instanceof Error ? err.message : "Impossible de générer le fichier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { icon: Users, label: "Clients", desc: "Contacts, emails, téléphones, statuts" },
    { icon: FileText, label: "Devis", desc: "Numéros, montants, statuts, dates de signature" },
    { icon: Receipt, label: "Factures", desc: "Numéros, montants HT/TTC, paiements, échéances" },
    { icon: HardHat, label: "Chantiers", desc: "Noms, budgets, avancement, dates" },
    { icon: Briefcase, label: "Employés", desc: "Coordonnées, postes, dates d'embauche" },
  ];

  return (
    <div className="space-y-6">
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Export complet des données</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Télécharge toutes tes données dans un fichier Excel (.xlsx) multi-onglets
            </p>
          </div>
        </div>

        {/* Filtre période optionnel */}
        <div className="mb-6 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
          <p className="text-sm font-medium">Période (optionnel — vide = tout exporter)</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">Du</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">Au</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  Effacer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Ce que contient l'export */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Contenu du fichier Excel</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">Onglet</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Résumé financier</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">1er onglet</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">CA encaissé, impayés, taux conversion devis</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={runExport}
          disabled={loading}
          size="lg"
          className="w-full sm:w-auto gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exporter en Excel (.xlsx)
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          Le fichier est généré localement dans ton navigateur — aucune donnée n'est envoyée à l'extérieur.
        </p>
      </GlassCard>
    </div>
  );
}
