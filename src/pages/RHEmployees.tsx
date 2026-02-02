/**
 * Page: RHEmployees
 * Description: Page de gestion des employés (redirige vers UsersManagementRBAC)
 * Note: Cette page affiche maintenant les utilisateurs de l'entreprise (company_users)
 */

import { PageLayout } from "@/components/layout/PageLayout";
import { Users } from "lucide-react";
import UsersManagementRBAC from "@/pages/UsersManagementRBAC";

const RHEmployees = () => {
  return (
    <PageLayout
      title="Gestion des Employés"
      subtitle="Gérez vos employés et leurs informations"
      icon={Users}
    >
      <UsersManagementRBAC embedded />
    </PageLayout>
  );
};

export default RHEmployees;
