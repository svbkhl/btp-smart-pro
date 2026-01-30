import { useState, useEffect } from "react";
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
  
  // Vérifier si le profil est déjà complété et rediriger si c'est le cas
  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata || {};
      const isProfileComplete = metadata.nom && metadata.prenom && metadata.statut;
      
      if (isProfileComplete) {
        // Le profil est déjà complété, rediriger vers le dashboard
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate]);
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [statut, setStatut] = useState<"admin" | "member">("member");
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);

  // Vérifier si l'utilisateur est owner dans company_users
  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!user?.id) {
        setCheckingOwner(false);
        return;
      }

      try {
        // Vérifier si l'utilisateur a un rôle owner dans company_users
        const { data, error } = await supabase
          .from('company_users')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Erreur lors de la vérification du rôle owner:', error);
        }

        if (data) {
          setIsOwner(true);
          setStatut('admin'); // Pour les owners, utiliser "admin" qui correspond à "dirigeant"
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle owner:', error);
      } finally {
        setCheckingOwner(false);
      }
    };

    checkOwnerStatus();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Pour les owners, forcer le statut à "admin" (dirigeant)
      const finalStatut = isOwner ? 'admin' : statut;
      
      const { error } = await supabase.auth.updateUser({
        data: { nom, prenom, statut: finalStatut },
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
            {!isOwner && (
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
                    <SelectItem value="member">Membre</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isOwner && (
              <div>
                <Label htmlFor="statut">Statut *</Label>
                <Input
                  id="statut"
                  value="Dirigeant"
                  disabled
                  className="bg-muted/50 dark:bg-gray-800/50 backdrop-blur-xl border-border/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Votre statut de dirigeant a été assigné automatiquement
                </p>
              </div>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={loading || checkingOwner}>
              {loading ? "Enregistrement..." : checkingOwner ? "Vérification..." : "Continuer"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </PageLayout>
  );
};

export default CompleteProfile;
