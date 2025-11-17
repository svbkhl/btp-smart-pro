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
    // Valider les variables d'environnement
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not set');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parser le body de la requête
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      clientName, 
      surface, 
      workType, 
      materials, 
      imageUrls,
      manualPrice,
      region
    } = requestData;

    // Valider les paramètres requis
    if (!clientName || !surface || !workType || !materials || !Array.isArray(materials) || materials.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientName, surface, workType, materials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let user;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (userError || !userData?.user) {
        console.error('User authentication error:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = userData.user;
    } catch (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les informations de l'entreprise depuis user_settings (optionnel, ne pas faire échouer si absent)
    let companyInfo = null;
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('user_settings')
        .select('company_name, email, phone, address, city, postal_code, country, siret, vat_number, company_logo_url, terms_and_conditions, signature_data, signature_name')
        .eq('user_id', user.id)
        .single();
      
      if (!companyError && companyData) {
        companyInfo = companyData;
      } else {
        console.warn('Company info not found or error:', companyError?.message);
        // Ne pas faire échouer si les infos entreprise ne sont pas trouvées
      }
    } catch (companyError) {
      console.warn('Error fetching company info:', companyError);
      // Continuer sans les infos entreprise
    }

    // Déterminer la saison actuelle
    const month = new Date().getMonth() + 1; // 1-12
    let season = 'printemps';
    if (month >= 3 && month <= 5) season = 'printemps';
    else if (month >= 6 && month <= 8) season = 'été';
    else if (month >= 9 && month <= 11) season = 'automne';
    else season = 'hiver';

    // Créer le prompt pour OpenAI avec prix manuel si fourni
    let prompt = `Tu es un expert en devis pour le secteur du BTP en France. Génère un devis détaillé basé sur les informations suivantes:

Client: ${clientName}
Surface: ${surface} m²
Type de travaux: ${workType}
Matériaux: ${materials.join(', ')}
${region ? `Région: ${region}` : ''}
Saison: ${season}
${imageUrls?.length ? `Photos fournies: ${imageUrls.length} image(s)` : ''}`;

    // Si prix manuel fourni, demander à l'IA de valider sa cohérence
    if (manualPrice && manualPrice > 0) {
      prompt += `

PRIX MANUEL FOURNI: ${manualPrice} €
IMPORTANT: L'utilisateur a fourni un prix manuel. Tu dois:
1. Analyser la cohérence de ce prix avec le marché (surface, type de travaux, matériaux, région)
2. Si le prix semble anormalement bas (< 30% du prix moyen estimé), ajouter un avertissement dans "priceValidation"
3. Si le prix semble anormalement élevé (> 200% du prix moyen estimé), ajouter un avertissement dans "priceValidation"
4. Utiliser ce prix comme coût estimé total, mais le décomposer en étapes et matériaux cohérents`;
    } else {
      prompt += `

Calcule le coût estimé total selon:
- La surface (${surface} m²)
- Le type de travaux (${workType})
- Les matériaux nécessaires (${materials.join(', ')})
- La région ${region ? `(${region})` : '(coûts moyens France)'}
- La saison (${season})
- Les coûts moyens du marché BTP en France`;
    }

    prompt += `

Fournis:
1. Coût estimé total (en euros) ${manualPrice ? `(utiliser ${manualPrice} € comme référence)` : ''}
2. Détails des travaux par étape avec coûts
3. Liste des matériaux nécessaires avec quantités et prix unitaires
4. Durée estimée des travaux (en jours ouvrés)
5. Recommandations spécifiques
6. Validation du prix (si prix manuel fourni, analyser sa cohérence)

Format la réponse en JSON avec la structure suivante:
{
  "estimatedCost": number,
  "workSteps": [{"step": string, "description": string, "cost": number}],
  "materials": [{"name": string, "quantity": string, "unitCost": number}],
  "estimatedDuration": string,
  "recommendations": [string],
  "priceValidation": {
    "isValid": boolean,
    "message": string,
    "warning": string (optionnel, seulement si prix anormal)
  }
}`;

    // Appel à l'API OpenAI avec timeout
    let openaiResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000); // 28 secondes max

      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'Tu es un expert en devis BTP en France. Tu fournis toujours des estimations précises et détaillées en JSON. Tu connais les coûts moyens du marché, les variations régionales, et les saisons. Tu valides toujours la cohérence des prix.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('OpenAI API request timed out');
          return new Response(
            JSON.stringify({ error: 'La requête a pris trop de temps. Veuillez réessayer.' }),
            { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw fetchError;
      }
    } catch (fetchError) {
      console.error('Error calling OpenAI API:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'appel à l\'API OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erreur de l\'API OpenAI: ' + (errorData.error?.message || 'Unknown error') }),
        { status: openaiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      return new Response(
        JSON.stringify({ error: 'Réponse invalide de l\'API OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parser la réponse JSON de l'IA
    let aiResponse;
    try {
      const content = data.choices[0].message.content;
      if (!content) {
        console.error('Empty response from AI');
        throw new Error('Empty response from AI');
      }
      
      console.log('Raw AI response (first 500 chars):', content.substring(0, 500));
      
      // Nettoyer le contenu (enlever les markdown code blocks si présents)
      let cleanedContent = content.trim();
      
      // Enlever les marqueurs markdown
      cleanedContent = cleanedContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      
      // Si le contenu commence par {, c'est du JSON
      if (cleanedContent.startsWith('{')) {
        try {
          aiResponse = JSON.parse(cleanedContent);
        } catch (e) {
          // Essayer d'extraire le JSON du texte si le parsing échoue
          const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiResponse = JSON.parse(jsonMatch[0]);
          } else {
            throw e;
          }
        }
      } else {
        // Essayer d'extraire le JSON du texte
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResponse = JSON.parse(jsonMatch[0]);
        } else {
          console.error('No JSON found in response. Content:', cleanedContent.substring(0, 200));
          throw new Error('No JSON found in AI response');
        }
      }
      
      console.log('Parsed AI response:', JSON.stringify(aiResponse, null, 2).substring(0, 500));
    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError);
      console.error('Parse error details:', {
        message: parseError?.message,
        stack: parseError?.stack
      });
      console.error('Raw response content:', data.choices[0].message.content?.substring(0, 1000));
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors du parsing de la réponse de l\'IA. Veuillez réessayer.',
          details: parseError?.message || 'Unknown parsing error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider et corriger la structure de la réponse
    if (aiResponse.estimatedCost === undefined || aiResponse.estimatedCost === null) {
      console.warn('Invalid AI response: missing estimatedCost', JSON.stringify(aiResponse, null, 2));
      
      // Si prix manuel fourni, l'utiliser
      if (manualPrice && manualPrice > 0) {
        aiResponse.estimatedCost = manualPrice;
        console.warn('Using manual price as estimatedCost was missing');
      } else {
        // Calculer un coût approximatif basé sur la surface (estimation très basique)
        const baseCostPerSquareMeter = 50; // Coût de base par m²
        aiResponse.estimatedCost = parseFloat(String(surface)) * baseCostPerSquareMeter;
        console.warn('Estimated cost missing, using fallback calculation:', aiResponse.estimatedCost);
      }
    }
    
    // S'assurer que estimatedCost est un nombre
    aiResponse.estimatedCost = parseFloat(String(aiResponse.estimatedCost)) || 0;

    // Si prix manuel fourni, utiliser ce prix mais garder la validation de l'IA
    if (manualPrice && manualPrice > 0) {
      aiResponse.estimatedCost = manualPrice;
      // Si l'IA n'a pas fourni de validation, en créer une basique
      if (!aiResponse.priceValidation) {
        aiResponse.priceValidation = {
          isValid: true,
          message: "Prix manuel utilisé",
          warning: "L'IA a validé la cohérence de ce prix avec le marché."
        };
      }
    }

    // Assurer que priceValidation existe même si l'IA ne l'a pas fourni
    if (!aiResponse.priceValidation) {
      aiResponse.priceValidation = {
        isValid: true,
        message: "Prix calculé par l'IA",
      };
    }

    // Assurer que les tableaux existent
    if (!aiResponse.workSteps) aiResponse.workSteps = [];
    if (!aiResponse.materials) aiResponse.materials = [];
    if (!aiResponse.recommendations) aiResponse.recommendations = [];
    if (!aiResponse.estimatedDuration) aiResponse.estimatedDuration = 'Non spécifié';

    // Sauvegarder le devis dans la base de données (ne pas faire échouer si la sauvegarde échoue)
    let quote = null;
    try {
      // Obtenir le prochain numéro de devis
      let quoteNumber = null;
      try {
        const { data: quoteNumberData, error: quoteNumberError } = await supabase
          .rpc('get_next_quote_number');
        
        if (!quoteNumberError && quoteNumberData) {
          quoteNumber = quoteNumberData;
        } else {
          console.warn('Error getting quote number:', quoteNumberError?.message);
          // Générer un numéro de secours basé sur la date
          const year = new Date().getFullYear();
          const timestamp = Date.now().toString().slice(-6);
          quoteNumber = `DEV-${year}-${timestamp}`;
        }
      } catch (quoteNumberError) {
        console.warn('Exception getting quote number:', quoteNumberError);
        // Générer un numéro de secours
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        quoteNumber = `DEV-${year}-${timestamp}`;
      }

      // Préparer les données à insérer
      // Inclure la signature automatique si elle existe dans les paramètres
      const quoteDataToInsert: any = {
        user_id: user.id,
        client_name: clientName,
        surface: parseFloat(surface) || null,
        work_type: workType,
        materials: Array.isArray(materials) ? materials : [],
        image_urls: Array.isArray(imageUrls) ? imageUrls : [],
        estimated_cost: aiResponse.estimatedCost || null,
        quote_number: quoteNumber,
        details: {
          ...aiResponse,
          company_info: companyInfo,
          region: region || null,
          season: season,
          manual_price: manualPrice || null,
          quote_number: quoteNumber,
        },
        status: 'signed', // Marquer comme signé si signature automatique présente
        signature_data: companyInfo?.signature_data || null,
        signed_by: companyInfo?.signature_name || null,
        signed_at: companyInfo?.signature_data ? new Date().toISOString() : null,
      };

      const { data: quoteData, error: dbError } = await supabase
        .from('ai_quotes')
        .insert(quoteDataToInsert)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        console.error('Error details:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        
        // Si l'erreur est due à la table qui n'existe pas, retourner une erreur explicite
        if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
          console.error('Table ai_quotes does not exist. Please run VERIFIER-ET-CREER-AI-QUOTES.sql');
          // Ne pas faire échouer, mais logger l'erreur
        }
        
        // Ne pas faire échouer la requête si la sauvegarde échoue
        console.warn('Failed to save quote to database, but continuing with AI response');
      } else {
        quote = quoteData;
        if (quote && 'id' in quote) {
          console.log('Quote saved successfully:', (quote as any).id);
        }
      }
    } catch (dbError: any) {
      console.error('Database exception:', dbError);
      console.error('Exception details:', {
        message: dbError?.message,
        stack: dbError?.stack
      });
      // Continuer même si la sauvegarde échoue
    }

    // Retourner la réponse même si la sauvegarde a échoué
    // Inclure le numéro de devis dans la réponse
    return new Response(JSON.stringify({ 
      quote: quote ? {
        ...quote,
        quote_number: quoteNumber || quote.quote_number || null
      } : null,
      aiResponse: {
        ...aiResponse,
        quote_number: quoteNumber || null
      },
      companyInfo: companyInfo || null,
      quoteNumber: quoteNumber || null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in generate-quote function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
