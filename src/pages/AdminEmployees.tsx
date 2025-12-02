import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2 } from "lucide-react";

const AdminEmployees = () => {
  const navigate = useNavigate();

  // Rediriger automatiquement vers la vraie page RH Employees
  useEffect(() => {
    navigate("/rh/employees", { replace: true });
  }, [navigate]);

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <GlassCard className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-xl font-semibold mb-2">Redirection...</h3>
          <p className="text-muted-foreground">
            Vous allez être redirigé vers la page de gestion des employés
          </p>
        </GlassCard>
      </div>
    </PageLayout>
  );
};

export default AdminEmployees;


