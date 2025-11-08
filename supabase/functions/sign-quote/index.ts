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
    const { quoteId, signatureData, signerName } = await req.json();
    
    if (!quoteId || !signatureData || !signerName) {
      throw new Error('Missing required fields: quoteId, signatureData, or signerName');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Signing quote:', quoteId, 'for user:', user.id);

    // Verify the quote belongs to the user
    const { data: quote, error: quoteError } = await supabase
      .from('ai_quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found or access denied');
    }

    // Update quote with signature
    const { data: updatedQuote, error: updateError } = await supabase
      .from('ai_quotes')
      .update({
        signature_data: signatureData,
        signed_by: signerName,
        signed_at: new Date().toISOString(),
        status: 'signed'
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quote:', updateError);
      throw updateError;
    }

    console.log('Quote signed successfully:', updatedQuote.id);

    return new Response(JSON.stringify({ 
      success: true, 
      quote: updatedQuote 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sign-quote function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
