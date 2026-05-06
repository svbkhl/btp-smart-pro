import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLandingDemoStore } from "@/store/useLandingDemoStore";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { usePermissions } from "@/hooks/usePermissions";
import { isEmployeeViewEmail } from "@/config/admin";

/**
 * Composant guard qui désactive automatiquement le mode démo
 * dès qu'un utilisateur non-admin/closer se connecte.
 *
 * Pour les comptes employés (rôle 'employee', vue employée forcée par email,
 * ou non-admin/non-closer) : fakeDataEnabled est forcé à false. C'est une
 * sécurité en plus du gate par hook — assure qu'aucun composant n'affiche
 * de FAKE_* à un employé.
 */
export const DemoModeGuard = () => {
  const { user, loading, userRole, isCloser, isCloserLoading } = useAuth();
  const { isEmployee, isOwner, isAdmin } = usePermissions();
  const location = useLocation();
  const { isDemoActive, deactivateDemo } = useLandingDemoStore();
  const { setFakeDataEnabled, fakeDataEnabled } = useFakeDataStore();

  useEffect(() => {
    if (location.pathname === "/demo") return;

    if (!loading && user) {
      if (isDemoActive) {
        console.log("🔒 Utilisateur connecté détecté - Désactivation du mode démo landing");
        deactivateDemo();
      }
      // Désactiver fakeData pour TOUT compte qui n'est pas explicitement admin système ou closer.
      // Un compte employé (rôle 'employee', isEmployeeViewEmail, ou simplement non-admin/non-closer)
      // ne doit jamais voir de données démo, même momentanément.
      const shouldDisable =
        fakeDataEnabled &&
        !isCloserLoading &&
        !isCloser &&
        (isEmployee || isEmployeeViewEmail(user.email) || (userRole !== "admin" && !isOwner && !isAdmin));

      if (shouldDisable) {
        console.log("🔒 Désactivation du mode fake data - compte employé/non-admin");
        setFakeDataEnabled(false);
      }
    }

    if (!loading && !user && !isDemoActive && fakeDataEnabled) {
      console.log("🔒 Désactivation du mode fake data - Mode démo non actif");
      setFakeDataEnabled(false);
    }
  }, [
    user,
    loading,
    userRole,
    isCloser,
    isCloserLoading,
    isEmployee,
    isOwner,
    isAdmin,
    isDemoActive,
    fakeDataEnabled,
    deactivateDemo,
    setFakeDataEnabled,
    location.pathname,
  ]);

  return null;
};
