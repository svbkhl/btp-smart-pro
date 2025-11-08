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
    const { imageUrl, analysisType }: { imageUrl: string; analysisType?: 'wall' | 'roof' | 'general' } = await req.json();
    
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

    const analysisPrompts = {
      wall: 'Analyse ce mur et identifie tous les défauts visibles (fissures, humidité, décollements, etc.). Estime le coût de réparation.',
      roof: 'Analyse cette toiture et identifie tous les problèmes (tuiles cassées, fuites potentielles, détérioration, etc.). Estime le coût de réparation.',
      general: 'Analyse cette image de construction et identifie tous les défauts ou problèmes visibles. Estime le coût de réparation.'
    };

    const prompt = analysisPrompts[analysisType || 'general'];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert BTP spécialisé dans l\'analyse visuelle de bâtiments. Tu identifies les défauts et estimes les coûts de réparation de manière précise. Réponds toujours en JSON.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `${prompt}\n\nFournis une réponse JSON avec cette structure:\n{\n  "defects": ["défaut1", "défaut2"],\n  "severity": "low|medium|high",\n  "estimatedCost": number,\n  "recommendations": ["recommandation1", "recommandation2"],\n  "urgency": "low|medium|high",\n  "details": "description détaillée"\n}` },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI error:', data);
      throw new Error('Failed to analyze image with AI');
    }

    const aiResponse = JSON.parse(data.choices[0].message.content);

    // Save analysis to database
    const { data: analysis, error: dbError } = await supabase
      .from('image_analysis')
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        analysis_result: aiResponse,
        defects_detected: aiResponse.defects,
        estimated_repair_cost: aiResponse.estimatedCost
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save analysis');
    }

    return new Response(JSON.stringify({ analysis: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
