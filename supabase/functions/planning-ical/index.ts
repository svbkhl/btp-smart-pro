// ============================================================================
// Flux iCal du planning employé pour Google Calendar
// ============================================================================
// GET ?token=xxx → retourne un flux ICS avec les affectations de l'employé
// Les employés peuvent ajouter cette URL dans Google Calendar (Autres calendriers → Par URL)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey",
  "Access-Control-Max-Age": "86400",
};

function escapeIcs(str: string): string {
  return (str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(dateStr: string, timeStr?: string): string {
  if (!timeStr) {
    return dateStr.replace(/-/g, "");
  }
  const [h, m] = timeStr.split(":");
  return `${dateStr.replace(/-/g, "")}T${h || "08"}${m || "00"}00`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return new Response(
        "Invalid or missing token",
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, company_id, prenom, nom")
      .eq("calendar_feed_token", token)
      .single();

    if (empError || !employee) {
      return new Response(
        "Token invalide ou expiré",
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const { data: assignments, error: assignError } = await supabase
      .from("employee_assignments")
      .select(`
        id,
        date,
        heure_debut,
        heure_fin,
        heures,
        projects:project_id (name, location)
      `)
      .eq("employee_id", employee.id)
      .eq("company_id", employee.company_id)
      .gte("date", startDate.toISOString().slice(0, 10))
      .lte("date", endDate.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    if (assignError) {
      console.error("[planning-ical] Error fetching assignments:", assignError);
      return new Response(
        "Erreur lors de la récupération du planning",
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
      );
    }

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BTP SMART PRO//Planning Employé//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:Planning - ${escapeIcs(employee.prenom + " " + employee.nom)}`,
    ];

    for (const a of assignments || []) {
      const project = (a as { projects?: { name?: string; location?: string } }).projects;
      const projectName = project?.name || "Affectation";
      const location = project?.location || "";
      const dateStr = (a as { date: string }).date;
      const heureDebut = (a as { heure_debut?: string }).heure_debut || "08:00";
      const heureFin = (a as { heure_fin?: string }).heure_fin || "17:00";
      const heures = (a as { heures?: number }).heures ?? 0;

      const dtStart = formatIcsDate(dateStr, heureDebut);
      const dtEnd = formatIcsDate(dateStr, heureFin);
      const summary = escapeIcs(projectName);
      const desc = escapeIcs(`Planning BTP SMART PRO\nChantier: ${projectName}\nHeures: ${heures}h`);

      const dtStamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
      lines.push(
        "BEGIN:VEVENT",
        `UID:${(a as { id: string }).id}@btpsmartpro.com`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        location ? `LOCATION:${escapeIcs(location)}` : null,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    const ics = lines.filter(Boolean).join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="planning.ics"',
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[planning-ical] Error:", err);
    return new Response(
      "Erreur serveur",
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } }
    );
  }
});
