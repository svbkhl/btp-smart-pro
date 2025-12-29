/**
 * Utilitaire pour configurer automatiquement le rôle admin
 * À exécuter une fois après la connexion pour l'utilisateur principal
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Ajoute le rôle admin à l'utilisateur actuel
 * Cette fonction doit être appelée manuellement une fois pour configurer le premier admin
 */
export async function setupAdminRole(): Promise<boolean> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Erreur lors de la récupération de l'utilisateur:", userError);
      return false;
    }

    console.log("🔄 Configuration du rôle admin pour l'utilisateur:", user.id);

    // Appeler la fonction server-side pour définir le rôle admin
    const { data, error } = await supabase.rpc('set_user_admin', {
      p_user_id: user.id
    });

    if (error) {
      console.error("❌ Erreur lors de la configuration du rôle admin:", error);
      
      // Si la fonction n'existe pas, essayer l'insertion directe
      if (error.message?.includes("function") || error.message?.includes("does not exist")) {
        console.log("⚠️ Fonction set_user_admin non trouvée, tentative d'insertion directe...");
        
        const { data: insertData, error: insertError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: user.id,
            role: 'admin'
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (insertError) {
          console.error("❌ Erreur lors de l'insertion directe:", insertError);
          return false;
        }

        console.log("✅ Rôle admin configuré avec succès (insertion directe)");
        return true;
      }
      
      return false;
    }

    console.log("✅ Rôle admin configuré avec succès");
    return true;
  } catch (error) {
    console.error("❌ Erreur inattendue:", error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur actuel est admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return false;

    return data.role === 'admin';
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du rôle admin:", error);
    return false;
  }
}












