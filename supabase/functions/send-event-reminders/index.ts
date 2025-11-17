/**
 * SEND EVENT REMINDERS - Envoie les rappels pour les événements
 * 
 * Cette fonction Edge est appelée par un cron job pour vérifier
 * et envoyer les rappels d'événements configurés.
 * 
 * Fonctionnalités :
 * - Vérifie les événements avec reminder_minutes configuré
 * - Envoie des notifications jusqu'à 2 semaines à l'avance
 * - Gère les rappels récurrents (reminder_recurring = true)
 * - Crée des notifications in-app et des emails si activés
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderResult {
  event_id: string;
  user_id: string;
  title: string;
  reminder_sent: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier que c'est bien un appel du cron job
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Appeler la fonction SQL pour vérifier et envoyer les rappels
    const { data: reminders, error: rpcError } = await supabase
      .rpc('check_and_send_event_reminders');

    if (rpcError) {
      console.error('Error calling check_and_send_event_reminders:', rpcError);
      // Ne pas échouer complètement, continuer avec les emails
    }

    const results: ReminderResult[] = reminders || [];
    let emailsSent = 0;

    // Pour chaque rappel envoyé, vérifier si on doit envoyer un email
    for (const reminder of results) {
      if (!reminder.reminder_sent) continue;

      // Récupérer les détails de l'événement
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          projects (
            name
          )
        `)
        .eq('id', reminder.event_id)
        .single();

      if (eventError || !event) continue;

      // Récupérer les paramètres utilisateur
      const { data: settings } = await supabase
        .from('user_settings')
        .select('email_notifications, email')
        .eq('user_id', reminder.user_id)
        .single();

      // Récupérer l'email de l'utilisateur
      const { data: user } = await supabase.auth.admin.getUserById(reminder.user_id);

      if (settings?.email_notifications && (settings.email || user?.user?.email)) {
        const emailTo = settings.email || user?.user?.email;
        if (!emailTo) continue;

        // Calculer le temps restant avant l'événement
        const eventDate = new Date(event.start_date);
        const now = new Date();
        const diffMs = eventDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeRemaining = '';
        if (diffDays > 0) {
          timeRemaining = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          timeRemaining = `${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else {
          timeRemaining = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        }

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
              .content { padding: 20px; background-color: #fff; border: 1px solid #ddd; border-radius: 5px; }
              .event-info { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #3b82f6; }
              .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 Rappel d'événement</h1>
              </div>
              <div class="content">
                <p>Bonjour,</p>
                <p>Vous avez un événement prévu dans <strong>${timeRemaining}</strong> :</p>
                <div class="event-info">
                  <h2>${event.title}</h2>
                  <p><strong>Date :</strong> ${new Date(event.start_date).toLocaleString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  ${event.location ? `<p><strong>Lieu :</strong> ${event.location}</p>` : ''}
                  ${event.projects?.name ? `<p><strong>Projet :</strong> ${event.projects.name}</p>` : ''}
                  ${event.description ? `<p><strong>Description :</strong> ${event.description}</p>` : ''}
                </div>
                <p>Cordialement,<br>Équipe Edifice Opus One</p>
              </div>
              <div class="footer">
                <p>Cet email a été envoyé automatiquement par votre système de gestion BTP.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Ajouter à la queue d'emails
        await supabase
          .from('email_queue')
          .insert({
            user_id: reminder.user_id,
            to_email: emailTo,
            subject: `🔔 Rappel : ${event.title} dans ${timeRemaining}`,
            html_content: htmlContent,
            type: 'reminder',
            status: 'pending',
          });

        emailsSent++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reminders_checked: results.length,
      reminders_sent: results.filter(r => r.reminder_sent).length,
      emails_queued: emailsSent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-event-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


