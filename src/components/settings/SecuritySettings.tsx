import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Loader2, Save, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export const SecuritySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Mots de passe différents",
        description: "Les deux mots de passe doivent être identiques",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre email",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que l'email de confirmation correspond
    if (confirmEmail !== user.email) {
      toast({
        title: "Email incorrect",
        description: "L'email de confirmation doit correspondre à votre email",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Appeler l'edge function pour supprimer le compte
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Vous devez être connecté");
      }

      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email: user.email },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès. Vous allez être déconnecté.",
      });

      // Déconnexion et redirection
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Erreur lors de la suppression du compte:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setConfirmEmail("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Sécurité</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Gérez votre mot de passe et vos paramètres de sécurité
        </p>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {/* Changement de mot de passe */}
          <div className="space-y-4">
            <h3 className="font-semibold">Changer le mot de passe</h3>

            <div className="space-y-2">
              <Label htmlFor="current_password">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 6 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50 pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={changingPassword}
              className="gap-2 rounded-xl"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Informations de session */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <h3 className="font-semibold mb-4">Sessions actives</h3>
          <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Session actuelle : {user?.email}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Connecté depuis {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Supprimer le compte */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-destructive">Zone de danger</h3>
              <p className="text-sm text-muted-foreground mb-4">
                La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées.
              </p>
            </div>
          </div>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Supprimer définitivement mon compte
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <span>
                    Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Vos clients, projets, devis et factures</li>
                  <li>Vos paramètres et préférences</li>
                  <li>Votre historique de messages</li>
                  <li>Toutes vos données associées</li>
                </ul>
                <div className="pt-2">
                  <Label htmlFor="confirm_email" className="text-sm font-medium">
                    Pour confirmer, tapez votre email : <strong>{user?.email}</strong>
                  </Label>
                  <Input
                    id="confirm_email"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Votre email"
                    className="mt-2"
                    disabled={isDeletingAccount}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAccount} className="rounded-xl">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || confirmEmail !== user?.email}
                  className="bg-destructive hover:bg-destructive/90 rounded-xl gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Supprimer définitivement
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </GlassCard>
    </motion.div>
  );
};




















