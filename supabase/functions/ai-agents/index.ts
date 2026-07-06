// Agents IA — exécution planifiée (pg_cron) et manuelle (depuis la page /agents).
//
// Agents disponibles :
//  - relance_devis  : relance automatique des devis en attente depuis N jours (email client)
//  - daily_briefing : résumé quotidien de l'activité (notification + email au dirigeant)
//  - urgent_alert   : alertes devis en attente depuis 7+ jours (toutes les 6h)
//  - avis_google    : demande d'avis Google aux clients des chantiers terminés
//  - rentabilite    : analyse de la rentabilité des chantiers en cours
//  - ca_hebdo       : chiffre d'affaires prévisionnel de la semaine (lundi)
//
// Sécurité : x-cron-secret (cron pg_cron) OU JWT utilisateur membre de la company (manuel).
// Les emails partent via la table email_queue (traitée par process-email-queue toutes les 5 min).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type AgentType =
  | "relance_devis"
  | "daily_briefing"
  | "urgent_alert"
  | "avis_google"
  | "rentabilite"
  | "ca_hebdo";

interface AgentConfig {
  id?: string;
  company_id: string;
  agent_type: AgentType;
  enabled: boolean;
  schedule_time: string; // "HH:MM"
  params: Record<string, unknown>;
}

interface RunResult {
  actions: number;
  summary: string;
  details?: Record<string, unknown>;
}

const euro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);

function parisNow(): { hour: number; weekday: number; dateISO: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  return {
    hour: parseInt(get("hour"), 10),
    weekday: wdMap[get("weekday")] ?? 0,
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

async function ownerOf(db: SupabaseClient, companyId: string): Promise<{ userId: string; email: string | null }> {
  const { data: rows } = await db
    .from("company_users")
    .select("user_id, role")
    .eq("company_id", companyId)
    .in("role", ["owner", "admin", "dirigeant"])
    .limit(1);
  const userId = rows?.[0]?.user_id;
  if (!userId) {
    const { data: any1 } = await db
      .from("company_users").select("user_id").eq("company_id", companyId).limit(1);
    if (!any1?.[0]) return { userId: "", email: null };
    const { data: u } = await db.auth.admin.getUserById(any1[0].user_id);
    return { userId: any1[0].user_id, email: u?.user?.email ?? null };
  }
  const { data: u } = await db.auth.admin.getUserById(userId);
  return { userId, email: u?.user?.email ?? null };
}

async function queueEmail(db: SupabaseClient, args: {
  userId: string; companyId: string; to: string; subject: string; html: string;
}) {
  await db.from("email_queue").insert({
    user_id: args.userId,
    company_id: args.companyId,
    to_email: args.to,
    subject: args.subject,
    html_content: args.html,
    text_content: args.html.replace(/<[^>]+>/g, " "),
    type: "agent",
    status: "pending",
  });
}

async function notify(db: SupabaseClient, args: {
  userId: string; companyId: string; title: string; message: string;
  type?: string; link?: string;
}) {
  await db.from("notifications").insert({
    user_id: args.userId,
    company_id: args.companyId,
    title: args.title,
    message: args.message,
    type: args.type ?? "info",
    link: args.link ?? null,
  });
}

// ─── Agents ───────────────────────────────────────────────────────────────────

async function runRelanceDevis(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const days = Number(cfg.params?.days ?? 3);
  const cutoff = new Date(Date.now() - days * 86400e3).toISOString();

  const { data: quotes, error } = await db
    .from("ai_quotes")
    .select("id, user_id, quote_number, title, client_id, client_name, total_ttc, total_amount, sent_at, created_at")
    .eq("company_id", cfg.company_id)
    .eq("status", "sent")
    .or("signed.is.null,signed.eq.false")
    .lt("sent_at", cutoff);
  if (error) throw error;

  let sent = 0;
  for (const q of quotes ?? []) {
    // pas de re-relance si une relance a été envoyée il y a moins de `days` jours
    const { data: recent } = await db
      .from("quote_reminders")
      .select("id")
      .eq("quote_id", q.id)
      .gte("sent_at", cutoff)
      .limit(1);
    if (recent?.length) continue;

    let email: string | null = null;
    if (q.client_id) {
      const { data: c } = await db.from("clients").select("email").eq("id", q.client_id).maybeSingle();
      email = c?.email ?? null;
    }
    if (!email) continue;

    const amount = q.total_ttc ?? q.total_amount ?? 0;
    const waitedDays = Math.floor((Date.now() - new Date(q.sent_at ?? q.created_at).getTime()) / 86400e3);
    const subject = `Votre devis ${q.quote_number ?? ""} — toujours d'actualité ?`;
    const html = `
      <p>Bonjour ${q.client_name ?? ""},</p>
      <p>Nous vous avons transmis le devis <strong>${q.quote_number ?? ""}</strong>${q.title ? ` (« ${q.title} »)` : ""}
      d'un montant de <strong>${euro(amount)}</strong> il y a ${waitedDays} jours.</p>
      <p>Avez-vous eu le temps de l'étudier ? Nous restons à votre disposition pour toute question
      ou ajustement.</p>
      <p>Bien cordialement</p>`;

    await queueEmail(db, { userId: q.user_id, companyId: cfg.company_id, to: email, subject, html });
    await db.from("quote_reminders").insert({
      quote_id: q.id,
      company_id: cfg.company_id,
      client_id: q.client_id,
      client_name: q.client_name,
      client_email: email,
      quote_number: q.quote_number,
      quote_amount: amount,
      sent_at_quote: q.sent_at,
      days_since_sent: waitedDays,
      reminder_level: 1,
      status: "sent",
      email_subject: subject,
      email_body: html,
      sent_at: new Date().toISOString(),
    });
    sent++;
  }

  const owner = await ownerOf(db, cfg.company_id);
  if (sent > 0 && owner.userId) {
    await notify(db, {
      userId: owner.userId, companyId: cfg.company_id,
      title: "🤖 Agent Relance Devis",
      message: `${sent} relance(s) envoyée(s) automatiquement aux clients.`,
      link: "/quotes",
    });
  }
  return { actions: sent, summary: sent > 0 ? `${sent} relance(s) envoyée(s)` : "Aucun devis à relancer" };
}

async function runDailyBriefing(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const today = new Date().toISOString().split("T")[0];

  const [{ count: pendingQuotes }, { data: overdue }, { count: activeProjects }] = await Promise.all([
    db.from("ai_quotes").select("id", { count: "exact", head: true })
      .eq("company_id", cfg.company_id).eq("status", "sent").or("signed.is.null,signed.eq.false"),
    db.from("invoices").select("total_ttc, amount")
      .eq("company_id", cfg.company_id).lt("due_date", today)
      .neq("status", "paid").neq("payment_status", "paid"),
    db.from("projects").select("id", { count: "exact", head: true })
      .eq("company_id", cfg.company_id).in("status", ["active", "in_progress", "en_cours"]),
  ]);

  const overdueTotal = (overdue ?? []).reduce((s, i) => s + (i.total_ttc ?? i.amount ?? 0), 0);
  const message =
    `📋 ${pendingQuotes ?? 0} devis en attente de signature · ` +
    `💶 ${overdue?.length ?? 0} facture(s) impayée(s) (${euro(overdueTotal)}) · ` +
    `🏗️ ${activeProjects ?? 0} chantier(s) en cours`;

  const owner = await ownerOf(db, cfg.company_id);
  if (owner.userId) {
    await notify(db, {
      userId: owner.userId, companyId: cfg.company_id,
      title: "☀️ Briefing du jour", message, link: "/dashboard",
    });
    if (owner.email) {
      await queueEmail(db, {
        userId: owner.userId, companyId: cfg.company_id, to: owner.email,
        subject: "☀️ Votre briefing quotidien",
        html: `<p>Bonjour,</p><p>${message.replaceAll(" · ", "<br/>")}</p><p>Bonne journée !</p>`,
      });
    }
  }
  return { actions: 1, summary: "Briefing quotidien envoyé" };
}

async function runUrgentAlert(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const days = Number(cfg.params?.days ?? 7);
  const cutoff = new Date(Date.now() - days * 86400e3).toISOString();

  const { data: quotes, error } = await db
    .from("ai_quotes")
    .select("id, quote_number, client_name, total_ttc, total_amount, sent_at")
    .eq("company_id", cfg.company_id)
    .eq("status", "sent")
    .or("signed.is.null,signed.eq.false")
    .lt("sent_at", cutoff);
  if (error) throw error;
  if (!quotes?.length) return { actions: 0, summary: "Aucun devis urgent" };

  const total = quotes.reduce((s, q) => s + (q.total_ttc ?? q.total_amount ?? 0), 0);
  const owner = await ownerOf(db, cfg.company_id);
  if (owner.userId) {
    await notify(db, {
      userId: owner.userId, companyId: cfg.company_id,
      title: "🚨 Alerte devis en attente",
      message: `${quotes.length} devis en attente depuis plus de ${days} jours — ${euro(total)} en jeu. Action recommandée : relance téléphonique.`,
      type: "warning", link: "/quotes",
    });
  }
  return {
    actions: quotes.length,
    summary: `${quotes.length} alerte(s) — ${euro(total)} en jeu`,
    details: { quote_ids: quotes.map((q) => q.id) },
  };
}

async function runAvisGoogle(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const reviewUrl = String(cfg.params?.review_url ?? "").trim();
  if (!reviewUrl) {
    return { actions: 0, summary: "Configurez l'URL d'avis Google dans les paramètres de l'agent" };
  }
  const windowDays = Number(cfg.params?.window_days ?? 30);
  const cutoff = new Date(Date.now() - windowDays * 86400e3).toISOString();

  // projets terminés récemment, dont le client n'a pas déjà été sollicité
  const { data: done } = await db
    .from("projects")
    .select("id, name, client_id, user_id, updated_at")
    .eq("company_id", cfg.company_id)
    .in("status", ["completed", "termine", "terminé", "done"])
    .gte("updated_at", cutoff);

  const { data: previous } = await db
    .from("ai_agent_runs")
    .select("details")
    .eq("company_id", cfg.company_id)
    .eq("agent_type", "avis_google");
  const alreadySent = new Set(
    (previous ?? []).flatMap((r) => (r.details?.sent_project_ids as string[] | undefined) ?? [])
  );

  let sent = 0;
  const sentIds: string[] = [];
  for (const p of done ?? []) {
    if (!p.client_id || alreadySent.has(p.id)) continue;
    const { data: c } = await db.from("clients").select("email, name, prenom").eq("id", p.client_id).maybeSingle();
    if (!c?.email) continue;

    await queueEmail(db, {
      userId: p.user_id, companyId: cfg.company_id, to: c.email,
      subject: "Votre avis compte pour nous ⭐",
      html: `
        <p>Bonjour ${c.prenom ?? c.name ?? ""},</p>
        <p>Merci de nous avoir fait confiance pour votre chantier${p.name ? ` « ${p.name} »` : ""}.</p>
        <p>Si vous êtes satisfait de notre travail, un petit avis Google nous aiderait énormément :</p>
        <p><a href="${reviewUrl}">⭐ Laisser un avis (2 minutes)</a></p>
        <p>Merci beaucoup !</p>`,
    });
    sentIds.push(p.id);
    sent++;
  }
  return {
    actions: sent,
    summary: sent > 0 ? `${sent} demande(s) d'avis envoyée(s)` : "Aucune demande d'avis à envoyer",
    details: { sent_project_ids: sentIds },
  };
}

async function runRentabilite(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const { data: projects } = await db
    .from("projects")
    .select("id, name, budget, actual_revenue, costs, benefice, status")
    .eq("company_id", cfg.company_id)
    .in("status", ["active", "in_progress", "en_cours"]);
  if (!projects?.length) return { actions: 0, summary: "Aucun chantier en cours à analyser" };

  const analysed = projects.map((p) => {
    const revenue = p.actual_revenue ?? p.budget ?? 0;
    const costs = p.costs ?? 0;
    const margin = p.benefice ?? revenue - costs;
    return { name: p.name, revenue, costs, margin };
  });
  const totalMargin = analysed.reduce((s, p) => s + p.margin, 0);
  const worst = [...analysed].sort((a, b) => a.margin - b.margin)[0];

  const owner = await ownerOf(db, cfg.company_id);
  if (owner.userId) {
    await notify(db, {
      userId: owner.userId, companyId: cfg.company_id,
      title: "📊 Analyse de rentabilité",
      message:
        `${analysed.length} chantier(s) en cours — marge totale estimée : ${euro(totalMargin)}.` +
        (worst && worst.margin < 0 ? ` ⚠️ « ${worst.name} » est déficitaire (${euro(worst.margin)}).` : ""),
      type: worst && worst.margin < 0 ? "warning" : "info",
      link: "/projects",
    });
  }
  return { actions: analysed.length, summary: `${analysed.length} chantier(s) analysé(s)` };
}

async function runCaHebdo(db: SupabaseClient, cfg: AgentConfig): Promise<RunResult> {
  const now = new Date();
  const in7 = new Date(Date.now() + 7 * 86400e3);
  const today = now.toISOString().split("T")[0];
  const week = in7.toISOString().split("T")[0];

  const [{ data: dueThisWeek }, { data: signedUnpaid }] = await Promise.all([
    db.from("invoices").select("total_ttc, amount")
      .eq("company_id", cfg.company_id)
      .gte("due_date", today).lte("due_date", week)
      .neq("status", "paid").neq("payment_status", "paid"),
    db.from("ai_quotes").select("total_ttc, total_amount")
      .eq("company_id", cfg.company_id).eq("signed", true).neq("payment_status", "paid"),
  ]);

  const expected = (dueThisWeek ?? []).reduce((s, i) => s + (i.total_ttc ?? i.amount ?? 0), 0);
  const pipeline = (signedUnpaid ?? []).reduce((s, q) => s + (q.total_ttc ?? q.total_amount ?? 0), 0);

  const owner = await ownerOf(db, cfg.company_id);
  const message = `💰 CA attendu cette semaine : ${euro(expected)} (${dueThisWeek?.length ?? 0} facture(s) à échéance) · Pipeline signé non encaissé : ${euro(pipeline)}`;
  if (owner.userId) {
    await notify(db, {
      userId: owner.userId, companyId: cfg.company_id,
      title: "💰 CA de la semaine", message, link: "/facturation",
    });
    if (owner.email) {
      await queueEmail(db, {
        userId: owner.userId, companyId: cfg.company_id, to: owner.email,
        subject: "💰 Votre CA prévisionnel de la semaine",
        html: `<p>Bonjour,</p><p>${message.replaceAll(" · ", "<br/>")}</p>`,
      });
    }
  }
  return { actions: 1, summary: `CA semaine : ${euro(expected)}` };
}

const RUNNERS: Record<AgentType, (db: SupabaseClient, cfg: AgentConfig) => Promise<RunResult>> = {
  relance_devis: runRelanceDevis,
  daily_briefing: runDailyBriefing,
  urgent_alert: runUrgentAlert,
  avis_google: runAvisGoogle,
  rentabilite: runRentabilite,
  ca_hebdo: runCaHebdo,
};

async function executeAgent(
  db: SupabaseClient,
  cfg: AgentConfig,
  triggeredBy: "cron" | "manual"
): Promise<{ status: string; result: RunResult }> {
  let status = "success";
  let result: RunResult;
  try {
    result = await RUNNERS[cfg.agent_type](db, cfg);
  } catch (e) {
    status = "error";
    result = { actions: 0, summary: `Erreur : ${e?.message ?? e}` };
  }
  await db.from("ai_agent_runs").insert({
    company_id: cfg.company_id,
    agent_type: cfg.agent_type,
    status,
    triggered_by: triggeredBy,
    actions_count: result.actions,
    summary: result.summary,
    details: result.details ?? {},
  });
  return { status, result };
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body = await req.json().catch(() => ({}));
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = Boolean(cronSecret && req.headers.get("x-cron-secret") === cronSecret);

    if (isCron) {
      // ── Mode cron : exécute tous les agents "dus" à cette heure ──────────────
      const { hour, weekday } = parisNow();
      const { data: configs } = await db.from("ai_agent_configs").select("*").eq("enabled", true);
      const since24h = new Date(Date.now() - 23 * 3600e3).toISOString();
      const since5h = new Date(Date.now() - 5 * 3600e3).toISOString();

      let executed = 0;
      for (const cfg of (configs ?? []) as AgentConfig[]) {
        if (!RUNNERS[cfg.agent_type]) continue;

        let due = false;
        if (cfg.agent_type === "urgent_alert") {
          due = hour % 6 === 0;
        } else if (cfg.agent_type === "ca_hebdo") {
          due = weekday === 1 && parseInt(cfg.schedule_time, 10) === hour;
        } else {
          due = parseInt(cfg.schedule_time, 10) === hour;
        }
        if (!due) continue;

        // idempotence : pas de double exécution
        const since = cfg.agent_type === "urgent_alert" ? since5h : since24h;
        const { data: recent } = await db
          .from("ai_agent_runs").select("id")
          .eq("company_id", cfg.company_id).eq("agent_type", cfg.agent_type)
          .eq("triggered_by", "cron").gte("ran_at", since).limit(1);
        if (recent?.length) continue;

        await executeAgent(db, cfg, "cron");
        executed++;
      }
      return json({ ok: true, executed });
    }

    // ── Mode manuel : JWT utilisateur requis, membre de la company ────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { agent_type, company_id } = body as { agent_type: AgentType; company_id: string };
    if (!agent_type || !company_id || !RUNNERS[agent_type]) {
      return json({ error: "agent_type et company_id requis" }, 400);
    }

    const { data: membership } = await db
      .from("company_users").select("id")
      .eq("company_id", company_id).eq("user_id", user.id).limit(1);
    if (!membership?.length) return json({ error: "Forbidden" }, 403);

    const { data: cfgRow } = await db
      .from("ai_agent_configs").select("*")
      .eq("company_id", company_id).eq("agent_type", agent_type).maybeSingle();

    const cfg: AgentConfig = (cfgRow as AgentConfig) ?? {
      company_id,
      agent_type,
      enabled: false,
      schedule_time: "08:00",
      params: {},
    };

    const { status, result } = await executeAgent(db, cfg, "manual");
    return json({ ok: status === "success", status, ...result });
  } catch (e) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
