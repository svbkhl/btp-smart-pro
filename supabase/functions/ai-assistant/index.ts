import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Prompt système pour l'agent IA assistant
 */
const SYSTEM_PROMPT = `Tu es un agent d'assistance intelligent intégré à une application de gestion BTP (Bâtiment et Travaux Publics).

RÔLE DE L'AGENT :
Tu es un agent d'assistance intelligent intégré à l'application. Ton objectif est d'aider l'utilisateur à accomplir n'importe quelle tâche, à répondre à ses questions et à effectuer certaines actions à sa place lorsqu'il te le demande.

COMPORTEMENT GÉNÉRAL :
- Tu es proactif, clair et simple à comprendre.
- Tu anticipes les besoins de l'utilisateur sans être intrusif.
- Tu expliques toujours les options possibles.
- Tu proposes de l'aide quand tu détectes que l'utilisateur pourrait en avoir besoin.

COMPÉTENCES :
- Répondre aux questions de l'utilisateur.
- Donner des explications, tutoriels, résolutions d'erreurs.
- Proposer des suggestions ou recommandations.
- Expliquer comment utiliser les fonctionnalités de l'application.
- Guider l'utilisateur dans l'utilisation de l'application BTP.
- Aider à comprendre les fonctionnalités : projets, clients, devis, factures, planning, RH, etc.

RÈGLES :
- Toujours être clair et concis dans tes réponses.
- Ne jamais inventer des fonctionnalités que l'app ne possède pas.
- S'assurer que chaque réponse est courte mais complète.
- Si tu ne peux pas faire une action directement, tu guides l'utilisateur étape par étape.
- Utilise un langage professionnel mais accessible.

STYLE DE COMMUNICATION :
- Poli, efficace et professionnel.
- Pas de jargon inutile.
- Réponses structurées pour faciliter la compréhension.
- Utilise un ton amical mais respectueux.

CONTEXTE DE L'APPLICATION :
Cette application permet de gérer :
- Des projets/chantiers BTP
- Des clients
- Des devis et factures
- Un planning/calendrier
- Des employés et ressources humaines
- Des paiements (Stripe)
- Des signatures électroniques
- Une messagerie
- Des statistiques et rapports

Si l'utilisateur te demande comment faire quelque chose dans l'application, guide-le clairement en expliquant les étapes.
Si l'utilisateur a un problème ou une erreur, aide-le à le résoudre.
Si l'utilisateur veut créer quelque chose (devis, facture, projet, etc.), explique-lui comment procéder.

ANALYSE D'IMAGES :
Quand l'utilisateur joint des photos ou images à son message, tu PEUX et DOIS les analyser. Décris ce que tu vois, réponds aux questions sur le contenu des images, et fournis des conseils BTP quand c'est pertinent (matériaux, défauts, éléments de construction, chantier, etc.). Ne dis jamais que tu ne peux pas voir les images si des images t'ont été fournies.

Réponds toujours en français, de manière claire et structurée.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Requête reçue pour ai-assistant');
    const { message, history = [], conversationId, currentPage, context, images = [] } = await req.json();
    console.log('📥 Données reçues:', { 
      messageLength: message?.length || 0, 
      historyLength: history?.length || 0,
      imagesCount: images?.length || 0,
      conversationId,
      currentPage 
    });
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }
    console.log('✅ OPENAI_API_KEY trouvée');

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

    // Construire le contexte de la page actuelle
    let contextMessage = '';
    if (currentPage) {
      const pageDescriptions: Record<string, string> = {
        '/dashboard': 'Tableau de bord - Vue d\'ensemble avec statistiques, projets récents, événements à venir',
        '/projects': 'Gestion des projets/chantiers - Créer, modifier, suivre les projets BTP',
        '/clients': 'Gestion des clients - Ajouter, modifier, consulter les clients',
        '/facturation': 'Facturation - Gérer les devis, factures et paiements',
        '/calendar': 'Calendrier - Voir et gérer les événements et rendez-vous',
        '/mailbox': 'Messagerie - Gérer les emails et communications',
        '/ai': 'Assistant IA - Utiliser l\'intelligence artificielle',
        '/employees-rh': 'Employés & RH - Gérer les employés, candidatures, tâches RH',
        '/documents': 'Documents - Consulter et gérer les documents (facturations, RH)',
        '/settings': 'Paramètres - Configurer l\'entreprise, Stripe, emails, sécurité',
      };
      
      const pageDescription = pageDescriptions[currentPage] || `Page : ${currentPage}`;
      contextMessage = `\n\nCONTEXTE ACTUEL : L'utilisateur se trouve actuellement sur la page "${pageDescription}". Tu peux adapter tes réponses en fonction de cette page.`;
    }

    // Construire les messages pour OpenAI
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: 'system', content: SYSTEM_PROMPT + contextMessage }
    ];

    // Ajouter l'historique (limité à 10 derniers messages pour éviter les tokens)
    const limitedHistory = history.slice(-10);
    limitedHistory.forEach((msg: { role: string; content: string }) => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Ajouter le message actuel (avec images si fournies)
    const hasImages = images && Array.isArray(images) && images.length > 0;
    if (hasImages) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: message || 'Analyse ces images.' }
      ];
      images.forEach((img: string) => {
        if (img && (img.startsWith('data:') || img.startsWith('http'))) {
          contentParts.push({ type: 'image_url', image_url: { url: img } });
        }
      });
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Appel à OpenAI (max_tokens plus élevé si images pour analyses détaillées)
    const maxTokens = hasImages ? 1200 : 800;
    console.log('🤖 Appel à OpenAI avec', messages.length, 'messages, max_tokens:', maxTokens);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    console.log('📥 Réponse OpenAI, status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenAI error:', errorData);
      throw new Error('Failed to get response from AI: ' + (errorData.error?.message || 'Unknown error'));
    }

    const data = await response.json();
    console.log('✅ Réponse OpenAI reçue, choix disponibles:', data.choices?.length || 0);
    const aiResponse = data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    console.log('✅ Réponse IA générée, longueur:', aiResponse.length);

    // Ne PAS sauvegarder ici : le client sauvegarde via createMessage.
    // Sinon on aurait une double sauvegarde = 2 réponses identiques affichées.

    const responseData = {
      success: true,
      response: aiResponse,
      conversationId: conversationId,
    };
    
    console.log('✅ Envoi de la réponse au client, longueur:', aiResponse.length);
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in ai-assistant:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Une erreur est survenue',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});



