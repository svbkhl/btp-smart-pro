import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId, setCurrentCompanyId, getUserCompanies } from "@/hooks/useCompanyId";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CompanySelector = () => {
  const { user } = useAuth();
  const { companyId: currentCompany } = useCompanyId();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadCompanies = async () => {
      const userCompanies = await getUserCompanies(user.id);
      setCompanies(userCompanies);
      setLoading(false);
    };

    loadCompanies();
  }, [user?.id]);

  const handleCompanyChange = async (companyId: string) => {
    if (!user) return;

    // Mettre à jour le company_id sélectionné
    setCurrentCompanyId(user.id, companyId);

    // Invalider tous les caches pour forcer un rechargement
    queryClient.clear();

    // Recharger la page pour s'assurer que tout est rafraîchi
    window.location.reload();
  };

  // Ne rien afficher si l'utilisateur n'appartient qu'à une seule entreprise
  if (loading || companies.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/50 backdrop-blur-sm">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Entreprise :</span>
      <Select value={currentCompany || undefined} onValueChange={handleCompanyChange}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="Sélectionner une entreprise" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
