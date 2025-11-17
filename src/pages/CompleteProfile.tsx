import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type UserRole = "dirigeant" | "salarie" | "administrateur";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [statut, setStatut] = useState<UserRole>("dirigeant");
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        navigate("/auth");
        return;
      }

      setCurrentUser(data.user);
      const metadata = data.user.user_metadata || {};

      // Si les informations sont déjà complètes, rediriger directement
      if (metadata.nom && metadata.prenom && metadata.statut) {
        navigate("/dashboard");
        return;
      }

      setNom(metadata.nom ?? "");
      setPrenom(metadata.prenom ?? "");
      setStatut((metadata.statut as UserRole) ?? "dirigeant");
      setLoadingUser(false);
    };

    fetchUser();
  }, [navigate]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!nom || !prenom || !statut) {
      toast({
        title: "Champs requis",
        description: "Merci de renseigner nom, prénom et statut.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setSaving(true);

    try {
      const fullName = `${prenom} ${nom}`.trim();

      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          nom,
          prenom,
          statut,
          full_name: fullName,
        },
      });

      if (userUpdateError) {
        throw userUpdateError;
      }

      const profilePayload = {
        id: currentUser.id,
        email: currentUser.email,
        nom,
        prenom,
        statut,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);

      if (profileError) {
        // Si la table profiles n'existe pas, essayer les employés
        await supabase.from("employees").upsert({
          user_id: currentUser.id,
          nom,
          prenom,
          poste: statut === "dirigeant" ? "Dirigeant" : statut === "administrateur" ? "Administrateur" : "Salarié",
          updated_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Informations enregistrées",
        description: "Votre profil est complet. Bon retour !",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erreur lors de l'enregistrement",
        description: error.message || "Impossible d'enregistrer vos informations.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Complétez votre profil</h1>
          <p className="text-muted-foreground">
            Après une connexion Google ou Apple, nous avons besoin de quelques informations supplémentaires.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations obligatoires</CardTitle>
            <CardDescription>Ces informations apparaîtront dans vos documents et plannings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complete-prenom">Prénom *</Label>
                  <Input
                    id="complete-prenom"
                    value={prenom}
                    onChange={(event) => setPrenom(event.target.value)}
                    placeholder="Jean"
                    disabled={saving}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complete-nom">Nom *</Label>
                  <Input
                    id="complete-nom"
                    value={nom}
                    onChange={(event) => setNom(event.target.value)}
                    placeholder="Dupont"
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complete-statut">Statut *</Label>
                <Select value={statut} onValueChange={(value: UserRole) => setStatut(value)} disabled={saving}>
                  <SelectTrigger id="complete-statut">
                    <SelectValue placeholder="Sélectionnez votre statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dirigeant">Dirigeant</SelectItem>
                    <SelectItem value="salarie">Salarié</SelectItem>
                    <SelectItem value="administrateur">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/auth");
                  }}
                  disabled={saving}
                >
                  Changer de compte
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer et continuer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;


