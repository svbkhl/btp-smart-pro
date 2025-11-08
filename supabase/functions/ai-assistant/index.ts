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
    const { message, context } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
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

    // Get conversation history
    const { data: history } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const conversationHistory = history?.map(h => [
      { role: 'user', content: h.message },
      { role: 'assistant', content: h.response }
    ]).flat() || [];

    const systemPrompt = `Tu es un assistant IA spécialisé dans la gestion d'entreprise BTP. Tu aides avec:
- Gestion de projets et planification
- Devis et estimation de coûts
- Analyse de données et recommandations
- Organisation et optimisation des ressources
- Conseils techniques sur les travaux de construction

Tu fournis des réponses claires, professionnelles et actionnables.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-8), // Keep last 4 exchanges
          { role: 'user', content: message }
        ],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI error:', data);
      throw new Error('Failed to get AI response');
    }

    const aiResponse = data.choices[0].message.content;

    // Save conversation
    await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        message,
        response: aiResponse,
        context: context || {}
      });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
