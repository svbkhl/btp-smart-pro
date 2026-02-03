import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  userRole: 'admin' | 'member' | null;
  currentCompanyId: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Vérifier localStorage au démarrage
    const storedCompanyId = localStorage.getItem('currentCompanyId');
    if (storedCompanyId) {
      setCurrentCompanyId(storedCompanyId);
    }

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Gérer les erreurs de refresh token
      if (error) {
        console.error('❌ [Auth] Erreur lors de la récupération de la session:', error);
        if (error.message?.includes('refresh_token_not_found') || error.message?.includes('Invalid Refresh Token')) {
          handleInvalidToken();
        }
      }
      
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Vérifier si l'utilisateur est admin et récupérer company_id
      if (session?.user) {
        checkAdminStatus(session.user);
        fetchCurrentCompanyId(session.user.id);
      } else {
        setCurrentCompanyId(null);
        localStorage.removeItem('currentCompanyId');
      }
    }).catch((error) => {
      console.error('❌ [Auth] Erreur inattendue:', error);
      handleInvalidToken();
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Gérer la déconnexion due à un token invalide
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        if (event === 'SIGNED_OUT' && !session) {
          handleSignOut();
        }
      }
      
      if (session?.user) {
        checkAdminStatus(session.user);
        fetchCurrentCompanyId(session.user.id);
      } else {
        setIsAdmin(false);
        setCurrentCompanyId(null);
        localStorage.removeItem('currentCompanyId');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fonction pour gérer un token invalide
  const handleInvalidToken = async () => {
    console.warn('⚠️ [Auth] Token invalide détecté - déconnexion en cours...');
    try {
      // Déconnecter l'utilisateur
      await supabase.auth.signOut();
      
      // Nettoyer le localStorage
      localStorage.removeItem('currentCompanyId');
      localStorage.removeItem('supabase.auth.token');
      
      // Réinitialiser les états
      setUser(null);
      setIsAdmin(false);
      setIsEmployee(false);
      setUserRole(null);
      setCurrentCompanyId(null);
      
      // Rediriger vers la page de connexion
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ [Auth] Erreur lors de la déconnexion:', error);
      // Forcer la redirection même en cas d'erreur
      window.location.href = '/auth';
    }
  };

  // Fonction pour gérer la déconnexion normale
  const handleSignOut = () => {
    localStorage.removeItem('currentCompanyId');
    setCurrentCompanyId(null);
  };

  const checkAdminStatus = async (currentUser: User) => {
    try {
      // Vérifier dans les métadonnées de l'utilisateur (fallback)
      const metadata = currentUser.user_metadata || {};
      const statut = metadata.statut as string | undefined;
      const role = metadata.role as string | undefined;
      
      // Vérifier dans la table user_roles
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        // Gérer les différents types d'erreurs
        if (error) {
          // Erreur 406 Not Acceptable - table non exposée ou permissions manquantes
          if (error.code === "PGRST301" || error.message?.includes("Not Acceptable") || error.code === "406") {
            console.warn("⚠️ Table user_roles non accessible via API. Vérifiez les permissions RLS et l'exposition de la table.");
            // Utiliser les métadonnées comme fallback
            const finalRole = role || statut || 'member';
            const determinedRole = getRoleFromString(finalRole);
            setUserRole(determinedRole);
            setIsAdmin(determinedRole === 'admin');
            setIsEmployee(determinedRole === 'member');
            return;
          }
          
          // Erreur 42P01 - table n'existe pas
          if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation")) {
            console.warn("⚠️ Table user_roles n'existe pas encore. Utilisation des metadata utilisateur.");
            const finalRole = role || statut || 'member';
            const determinedRole = getRoleFromString(finalRole);
            setUserRole(determinedRole);
            setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
            setIsEmployee(determinedRole === 'salarie');
            return;
          }
          
          // Autre erreur
          console.warn("⚠️ Erreur lors de la récupération du rôle:", error);
          const finalRole = role || statut || 'salarie';
          const determinedRole = getRoleFromString(finalRole);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
          return;
        }

        // Avec maybeSingle(), si pas de données, data sera null (pas d'erreur PGRST116)
        if (!data) {
          // Utilisateur n'a pas de rôle dans la table, utiliser les métadonnées
          const finalRole = role || statut || 'member';
          const determinedRole = getRoleFromString(finalRole);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
          return;
        }

        // Succès - rôle trouvé dans la table
        if (data.role) {
          const roleFromDb = data.role as string;
          const determinedRole = getRoleFromEnum(roleFromDb);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'admin');
          setIsEmployee(determinedRole === 'member');
          return;
        }
      } catch (err) {
        // Erreur inattendue
        console.warn("⚠️ Erreur lors de la vérification du rôle:", err);
      }
      
      // Fallback : utiliser les métadonnées
      const finalRole = role || statut || 'member';
      const determinedRole = getRoleFromString(finalRole);
      setUserRole(determinedRole);
      setIsAdmin(determinedRole === 'admin');
      setIsEmployee(determinedRole === 'member');
    } catch (err) {
      console.warn('Erreur lors de la vérification du statut:', err);
      setIsAdmin(false);
      setIsEmployee(false);
      setUserRole(null);
    }
  };

  // Fonction helper pour convertir une string en rôle
  const getRoleFromString = (roleStr: string | undefined): 'admin' | 'member' => {
    if (!roleStr) return 'member';
    const roleLower = roleStr.toLowerCase();
    if (roleLower === 'admin' || roleLower === 'administrateur') {
      return 'admin';
    }
    return 'member';
  };

  // Fonction helper pour convertir un enum app_role en rôle
  const getRoleFromEnum = (roleEnum: string): 'admin' | 'member' => {
    const roleLower = roleEnum.toLowerCase();
    if (roleLower === 'admin') {
      return 'admin';
    }
    return 'member';
  };

  // Fonction pour récupérer le company_id actuel
  const fetchCurrentCompanyId = async (userId: string) => {
    try {
      console.log('🔵 [DEBUG useAuth] fetchCurrentCompanyId called for userId:', userId);
      
      const { data, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      console.log('🔵 [DEBUG useAuth] company_users query result:', { 
        data, 
        error, 
        hasData: !!data,
        companyId: data?.company_id 
      });

      if (error || !data) {
        console.log('❌ [DEBUG useAuth] No company found for user - setting currentCompanyId to NULL');
        setCurrentCompanyId(null);
        localStorage.removeItem('currentCompanyId');
        return;
      }

      console.log('✅ [DEBUG useAuth] Setting currentCompanyId to:', data.company_id);
      setCurrentCompanyId(data.company_id);
      localStorage.setItem('currentCompanyId', data.company_id);
    } catch (err) {
      console.error('❌ [DEBUG useAuth] Error fetching company_id:', err);
      setCurrentCompanyId(null);
    }
  };

  return { user, loading, isAdmin, isEmployee, userRole, currentCompanyId };
};

