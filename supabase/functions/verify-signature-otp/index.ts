/**
 * Edge Function pour vérifier un code OTP de signature
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    const { otp_code, session_token, email } = body;

    // Capturer l'IP
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('x-real-ip') || 
                       'unknown';

    console.log('🔍 [verify-otp] Vérification OTP:', { otp_code, session_token, email });

    if (!otp_code) {
      return new Response(
        JSON.stringify({ error: 'OTP code is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Rechercher l'OTP
    let query = supabaseClient
      .from('signature_otp')
      .select('*')
      .eq('otp_code', otp_code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (session_token) {
      query = query.eq('session_token', session_token);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: otpRecords, error: otpError } = await query;

    if (otpError || !otpRecords || otpRecords.length === 0) {
      // Enregistrer tentative échouée
      if (session_token || email) {
        await supabaseClient
          .from('signature_events')
          .insert({
            session_token: session_token || null,
            event_type: 'otp_failed',
            event_data: { reason: 'invalid_or_expired' },
            ip_address: ip_address,
          });
      }

      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired OTP code',
          valid: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const otpRecord = otpRecords[0];

    // Vérifier le nombre de tentatives
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts. Please request a new code.',
          valid: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Marquer comme vérifié
    const { error: updateError } = await supabaseClient
      .from('signature_otp')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        attempts: otpRecord.attempts + 1,
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour OTP:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Enregistrer l'événement d'audit
    try {
      await supabaseClient
        .from('signature_events')
        .insert({
          quote_id: otpRecord.quote_id || null,
          session_token: otpRecord.session_token || null,
          event_type: 'otp_verified',
          event_data: { email: otpRecord.email },
          ip_address: ip_address,
        });
    } catch (auditError) {
      console.error('⚠️ Erreur audit (non bloquant):', auditError);
    }

    console.log('✅ OTP vérifié avec succès');

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        message: 'OTP verified successfully',
        quote_id: otpRecord.quote_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Error in verify-signature-otp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

