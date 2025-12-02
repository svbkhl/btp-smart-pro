import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction helper pour retourner une réponse standardisée
function createResponse(success: boolean, data?: any, error?: string, status: number = 200) {
  return new Response(
    JSON.stringify({ success, data, error }),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log("🚀 ===== GENERATE-QUOTE FUNCTION CALLED =====");
  console.log("🚀 Request ID:", requestId);
  console.log("🚀 Timestamp:", new Date().toISOString());
  console.log("🚀 Method:", req.method);
  console.log("🚀 URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("🚀 OPTIONS request, returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier les variables d'environnement
    console.log("🔍 Checking environment variables...");
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("🔍 OPENAI_API_KEY exists:", !!openAIApiKey);
    console.log("🔍 OPENAI_API_KEY length:", openAIApiKey?.length || 0);
    
    if (!openAIApiKey) {
      console.error("❌ OPENAI_API_KEY is not set");
      return createResponse(false, null, 'OPENAI_API_KEY is not configured in Supabase secrets', 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("🔍 SUPABASE_URL exists:", !!supabaseUrl);
    console.log("🔍 SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase credentials not set");
      return createResponse(false, null, 'Supabase configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase client created");

    // Parser le body de la requête
    console.log("📥 Parsing request body...");
    let requestData;
    try {
      const bodyText = await req.text();
      console.log("📥 Request body length:", bodyText?.length || 0);
      console.log("📥 Request body (first 500 chars):", bodyText?.substring(0, 500) || 'EMPTY');
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('❌ Empty request body');
        return createResponse(false, null, 'Le corps de la requête est vide', 400);
      }
      
      try {
        requestData = JSON.parse(bodyText);
        console.log("✅ Request parsed successfully");
        console.log("📥 Request data keys:", Object.keys(requestData || {}));
      } catch (jsonError) {
        console.error('❌ JSON parse error:', jsonError);
        return createResponse(false, null, 'Format JSON invalide: ' + (jsonError instanceof Error ? jsonError.message : 'Unknown error'), 400);
      }
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return createResponse(false, null, 'Erreur lors du parsing: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'), 400);
    }

    const { 
      clientName, 
      surface, 
      workType, 
      materials, 
      imageUrls,
      manualPrice,
      region,
      description,
      quoteFormat
    } = requestData;

    console.log("📥 Extracted data:", {
      clientName: !!clientName,
      surface: surface,
      workType: !!workType,
      materialsCount: Array.isArray(materials) ? materials.length : 0,
      hasImageUrls: !!imageUrls,
      hasManualPrice: !!manualPrice,
      region: !!region
    });

    // Valider les paramètres requis
    if (!clientName || !surface || !workType || !materials || !Array.isArray(materials) || materials.length === 0) {
      console.error('❌ Missing required fields');
      return createResponse(false, null, 'Missing required fields: clientName, surface, workType, materials', 400);
    }

    // Get user from authorization header
    console.log("🔐 Checking authorization...");
    const authHeader = req.headers.get('authorization');
    console.log("🔐 Authorization header exists:", !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No authorization header');
      return createResponse(false, null, 'No authorization header', 401);
    }
    
    let user;
    try {
      const token = authHeader.replace('Bearer ', '');
      console.log("🔐 Token length:", token.length);
      
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !userData?.user) {
        console.error('❌ User authentication error:', userError?.message);
        return createResponse(false, null, 'Unauthorized: ' + (userError?.message || 'Invalid token'), 401);
      }
      user = userData.user;
      console.log("✅ User authenticated:", user.id);
    } catch (authError) {
      console.error('❌ Auth error:', authError);
      return createResponse(false, null, 'Authentication failed: ' + (authError instanceof Error ? authError.message : 'Unknown error'), 401);
    }

    // Récupérer les informations de l'entreprise
    console.log("🏢 Fetching company info...");
    let companyInfo = null;
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('user_settings')
        .select('company_name, email, phone, address, city, postal_code, country, siret, vat_number, company_logo_url, terms_and_conditions')
        .eq('user_id', user.id)
        .single();
      
      if (!companyError && companyData) {
        companyInfo = companyData;
        console.log("✅ Company info found");
      } else {
        console.warn('⚠️ Company info not found:', companyError?.message);
      }
    } catch (companyError) {
      console.warn('⚠️ Error fetching company info:', companyError);
    }

    // Créer le prompt pour OpenAI
    console.log("🤖 Creating OpenAI prompt...");
    const isSimplified = quoteFormat === "simplified";
    const formatInstruction = isSimplified 
      ? "Génère un devis SIMPLIFIÉ avec uniquement le type de travaux et le prix total HT/TTC. Pas de détail des prestations ni des matériaux."
      : "Génère un devis DÉTAILLÉ avec toutes les prestations et matériaux listés avec leurs prix.";
    
    let prompt = `Tu es un expert en devis pour le secteur du BTP en France. ${formatInstruction}

${description ? `DESCRIPTION PRÉCISE DU CHANTIER (OBLIGATOIRE - UTILISE CES INFORMATIONS, NE PAS INVENTER):
${description}

` : ''}Informations techniques:
Client: ${clientName}
Type de travaux: ${workType}
Surface: ${surface} m²
Matériaux: ${materials.join(', ')}
${region ? `Région: ${region}` : ''}
${manualPrice ? `Prix manuel suggéré: ${manualPrice} €` : ''}

${isSimplified ? `
Pour le format SIMPLIFIÉ, génère uniquement:
- Une description courte des prestations (basée sur la description fournie)
- Le prix total HT et TTC
- Une durée estimée

Structure JSON simplifiée:
{
  "estimatedCost": 0,
  "description": "Description courte basée sur la description fournie",
  "estimatedDuration": "",
  "workSteps": [],
  "materials": []
}` : `
Génère un devis professionnel avec:
- Une description détaillée des prestations (basée sur la description fournie)
- Les étapes de travail avec coûts
- Les matériaux nécessaires avec quantités et prix unitaires
- Une durée estimée
- Des recommandations
- Une validation du prix

Structure JSON détaillée:
{
  "estimatedCost": 0,
  "description": "Description détaillée basée sur la description fournie",
  "workSteps": [{"step": "", "description": "", "cost": 0}],
  "materials": [{"name": "", "quantity": "", "unitCost": 0}],
  "estimatedDuration": "",
  "recommendations": [""],
  "priceValidation": {"isValid": true, "message": "", "warning": ""}
}`}

IMPORTANT: 
- Utilise UNIQUEMENT les informations de la description fournie, ne pas inventer de détails
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte autour
- Si une description est fournie, base-toi dessus pour générer le devis`;

    console.log("🤖 Prompt created, length:", prompt.length);

    // Appel à l'API OpenAI
    console.log("🤖 Calling OpenAI API...");
    let openaiResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);

      const openaiStartTime = Date.now();
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
              content: 'Tu es un expert en devis BTP en France. Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte autour.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const openaiDuration = Date.now() - openaiStartTime;
      console.log("🤖 OpenAI response received, status:", openaiResponse.status, "duration:", openaiDuration, "ms");
    } catch (fetchError) {
      console.error('❌ Error calling OpenAI API:', fetchError);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return createResponse(false, null, 'La requête OpenAI a pris trop de temps', 504);
      }
      return createResponse(false, null, 'Erreur OpenAI: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown error'), 500);
    }

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ OpenAI API error:', errorData);
      return createResponse(false, null, 'Erreur OpenAI API: ' + (errorData.error?.message || 'Unknown error'), openaiResponse.status);
    }

    const data = await openaiResponse.json();
    console.log("🤖 OpenAI data received, has choices:", !!data.choices);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid OpenAI response structure');
      return createResponse(false, null, 'Réponse invalide de l\'API OpenAI', 500);
    }

    // Parser la réponse JSON de l'IA
    console.log("🔧 Parsing AI response...");
    let aiResponse;
    try {
      const content = data.choices[0].message.content;
      console.log("🔧 AI content length:", content?.length || 0);
      console.log("🔧 AI content (first 500 chars):", content?.substring(0, 500));
      
      if (!content) {
        console.error('❌ Empty response from AI');
        return createResponse(false, null, 'Réponse vide de l\'IA', 500);
      }
      
      // Nettoyer le contenu (supprimer markdown, backticks)
      let cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/\s*```/g, '')
        .replace(/`/g, '')
        .trim();
      
      // Extraire le JSON (premier { jusqu'au dernier })
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      
      console.log("🔧 Cleaned JSON (first 500 chars):", cleaned.substring(0, 500));
      
      // Parser le JSON
      try {
        aiResponse = JSON.parse(cleaned);
        console.log("✅ AI response parsed successfully");
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Cleaned text (first 1000 chars):', cleaned.substring(0, 1000));
        return createResponse(false, null, 'Erreur parsing JSON: ' + (parseError instanceof Error ? parseError.message : 'Unknown error') + '. Contenu (premiers 200 chars): ' + cleaned.substring(0, 200), 500);
      }
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      return createResponse(false, null, 'Erreur parsing: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'), 500);
    }

    // Construire la réponse
    console.log("📝 Building response...");
    const responseData = {
      aiResponse: aiResponse,
      clientName: clientName,
      surface: surface,
      workType: workType,
      materials: materials,
      region: region || null,
      manualPrice: manualPrice || null,
      companyInfo: companyInfo,
    };

    // Sauvegarder dans la base de données (optionnel, non-bloquant)
    console.log("💾 Saving to database...");
    try {
      const { error: dbError } = await supabase
        .from('ai_quotes')
        .insert({
          user_id: user.id,
          client_name: clientName,
          work_type: workType,
          surface: surface,
          estimated_cost: aiResponse.estimatedCost || 0,
          details: aiResponse,
          status: 'draft',
        });

      if (dbError) {
        console.warn('⚠️ Error saving to database (non-blocking):', dbError.message);
      } else {
        console.log("✅ Quote saved to database");
      }
    } catch (dbError) {
      console.warn('⚠️ Error saving to database (non-blocking):', dbError);
    }

    const totalDuration = Date.now() - startTime;
    console.log("✅ ===== GENERATE-QUOTE SUCCESS =====");
    console.log("✅ Request ID:", requestId);
    console.log("✅ Total duration:", totalDuration, "ms");
    
    return createResponse(true, responseData, null, 200);

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ ===== GENERATE-QUOTE UNEXPECTED ERROR =====');
    console.error('❌ Request ID:', requestId);
    console.error('❌ Error:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Total duration:', totalDuration, "ms");
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue';
    return createResponse(false, null, errorMessage, 500);
  }
});
