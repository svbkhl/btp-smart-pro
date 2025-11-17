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

    // Vérifier que c'est bien un appel du cron job (optionnel - vous pouvez ajouter une clé secrète)
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer les emails en attente (limite de 20 à la fois)
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No emails to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let processed = 0;
    let failed = 0;

    // Traiter chaque email
    for (const email of emails) {
      try {
        if (resendApiKey) {
          // Envoyer l'email via Resend
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Edifice Opus One <noreply@edifice-opus-one.com>', // Changez cette adresse
              to: [email.to_email],
              subject: email.subject,
              html: email.html_content,
              text: email.text_content || email.html_content.replace(/<[^>]*>/g, ''),
            }),
          });

          if (resendResponse.ok) {
            const resendData = await resendResponse.json();
            
            // Marquer comme envoyé
            await supabase
              .from('email_queue')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString(),
                external_id: resendData.id,
              })
              .eq('id', email.id);

            processed++;
          } else {
            const errorData = await resendResponse.json();
            throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
          }
        } else {
          // Pas de service d'email configuré - marquer comme "sent" (simulation)
          // En production, vous devriez configurer un service d'email
          await supabase
            .from('email_queue')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          processed++;
          console.log(`Email queued (no email service): ${email.to_email} - ${email.subject}`);
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        
        // Incrémenter le compteur de tentatives
        const retryCount = (email.retry_count || 0) + 1;
        
        // Marquer comme failed si trop de tentatives
        if (retryCount >= 3) {
          await supabase
            .from('email_queue')
            .update({ 
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: retryCount,
            })
            .eq('id', email.id);
          failed++;
        } else {
          // Réessayer plus tard
          await supabase
            .from('email_queue')
            .update({ 
              retry_count: retryCount,
            })
            .eq('id', email.id);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      failed,
      total: emails.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-email-queue function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

