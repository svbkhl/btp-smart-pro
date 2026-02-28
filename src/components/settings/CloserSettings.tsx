import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClosers, useAddCloser, useRemoveCloser } from "@/hooks/useClosers";
import { useAuth } from "@/hooks/useAuth";
import {
  UserCog,
  Plus,
  Trash2,
  Loader2,
  MonitorPlay,
  Building2,
  ShieldCheck,
} from "lucide-react";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const CloserSettings = () => {
  const { user } = useAuth();
  const { data: closers = [], isLoading } = useClosers();
  const addCloser = useAddCloser();
  const removeCloser = useRemoveCloser();
  const [newEmail, setNewEmail] = useState("");

  const handleAdd = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    if (closers.some((c) => c.email === trimmed)) return;
    addCloser.mutate({ email: trimmed, addedBy: user?.email || "admin" });
    setNewEmail("");
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <UserCog className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Gestion des Closers</h3>
            <p className="text-sm text-muted-foreground">
              Les closers ont accès à la création d'entreprises, l'invitation de dirigeants et la démo complète.
            </p>
          </div>
        </div>

        {/* Capacités */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: MonitorPlay, label: "Démo patron + employé", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: Building2, label: "Créer des entreprises", color: "text-green-500", bg: "bg-green-500/10" },
            { icon: ShieldCheck, label: "Inviter des dirigeants", color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 p-3 rounded-xl ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Ajouter un closer */}
      <GlassCard className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Ajouter un closer
        </h4>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@exemple.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-transparent backdrop-blur-xl border-white/20 dark:border-white/10"
          />
          <Button
            onClick={handleAdd}
            disabled={addCloser.isPending || !newEmail.trim()}
            className="gap-2 rounded-xl"
          >
            {addCloser.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Ajouter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          La personne doit créer un compte avec cet email sur BTP Smart Pro pour accéder à l'espace closer.
        </p>
      </GlassCard>

      {/* Liste des closers */}
      <GlassCard className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-primary" />
          Closers actifs
          <Badge variant="secondary" className="ml-1">{closers.length}</Badge>
        </h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : closers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCog className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun closer configuré</p>
          </div>
        ) : (
          <div className="space-y-2">
            {closers.map((closer) => (
              <div
                key={closer.email}
                className="flex items-center justify-between p-4 rounded-xl bg-transparent backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <UserCog className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{closer.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {closer.added_by && (
                          <span className="text-xs text-muted-foreground">
                            Ajouté par {closer.added_by}
                          </span>
                        )}
                        {closer.created_at && (
                          <span className="text-xs text-muted-foreground">
                            · {format(new Date(closer.created_at), "d MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retirer l'accès closer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Voulez-vous retirer l'accès closer à <strong>{closer.email}</strong> ?
                        Cette personne n'aura plus accès à l'espace closer ni à la démo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeCloser.mutate(closer.email)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {removeCloser.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Retirer l'accès"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
