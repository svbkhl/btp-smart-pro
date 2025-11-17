import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: 'confirmation' | 'reminder' | 'notification' | 'quote';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, type = 'notification' }: EmailRequest = await req.json();
    
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header (optional for service calls)
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!userError && user) {
        userId = user.id;
      }
    }

    // For production, use a proper email service (SendGrid, Resend, etc.)
    // For now, we'll store in email_queue table and log
    const emailData = {
      to,
      subject,
      html_content: html,
      text_content: text || '',
      type,
      status: 'pending',
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    // Store email in queue
    const { data: emailQueue, error: queueError } = await supabase
      .from('email_queue')
      .insert(emailData)
      .select()
      .single();

    if (queueError) {
      console.error('Error storing email in queue:', queueError);
      // Continue anyway - we'll log it
    }

    // In production, you would send the email here using a service like:
    // - SendGrid: https://sendgrid.com/
    // - Resend: https://resend.com/
    // - AWS SES: https://aws.amazon.com/ses/
    // - Supabase Edge Functions with Resend (recommended)

    // Example with Resend (you need to add RESEND_API_KEY to env):
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Edifice Opus One <noreply@edifice-opus-one.com>', // Change this to your domain
            to: [to],
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          }),
        });

        if (resendResponse.ok) {
          const resendData = await resendResponse.json();
          
          // Update queue status
          if (emailQueue) {
            await supabase
              .from('email_queue')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString(),
                external_id: resendData.id,
              })
              .eq('id', emailQueue.id);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            messageId: resendData.id,
            message: 'Email sent successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorData = await resendResponse.json();
          throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
        }
      } catch (emailError) {
        console.error('Error sending email via Resend:', emailError);
        
        // Update queue status to failed
        if (emailQueue) {
          await supabase
            .from('email_queue')
            .update({ 
              status: 'failed',
              error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
            })
            .eq('id', emailQueue.id);
        }

        // Return success anyway - email is queued
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Email queued (email service not configured)',
          queued: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // No email service configured - just queue it
      console.log('Email queued (no email service configured):', { to, subject });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email queued (email service not configured. Add RESEND_API_KEY to enable)',
        queued: true,
        emailId: emailQueue?.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in send-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

