import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

// Cache global pour éviter les requêtes répétées en cas d'erreur
const rolesCheckCache = new Map<string, { isAdmin: boolean; timestamp: number; error: boolean }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingChecks = new Map<string, Promise<boolean>>(); // Cache des promesses en cours

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasCheckedRolesRef = useRef(false);

  // Fonction pour vérifier les rôles (réutilisable et thread-safe)
  const checkUserRoles = async (userId: string): Promise<boolean> => {
    // Vérifier le cache d'abord
    const cached = rolesCheckCache.get(userId);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_DURATION) {
        return cached.isAdmin;
      }
    }

    // Si une vérification est déjà en cours pour cet utilisateur, attendre le résultat
    const pendingCheck = pendingChecks.get(userId);
    if (pendingCheck) {
      return pendingCheck;
    }

    // Créer une nouvelle promesse pour cette vérification
    const checkPromise = (async () => {
      try {
        const rolesPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        // Timeout de 3 secondes pour la requête roles
        const rolesResult = await Promise.race([
          rolesPromise,
          new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: "TIMEOUT" } }), 3000)
          ),
        ]);
        
        // Vérifier si la requête a réussi
        if (rolesResult.error || !rolesResult.data) {
          // En cas d'erreur (table n'existe pas, RLS bloque, etc.), considérer comme non-admin
          // Mettre en cache pour éviter les requêtes répétées
          const result = false;
          rolesCheckCache.set(userId, { 
            isAdmin: result, 
            timestamp: Date.now(),
            error: true 
          });
          pendingChecks.delete(userId);
          return result;
        } else {
          const hasAdminRole = rolesResult.data?.some((r: { role: string }) => 
            r.role === 'dirigeant' || r.role === 'administrateur'
          ) || false;
          // Mettre en cache le résultat
          rolesCheckCache.set(userId, { 
            isAdmin: hasAdminRole, 
            timestamp: Date.now(),
            error: false 
          });
          pendingChecks.delete(userId);
          return hasAdminRole;
        }
      } catch (error) {
        // En cas d'erreur, considérer comme non-admin et mettre en cache
        const result = false;
        rolesCheckCache.set(userId, { 
          isAdmin: result, 
          timestamp: Date.now(),
          error: true 
        });
        pendingChecks.delete(userId);
        return result;
      }
    })();

    // Stocker la promesse en cours
    pendingChecks.set(userId, checkPromise);
    return checkPromise;
  };

  useEffect(() => {
    // Timeout de sécurité : après 5 secondes, arrêter le chargement même si pas de réponse
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user is admin avec timeout et gestion d'erreur robuste
        // Ne vérifier qu'une seule fois pour éviter les requêtes répétées
        if (session?.user && !hasCheckedRolesRef.current) {
          hasCheckedRolesRef.current = true;
          const adminStatus = await checkUserRoles(session.user.id);
          setIsAdmin(adminStatus);
        } else if (!session?.user) {
          setIsAdmin(false);
          hasCheckedRolesRef.current = false;
        }
        
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    // THEN check for existing session avec timeout
    // Utiliser une variable pour éviter les vérifications doubles
    let sessionChecked = false;
    
    Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 5000)
      ),
    ]).then(async ({ data: { session } }) => {
      // Si onAuthStateChange a déjà géré cette session, ne pas refaire
      if (sessionChecked) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check admin role avec timeout et gestion d'erreur robuste
      // Ne vérifier qu'une seule fois pour éviter les requêtes répétées
      if (session?.user && !hasCheckedRolesRef.current) {
        hasCheckedRolesRef.current = true;
        sessionChecked = true;
        const adminStatus = await checkUserRoles(session.user.id);
        setIsAdmin(adminStatus);
      } else if (!session?.user) {
        setIsAdmin(false);
        hasCheckedRolesRef.current = false;
      }
      
      setLoading(false);
      clearTimeout(timeoutId);
    }).catch(() => {
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signOut = async () => {
    // Nettoyer le cache à la déconnexion
    if (user?.id) {
      rolesCheckCache.delete(user.id);
      pendingChecks.delete(user.id);
    }
    hasCheckedRolesRef.current = false;
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return { user, session, loading, signOut, isAdmin };
};
