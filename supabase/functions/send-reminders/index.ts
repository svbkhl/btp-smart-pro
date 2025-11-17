import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Appeler la fonction SQL pour envoyer les relances
    const { data, error } = await supabase.rpc('send_overdue_project_reminders');

    if (error) {
      throw error;
    }

    // Vérifier les projets qui arrivent à échéance dans les prochains jours
    const { data: upcomingProjects, error: upcomingError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        end_date,
        status,
        user_id,
        clients:client_id (
          name,
          email
        )
      `)
      .not('end_date', 'is', null)
      .neq('status', 'termine')
      .neq('status', 'annule')
      .gte('end_date', new Date().toISOString().split('T')[0])
      .lte('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 jours

    if (!upcomingError && upcomingProjects) {
      // Créer des notifications pour les projets qui arrivent à échéance
      for (const project of upcomingProjects) {
        const daysUntilDeadline = Math.ceil(
          (new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDeadline <= 3) {
          // Créer une notification
          await supabase
            .from('notifications')
            .insert({
              user_id: project.user_id,
              title: `Projet à terminer dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? 's' : ''}`,
              message: `Le projet "${project.name}" doit être terminé dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? 's' : ''}.`,
              type: daysUntilDeadline === 1 ? 'urgent' : 'warning',
              related_table: 'projects',
              related_id: project.id,
            });

          // Envoyer un email si l'utilisateur a activé les notifications email
          const { data: settings } = await supabase
            .from('user_settings')
            .select('email_notifications, email')
            .eq('user_id', project.user_id)
            .single();

          if (settings?.email_notifications && settings?.email) {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: ${daysUntilDeadline === 1 ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background-color: #f9fafb; }
                  .project-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>⏰ Projet à Terminer</h1>
                  </div>
                  <div class="content">
                    <p>Bonjour,</p>
                    <p>Le projet suivant doit être terminé dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? 's' : ''} :</p>
                    <div class="project-info">
                      <h2>${project.name}</h2>
                      <p><strong>Date d'échéance :</strong> ${project.end_date}</p>
                      <p><strong>Statut :</strong> ${project.status}</p>
                    </div>
                    <p>Cordialement,<br>Équipe Edifice Opus One</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            await supabase
              .from('email_queue')
              .insert({
                user_id: project.user_id,
                to_email: settings.email,
                subject: `⏰ Projet à terminer dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? 's' : ''} - "${project.name}"`,
                html_content: htmlContent,
                type: 'reminder',
                status: 'pending',
              });
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      overdueRemindersSent: data || 0,
      upcomingProjectsChecked: upcomingProjects?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

