import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const CloserProfileSetup = () => {
  const { user, isCloser } = useAuth();
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isCloser) return;
    // Afficher le modal si le closer n'a pas encore défini son nom
    const meta = user.user_metadata || {};
    const hasName = meta.full_name || meta.first_name || meta.prenom || meta.nom;
    if (!hasName) {
      setOpen(true);
    }
  }, [user, isCloser]);

  const handleSubmit = async () => {
    if (!prenom.trim() || !nom.trim()) {
      toast({ title: "Champs requis", description: "Veuillez renseigner votre prénom et votre nom.", variant: "destructive" });
      return;
    }
    if (password && password.length < 8) {
      toast({ title: "Mot de passe trop court", description: "Le mot de passe doit contenir au moins 8 caractères.", variant: "destructive" });
      return;
    }
    if (password && password !== confirmPassword) {
      toast({ title: "Mots de passe différents", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const updates: Record<string, any> = {
        data: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          full_name: `${prenom.trim()} ${nom.trim()}`,
          first_name: prenom.trim(),
        },
      };
      if (password) {
        updates.password = password;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      toast({ title: "Profil enregistré", description: `Bienvenue, ${prenom} ! Votre espace closer est prêt.` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible d'enregistrer le profil.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md mx-4 sm:mx-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-orange-500/10 rounded-xl">
              <UserCog className="w-5 h-5 text-orange-500" />
            </div>
            <DialogTitle className="text-lg">Bienvenue sur votre espace Closer</DialogTitle>
          </div>
          <DialogDescription>
            Complétez votre profil pour accéder à toutes les fonctionnalités.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                placeholder="Jean"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                placeholder="Dupont"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Nouveau mot de passe
              <span className="text-muted-foreground text-xs ml-1">(optionnel)</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {password && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || !prenom.trim() || !nom.trim()}
            className="w-full gap-2 rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Accéder à mon espace"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
