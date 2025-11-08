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
    const { clientName, surface, workType, materials, imageUrls } = await req.json();
    
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

    // Create prompt for OpenAI
    const prompt = `Tu es un expert en devis pour le secteur du BTP. Génère un devis détaillé basé sur les informations suivantes:
    
Client: ${clientName}
Surface: ${surface} m²
Type de travaux: ${workType}
Matériaux: ${materials.join(', ')}
${imageUrls?.length ? `Photos fournies: ${imageUrls.length} image(s)` : ''}

Fournis:
1. Coût estimé total (en euros)
2. Détails des travaux par étape
3. Liste des matériaux nécessaires avec quantités
4. Durée estimée des travaux
5. Recommandations spécifiques

Format la réponse en JSON avec la structure suivante:
{
  "estimatedCost": number,
  "workSteps": [{"step": string, "description": string, "cost": number}],
  "materials": [{"name": string, "quantity": string, "unitCost": number}],
  "estimatedDuration": string,
  "recommendations": [string]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en devis BTP. Tu fournis toujours des estimations précises et détaillées en JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI error:', data);
      throw new Error('Failed to generate quote with AI');
    }

    const aiResponse = JSON.parse(data.choices[0].message.content);

    // Save quote to database
    const { data: quote, error: dbError } = await supabase
      .from('ai_quotes')
      .insert({
        user_id: user.id,
        client_name: clientName,
        surface,
        work_type: workType,
        materials,
        image_urls: imageUrls || [],
        estimated_cost: aiResponse.estimatedCost,
        details: aiResponse,
        status: 'draft'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save quote');
    }

    return new Response(JSON.stringify({ quote, aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-quote function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
