import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  userRole: 'administrateur' | 'dirigeant' | 'salarie' | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [userRole, setUserRole] = useState<'administrateur' | 'dirigeant' | 'salarie' | null>(null);

  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Vérifier si l'utilisateur est admin
      if (session?.user) {
        checkAdminStatus(session.user);
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkAdminStatus(session.user);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (currentUser: User) => {
    try {
      // Vérifier dans les métadonnées de l'utilisateur
      const metadata = currentUser.user_metadata || {};
      const statut = metadata.statut as string | undefined;
      const role = metadata.role as string | undefined;
      
      // Vérifier dans la table user_roles si elle existe
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single();

        if (!error && data) {
          const roleFromDb = data.role as string | undefined;
          const finalRole = roleFromDb || role || statut || 'salarie';
          
          // Déterminer le rôle final
          let determinedRole: 'administrateur' | 'dirigeant' | 'salarie' = 'salarie';
          if (finalRole === 'administrateur' || finalRole === 'admin') {
            determinedRole = 'administrateur';
          } else if (finalRole === 'dirigeant') {
            determinedRole = 'dirigeant';
          } else {
            determinedRole = 'salarie';
          }
          
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
        } else {
          // Si pas de rôle dans la table, utiliser les métadonnées
          const finalRole = role || statut || 'salarie';
          let determinedRole: 'administrateur' | 'dirigeant' | 'salarie' = 'salarie';
          if (finalRole === 'administrateur' || finalRole === 'admin') {
            determinedRole = 'administrateur';
          } else if (finalRole === 'dirigeant') {
            determinedRole = 'dirigeant';
          } else {
            determinedRole = 'salarie';
          }
          
          setUserRole(determinedRole);
          setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
          setIsEmployee(determinedRole === 'salarie');
        }
      } catch (err) {
        // Si la table n'existe pas, utiliser les métadonnées
        const finalRole = role || statut || 'salarie';
        let determinedRole: 'administrateur' | 'dirigeant' | 'salarie' = 'salarie';
        if (finalRole === 'administrateur' || finalRole === 'admin') {
          determinedRole = 'administrateur';
        } else if (finalRole === 'dirigeant') {
          determinedRole = 'dirigeant';
        } else {
          determinedRole = 'salarie';
        }
        
        setUserRole(determinedRole);
        setIsAdmin(determinedRole === 'administrateur' || determinedRole === 'dirigeant');
        setIsEmployee(determinedRole === 'salarie');
      }
    } catch (err) {
      console.warn('Erreur lors de la vérification du statut:', err);
      setIsAdmin(false);
      setIsEmployee(false);
      setUserRole(null);
    }
  };

  return { user, loading, isAdmin, isEmployee, userRole };
};

