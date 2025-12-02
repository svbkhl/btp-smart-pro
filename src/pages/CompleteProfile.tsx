import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const CompleteProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [statut, setStatut] = useState<"dirigeant" | "salarie" | "administrateur">("dirigeant");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nom, prenom, statut },
      });

      if (error) throw error;

      toast({
        title: "Profil complété",
        description: "Votre profil a été mis à jour avec succès.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <GlassCard className="p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Compléter votre profil</h1>
          <p className="text-muted-foreground mb-6">
            Veuillez compléter vos informations pour continuer
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
              />
            </div>
            <div>
              <Label htmlFor="statut">Statut *</Label>
              <Select
                value={statut}
                onValueChange={(value) => setStatut(value as any)}
                required
              >
                <SelectTrigger id="statut" className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50">
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dirigeant">Dirigeant</SelectItem>
                  <SelectItem value="salarie">Salarié</SelectItem>
                  <SelectItem value="administrateur">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "Enregistrement..." : "Continuer"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </PageLayout>
  );
};

export default CompleteProfile;
