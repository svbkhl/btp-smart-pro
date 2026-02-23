/**
 * Envoi automatique du planning de la semaine prochaine par email aux employés
 * Appelé par cron. Le patron configure jour/heure dans Paramètres > Planning.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOURS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getNextWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + diffToMonday + 7);
  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);
  return {
    start: nextMonday.toISOString().slice(0, 10),
    end: nextFriday.toISOString().slice(0, 10),
  };
}

function buildPlanningHtml(
  employeeName: string,
  companyName: string,
  weekStart: string,
  weekEnd: string,
  assignments: { date: string; projectName: string; heures: number; heure_debut?: string; heure_fin?: string }[]
): string {
  const rows = assignments
    .map(
      (a) =>
        `<tr><td>${a.date}</td><td>${a.projectName}</td><td>${a.heure_debut && a.heure_fin ? `${a.heure_debut} - ${a.heure_fin}` : `${a.heures}h`}</td></tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#f9fafb;border-radius:8px;overflow:hidden}
.header{background:#2563eb;color:#fff;padding:20px;text-align:center}
.content{padding:24px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:6px;overflow:hidden}
th,td{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}
th{background:#f3f4f6;font-weight:600}
.footer{text-align:center;padding:16px;color:#6b7280;font-size:13px}
</style></head>
<body>
<div class="container">
  <div class="header"><h1 style="margin:0">Votre planning</h1><p style="margin:8px 0 0 0;opacity:.9">Semaine du ${weekStart} au ${weekEnd}</p></div>
  <div class="content">
    <p>Bonjour ${employeeName},</p>
    <p>Voici votre planning pour la semaine prochaine chez <strong>${companyName}</strong> :</p>
    ${assignments.length > 0 ? `
    <table><thead><tr><th>Date</th><th>Chantier</th><th>Horaires</th></tr></thead><tbody>${rows}</tbody></table>
    ` : `<p><em>Aucune affectation pour cette semaine.</em></p>`}
    <p style="margin-top:20px">Vous pouvez consulter votre planning sur l'application BTP Smart Pro.</p>
  </div>
  <div class="footer">BTP Smart Pro – Planning automatique</div>
</div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("FROM_EMAIL") || "contact@btpsmartpro.com";
    const FROM_NAME = Deno.env.get("FROM_NAME") || "BTP Smart Pro";

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    const { data: settingsList, error: settingsError } = await supabase
      .from("company_planning_email_settings")
      .select("company_id, send_day, send_hour, send_minute")
      .eq("enabled", true);

    if (settingsError) {
      console.error("[send-planning-weekly] Settings error:", settingsError);
      return new Response(
        JSON.stringify({ error: "Settings error", details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settingsList || settingsList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No companies with planning email enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { start: weekStart, end: weekEnd } = getNextWeekRange();
    let totalSent = 0;

    for (const settings of settingsList) {
      if (settings.send_day !== currentDay || settings.send_hour !== currentHour) {
        continue;
      }

      const companyId = settings.company_id;

      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      const companyName = company?.name ?? "Votre entreprise";

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, nom, prenom, email")
        .eq("company_id", companyId);

      if (empErr || !employees?.length) continue;

      for (const emp of employees) {
        const email = (emp as any)?.email;
        if (!email) continue;

        const { data: assignments } = await supabase
          .from("employee_assignments")
          .select(`
            date,
            heures,
            heure_debut,
            heure_fin,
            projects:project_id (name)
          `)
          .eq("employee_id", emp.id)
          .eq("company_id", companyId)
          .gte("date", weekStart)
          .lte("date", weekEnd)
          .order("date", { ascending: true });

        const mapped = ((assignments as any[]) || []).map((a: any) => ({
          date: a.date,
          projectName: a.projects?.name ?? "Chantier",
          heures: a.heures ?? 0,
          heure_debut: a.heure_debut,
          heure_fin: a.heure_fin,
        }));

        const empName = [emp.prenom, emp.nom].filter(Boolean).join(" ") || "Employé";
        const html = buildPlanningHtml(empName, companyName, weekStart, weekEnd, mapped);

        if (RESEND_API_KEY) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${FROM_NAME} <${FROM_EMAIL}>`,
              to: [email],
              subject: `Planning semaine du ${weekStart} au ${weekEnd} – ${companyName}`,
              html,
            }),
          });
          if (res.ok) {
            totalSent++;
            console.log(`[send-planning-weekly] Sent to ${email}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[send-planning-weekly] Error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
