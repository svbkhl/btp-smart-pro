// Edge Function pour seed les données de démo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { force = false } = await req.json();

    // Récupérer le premier utilisateur admin
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun utilisateur trouvé" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const demoUserId = users[0].id;

    // Si force, supprimer d'abord les données de démo existantes
    if (force) {
      const tables = ['clients', 'projects', 'ai_quotes', 'notifications', 'employees', 'candidatures', 'taches_rh'];
      for (const table of tables) {
        await supabaseClient.from(table).delete().eq('is_demo', true);
      }
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // 1. CLIENTS
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .upsert([
        {
          user_id: demoUserId,
          name: 'Entreprise Bernard & Fils',
          email: 'contact@bernard-construction.fr',
          phone: '+33 1 23 45 67 89',
          location: '15 Rue de la République, 75001 Paris',
          status: 'actif',
          is_demo: true,
          created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: demoUserId,
          name: 'Promotion Immobilière Dubois',
          email: 'info@dubois-promotion.fr',
          phone: '+33 1 98 76 54 32',
          location: '42 Avenue des Champs-Élysées, 75008 Paris',
          status: 'VIP',
          is_demo: true,
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: demoUserId,
          name: 'M. et Mme Martin',
          email: 'martin.famille@email.fr',
          phone: '+33 6 12 34 56 78',
          location: '8 Impasse des Roses, 92100 Boulogne-Billancourt',
          status: 'actif',
          is_demo: true,
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ], { onConflict: 'id', ignoreDuplicates: false })
      .select();

    if (clientsError) {
      console.error('Erreur clients:', clientsError);
    }

    const clientIds = clients?.map(c => c.id) || [];

    // 2. PROJETS
    if (clientIds.length >= 3) {
      await supabaseClient
        .from('projects')
        .upsert([
          {
            user_id: demoUserId,
            client_id: clientIds[0],
            name: 'Rénovation complète appartement 75m²',
            status: 'en_cours',
            progress: 65,
            budget: 125000.00,
            location: '12 Rue de Rivoli, 75004 Paris',
            start_date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Rénovation complète d\'un appartement : électricité, plomberie, carrelage, peinture.',
            is_demo: true,
            created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            user_id: demoUserId,
            client_id: clientIds[1],
            name: 'Extension maison +20m² avec terrasse',
            status: 'planifié',
            progress: 0,
            budget: 85000.00,
            location: '45 Chemin des Vignes, 92160 Antony',
            start_date: fiveDaysFromNow.toISOString().split('T')[0],
            end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Extension de 20m² avec création d\'une terrasse couverte.',
            is_demo: true,
            created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            user_id: demoUserId,
            client_id: clientIds[2],
            name: 'Rénovation salle de bain complète',
            status: 'terminé',
            progress: 100,
            budget: 18500.00,
            location: '8 Impasse des Roses, 92100 Boulogne-Billancourt',
            start_date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Rénovation complète : carrelage, sanitaires, miroir, douche italienne.',
            is_demo: true,
            created_at: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString()
          }
        ], { onConflict: 'id', ignoreDuplicates: false });
    }

    // 3. DEVIS
    await supabaseClient
      .from('ai_quotes')
      .upsert([
        {
          user_id: demoUserId,
          client_name: 'Entreprise Bernard & Fils',
          work_type: 'Rénovation complète',
          surface: 75,
          estimated_cost: 125000.00,
          status: 'pending',
          details: { materials: ['Carrelage', 'Peinture', 'Électricité'], description: 'Rénovation complète' },
          is_demo: true,
          created_at: threeDaysAgo.toISOString()
        },
        {
          user_id: demoUserId,
          client_name: 'M. et Mme Martin',
          work_type: 'Rénovation salle de bain',
          surface: 8,
          estimated_cost: 18500.00,
          status: 'signed',
          signed_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          signed_by: 'M. Martin',
          details: { materials: ['Carrelage', 'Sanitaires'], description: 'Rénovation salle de bain' },
          is_demo: true,
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: demoUserId,
          client_name: 'Promotion Immobilière Dubois',
          work_type: 'Extension maison',
          surface: 20,
          estimated_cost: 85000.00,
          status: 'pending',
          details: { materials: ['Béton', 'Charpente', 'Couverture'], description: 'Extension maison' },
          is_demo: true,
          created_at: oneDayAgo.toISOString()
        }
      ], { onConflict: 'id', ignoreDuplicates: false });

    // 4. NOTIFICATIONS
    await supabaseClient
      .from('notifications')
      .upsert([
        {
          user_id: demoUserId,
          title: 'Devis en attente',
          message: 'Le devis pour "Rénovation complète appartement" est en attente de signature depuis 3 jours.',
          type: 'warning',
          related_table: 'ai_quotes',
          is_read: false,
          is_demo: true,
          created_at: threeDaysAgo.toISOString()
        },
        {
          user_id: demoUserId,
          title: 'Chantier à démarrer',
          message: 'Le chantier "Extension maison +20m²" démarre dans 5 jours. Pensez à préparer le matériel.',
          type: 'info',
          related_table: 'projects',
          is_read: false,
          is_demo: true,
          created_at: oneDayAgo.toISOString()
        },
        {
          user_id: demoUserId,
          title: 'Paiement reçu',
          message: 'Paiement de 18 500€ reçu pour le projet "Rénovation salle de bain complète".',
          type: 'success',
          related_table: 'projects',
          is_read: true,
          is_demo: true,
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ], { onConflict: 'id', ignoreDuplicates: false });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Données de démo créées avec succès',
        created: {
          clients: 3,
          projects: 3,
          quotes: 3,
          notifications: 3
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

