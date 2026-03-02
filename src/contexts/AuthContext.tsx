import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isCloserEmail } from '@/config/admin';
import { useFakeDataStore } from '@/store/useFakeDataStore';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True tant que le fetch initial de currentCompanyId n'est pas terminé */
  isCompanyLoading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  /** True si l'utilisateur est un closer (hardcoded ou en base) */
  isCloser: boolean;
  /** True pendant la vérification asynchrone du statut closer (évite les redirections prématurées) */
  isCloserLoading: boolean;
  userRole: 'admin' | 'member' | null;
  currentCompanyId: string | null;
  /** Force refetch current company (e.g. after accepting an invitation). */
  refetchCurrentCompanyId: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isCloser, setIsCloser] = useState(false);
  const [isCloserLoading, setIsCloserLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  
  // 🔒 CRITICAL: Prevent infinite loops - DO NOT REMOVE
  const isFetchingCompanyIdRef = useRef(false);
  const lastFetchedCompanyIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    console.log('✅ [Auth] AuthProvider initialized (single instance)');
    
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
      if (session?.user && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        checkAdminStatus(session.user);
        fetchCurrentCompanyId(session.user.id);
      } else if (!session?.user) {
        setCurrentCompanyId(null);
        setIsCompanyLoading(false);
        localStorage.removeItem('currentCompanyId');
      } else {
        // Déjà initialisé — company déjà disponible
        setIsCompanyLoading(false);
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
      
      // Handle sign out
      if (event === 'SIGNED_OUT' && !session) {
        hasInitializedRef.current = false;
        lastFetchedCompanyIdRef.current = null;
        setIsAdmin(false);
        setCurrentCompanyId(null);
        setIsCompanyLoading(false);
        localStorage.removeItem('currentCompanyId');
        handleSignOut();
        return;
      }
      
      // Only fetch company ID on initial sign in or if not yet initialized
      // This prevents the infinite loop caused by TOKEN_REFRESHED events
      if (session?.user && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        checkAdminStatus(session.user);
        fetchCurrentCompanyId(session.user.id);
      } else if (!session?.user) {
        setIsCompanyLoading(false);
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
      await supabase.auth.signOut();
      localStorage.removeItem('currentCompanyId');
      localStorage.removeItem('supabase.auth.token');
      setUser(null);
      setIsAdmin(false);
      setIsEmployee(false);
      setUserRole(null);
      setCurrentCompanyId(null);
      window.location.href = '/auth';
    } catch (error) {
      console.error('❌ [Auth] Erreur lors de la déconnexion:', error);
      window.location.href = '/auth';
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('currentCompanyId');
    setCurrentCompanyId(null);
  };

  const checkAdminStatus = async (currentUser: User) => {
    try {
      const metadata = currentUser.user_metadata || {};
      const rawMetadata = currentUser.raw_user_meta_data || {};
      const statut = metadata.statut as string | undefined;
      const role = metadata.role as string | undefined;
      
      // PRIORITÉ 1 : Vérifier si c'est un admin système
      if (rawMetadata.is_system_admin === true || rawMetadata.is_system_admin === 'true') {
        setUserRole('admin');
        setIsAdmin(true);
        setIsEmployee(false);
        return;
      }
      
      // PRIORITÉ 2 : Vérifier dans la table user_roles
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          if (error.code === "PGRST301" || error.message?.includes("Not Acceptable") || error.code === "406") {
            console.warn("⚠️ Table user_roles non accessible via API");
            const finalRole = role || statut || 'member';
            const determinedRole = getRoleFromString(finalRole);
            setUserRole(determinedRole);
            setIsAdmin(determinedRole === 'admin');
            setIsEmployee(determinedRole === 'member');
            return;
          }
          
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("⚠️ Table user_roles n'existe pas encore");
            const finalRole = role || statut || 'member';
            const determinedRole = getRoleFromString(finalRole);
            setUserRole(determinedRole);
            setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
            setIsEmployee(determinedRole === 'salarie');
            return;
          }
          
          console.warn("⚠️ Erreur lors de la récupération du rôle:", error);
          const finalRole = role || statut || 'salarie';
          const determinedRole = getRoleFromString(finalRole);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
          return;
        }

        if (!data) {
          const finalRole = role || statut || 'member';
          const determinedRole = getRoleFromString(finalRole);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
          return;
        }

        if (data.role) {
          const roleFromDb = data.role as string;
          const determinedRole = getRoleFromEnum(roleFromDb);
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'admin');
          setIsEmployee(determinedRole === 'member');
          return;
        }
      } catch (err) {
        console.warn("⚠️ Erreur lors de la vérification du rôle:", err);
      }
      
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

  const getRoleFromString = (roleStr: string | undefined): 'admin' | 'member' => {
    if (!roleStr) return 'member';
    const roleLower = roleStr.toLowerCase();
    if (roleLower === 'admin' || roleLower === 'administrateur') {
      return 'admin';
    }
    return 'member';
  };

  const getRoleFromEnum = (roleEnum: string): 'admin' | 'member' => {
    const roleLower = roleEnum.toLowerCase();
    if (roleLower === 'admin') {
      return 'admin';
    }
    return 'member';
  };

  const fetchCurrentCompanyId = async (userId: string) => {
    if (isFetchingCompanyIdRef.current) {
      return;
    }
    
    isFetchingCompanyIdRef.current = true;
    
    try {
      // Vérifier si l'utilisateur est admin système
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Admin système n'a pas besoin de company_id
      if (currentUser?.raw_user_meta_data?.is_system_admin === true || 
          currentUser?.raw_user_meta_data?.is_system_admin === 'true') {
        if (lastFetchedCompanyIdRef.current !== null) {
          lastFetchedCompanyIdRef.current = null;
          setCurrentCompanyId(null);
          localStorage.removeItem('currentCompanyId');
        }
        return;
      }
      
      const { data, error } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        if (lastFetchedCompanyIdRef.current !== null) {
          lastFetchedCompanyIdRef.current = null;
          setCurrentCompanyId(null);
          localStorage.removeItem('currentCompanyId');
        }
        return;
      }

      // Only update if companyId has changed
      if (lastFetchedCompanyIdRef.current !== data.company_id) {
        lastFetchedCompanyIdRef.current = data.company_id;
        setCurrentCompanyId(data.company_id);
        localStorage.setItem('currentCompanyId', data.company_id);
      }
    } catch (err) {
      console.error('Error fetching company_id:', err);
      if (lastFetchedCompanyIdRef.current !== null) {
        lastFetchedCompanyIdRef.current = null;
        setCurrentCompanyId(null);
      }
    } finally {
      isFetchingCompanyIdRef.current = false;
      setIsCompanyLoading(false);
    }
  };

  const refetchCurrentCompanyId = async () => {
    if (user) await fetchCurrentCompanyId(user.id);
  };

  // Vérifier si l'utilisateur est un closer (hardcoded OU en base)
  // et activer automatiquement les données fictives pour eux
  useEffect(() => {
    const email = user?.email;
    if (!email) {
      setIsCloser(false);
      setIsCloserLoading(false);
      return;
    }
    // Vérification immédiate sur la liste hardcodée
    if (isCloserEmail(email)) {
      setIsCloser(true);
      setIsCloserLoading(false);
      useFakeDataStore.getState().setFakeDataEnabled(true);
      return;
    }
    // Vérification en base (asynchrone) — isCloserLoading reste true pendant ce temps
    setIsCloserLoading(true);
    supabase
      .from('closer_emails' as any)
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
      .then(({ data }) => {
        const closer = !!data;
        setIsCloser(closer);
        setIsCloserLoading(false);
        if (closer) {
          useFakeDataStore.getState().setFakeDataEnabled(true);
        }
      });
  }, [user?.email]);

  const value: AuthContextValue = {
    user,
    loading,
    isCompanyLoading,
    isAdmin,
    isEmployee,
    isCloser,
    isCloserLoading,
    userRole,
    currentCompanyId,
    refetchCurrentCompanyId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
