import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, context } = body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not set');
      console.error('SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Set' : 'Not set');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Set' : 'Not set');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY in Settings → Edge Functions → Secrets.',
          details: 'The OPENAI_API_KEY secret must be configured in Supabase Dashboard.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Supabase URL or Service Role Key is missing. Please contact support.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authorization header - try multiple header names
    let authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') ||
                     req.headers.get('x-authorization');
    
    if (!authHeader) {
      console.error('No authorization header found. Headers:', Object.fromEntries(req.headers.entries()));
      return new Response(
        JSON.stringify({ error: 'Authentification requise. Veuillez vous reconnecter.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from header
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      console.error('Token is empty after extraction');
      return new Response(
        JSON.stringify({ error: 'Token d\'authentification invalide. Veuillez vous reconnecter.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token received, length:', token.length);

    // Verify user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('Authentication error details:', {
        message: userError.message,
        status: userError.status,
        name: userError.name
      });
      return new Response(
        JSON.stringify({ error: `Erreur d'authentification: ${userError.message || 'Token invalide. Veuillez vous reconnecter.'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user returned from auth.getUser');
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé. Veuillez vous reconnecter.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing AI request for user: ${user.id}`);

    // Get conversation history (last 3 conversations = 6 messages max) - Reduced for speed
    // Simplified: Skip history for now to avoid any database issues
    let history: any[] = [];
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (historyError) {
        console.warn('Error fetching conversation history (non-critical):', historyError.message);
        // Continue without history - ce n'est pas critique
        history = [];
      } else {
        history = historyData || [];
      }
    } catch (e) {
      console.warn('Exception fetching history (non-critical):', e);
      // Continue without history - ce n'est pas critique
      history = [];
    }

    // Build conversation history for OpenAI (limited for speed)
    const conversationHistory = history
      .reverse() // Reverse to get chronological order
      .slice(0, 3) // Take only last 3 conversations
      .map(h => {
        try {
          return [
            { role: 'user' as const, content: (h.message || '').substring(0, 500) }, // Limit message length
            { role: 'assistant' as const, content: (h.response || '').substring(0, 1000) } // Limit response length
          ];
        } catch (e) {
          console.warn('Error processing history item:', e);
          return [];
        }
      })
      .flat()
      .filter(msg => msg.content && msg.content.length > 0); // Remove empty messages

    // System prompt spécialisé BTP (optimized, shorter)
    const systemPrompt = `Tu es un expert-conseil IA spécialisé dans le BTP. Aide les entrepreneurs et artisans du bâtiment.

DOMAINES: Gestion de projets, devis et estimation, conseils techniques, gestion commerciale, organisation, réglementation et sécurité.

STYLE: Réponds en français, sois précis et professionnel, donne des conseils pratiques, mentionne les normes pertinentes, propose des solutions concrètes adaptées au BTP.

Réponds de manière concise et actionnable.`;

    // Prepare messages for OpenAI (reduced context for faster response)
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-4), // Reduced from 8 to 4 messages (2 exchanges)
      { role: 'user' as const, content: message.trim().substring(0, 2000) } // Limit user message length
    ];

    console.log(`Sending request to OpenAI with ${messages.length} messages`);

    // Call OpenAI API with timeout
    let openAIResponse: Response;
    let openAIData: any;
    
    try {
      // Create AbortController for timeout (25 seconds max - Edge Functions have ~30s timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      
      try {
        openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            temperature: 0.7,
            max_tokens: 800, // Reduced to speed up response
            stream: false, // Explicitly disable streaming
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('OpenAI API request timed out');
          return new Response(
            JSON.stringify({ 
              error: 'La requête a pris trop de temps. Veuillez réessayer avec une question plus courte.',
              details: 'Timeout après 25 secondes'
            }),
            { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw fetchError;
      }

      openAIData = await openAIResponse.json();
      
      if (!openAIResponse.ok) {
        console.error('OpenAI API error:', {
          status: openAIResponse.status,
          statusText: openAIResponse.statusText,
          data: openAIData
        });
        
        const errorMessage = openAIData.error?.message || openAIData.error?.code || 'Failed to get AI response';
        const errorType = openAIData.error?.type || 'unknown';
        
        return new Response(
          JSON.stringify({ 
            error: `Erreur OpenAI API (${errorType}): ${errorMessage}`,
            status: openAIResponse.status
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (fetchError) {
      console.error('Exception calling OpenAI API:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
      return new Response(
        JSON.stringify({ error: `Erreur de connexion à OpenAI: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract AI response
    const aiResponse = openAIData.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No response from OpenAI:', JSON.stringify(openAIData, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'No response received from AI',
          details: openAIData.error ? `OpenAI API error: ${JSON.stringify(openAIData.error)}` : 'Unexpected response format from OpenAI API'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received AI response (${aiResponse.length} characters)`);

    // Save conversation to database (non-blocking, don't wait for it)
    // Use fire-and-forget to avoid blocking the response
    supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        message: message.trim(),
        response: aiResponse,
        context: context || {}
      })
      .then(({ error: insertError }) => {
        if (insertError) {
          console.error('Error saving conversation (non-blocking):', insertError);
        } else {
          console.log('Conversation saved successfully (non-blocking)');
        }
      })
      .catch((e) => {
        console.error('Exception saving conversation (non-blocking):', e);
      });

    // Return success response
    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in ai-assistant function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error details:', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Retourner un message d'erreur plus détaillé
    return new Response(
      JSON.stringify({ 
        error: `Erreur serveur: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
