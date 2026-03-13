/**
 * Page dédiée : uniquement les 4 actions (Démo Patron, Démo Employé, Offres, Nouvelle Entreprise).
 * Ouverte depuis le gros bouton "Choisir une action" sur /closer, sans header ni onglets en dessous.
 * Le clic sur "Nouvelle Entreprise" ouvre le dialog sur cette page (pas de navigation).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useCreateCompany, type Company } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonitorPlay, Eye, Tag, Plus, ArrowRight, ArrowLeft, Loader2, Mail, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const ActionTile = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = "primary",
  active = false,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  color?: "primary" | "orange" | "blue" | "green";
  active?: boolean;
  gradient: string;
}) => {
  const colorMap = {
    primary: { icon: "text-violet-400", border: "border-violet-500/20 hover:border-violet-500/50", glow: "hover:shadow-violet-500/20" },
    orange:  { icon: "text-orange-400", border: "border-orange-500/20 hover:border-orange-500/50", glow: "hover:shadow-orange-500/20" },
    blue:    { icon: "text-blue-400",   border: "border-blue-500/20 hover:border-blue-500/50",   glow: "hover:shadow-blue-500/20" },
    green:   { icon: "text-green-400",  border: "border-green-500/20 hover:border-green-500/50",  glow: "hover:shadow-green-500/20" },
  };
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden",
        "backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1",
        c.border, c.glow,
        active && "ring-2 ring-inset ring-white/20"
      )}
    >
      <div className={cn("absolute inset-0 opacity-80 dark:opacity-60", gradient)} />
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative p-5 sm:p-6 flex flex-col gap-4 min-h-[140px]">
        <div className={cn("w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", c.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-base sm:text-lg text-white leading-tight">{title}</p>
          <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </button>
  );
};

export default function CloserActions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setFakeDataEnabled, fakeDataEnabled, closerEmployeeMode, setCloserEmployeeMode } = useFakeDataStore();
  const createCompany = useCreateCompany();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"create" | "invite">("create");
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [createdCompanyName, setCreatedCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    plan: "basic" as Company["plan"],
    support_level: 0 as Company["support_level"],
    features: {} as Company["features"],
  });

  const handleLancerDemo = (employeeMode: boolean) => {
    setFakeDataEnabled(true);
    setCloserEmployeeMode(employeeMode);
    // Navigation complète pour atterrir à coup sûr sur la démo (évite races SPA / redirect accueil)
    window.location.href = "/demo";
  };

  const handleStopDemo = () => {
    setCloserEmployeeMode(false);
    navigate("/closer");
  };

  const handleNouvelleEntreprise = () => {
    setIsCreateDialogOpen(true);
    setCreateStep("create");
    setCreatedCompanyId(null);
    setCreatedCompanyName("");
    setInviteEmail("");
    setNewCompanyData({ name: "", plan: "basic", support_level: 0, features: {} });
  };

  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) {
      toast({ title: "Erreur", description: "Le nom de l'entreprise est requis", variant: "destructive" });
      return;
    }
    try {
      const company = await createCompany.mutateAsync(newCompanyData);
      toast({ title: "Entreprise créée ✓", description: "Invitez le dirigeant ci-dessous ou fermez pour terminer." });
      setCreatedCompanyId(company?.id ?? null);
      setCreatedCompanyName(newCompanyData.name.trim());
      setCreateStep("invite");
      setInviteEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de créer l'entreprise";
      toast({ title: "Erreur", description: String(msg), variant: "destructive" });
    }
  };

  const handleInviteDirigeant = async () => {
    if (!createdCompanyId || !inviteEmail?.trim() || !inviteEmail.includes("@")) {
      toast({ title: "Erreur", description: "Veuillez entrer un email valide.", variant: "destructive" });
      return;
    }
    setInviteLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({ title: "Erreur", description: "Session expirée. Reconnectez-vous.", variant: "destructive" });
        setInviteLoading(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-company-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ company_id: createdCompanyId, email: inviteEmail.trim().toLowerCase(), role: "owner" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Erreur lors de l'invitation";
        toast({ title: "Erreur", description: String(msg), variant: "destructive" });
        setInviteLoading(false);
        return;
      }
      toast({ title: "Invitation envoyée ✓", description: "Le dirigeant recevra un email pour rejoindre l'entreprise." });
      setInviteEmail("");
      setInviteLoading(false);
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Impossible d'envoyer l'invitation", variant: "destructive" });
      setInviteLoading(false);
    }
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateStep("create");
    setCreatedCompanyId(null);
    setCreatedCompanyName("");
    setInviteEmail("");
    setNewCompanyData({ name: "", plan: "basic", support_level: 0, features: {} });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" className="gap-2 rounded-xl" onClick={() => navigate("/closer")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <ActionTile
            icon={MonitorPlay}
            title="Démo Patron"
            description="Vue dirigeant avec toutes les fonctionnalités et données réalistes."
            onClick={() => (fakeDataEnabled && !closerEmployeeMode) ? handleStopDemo() : handleLancerDemo(false)}
            color="blue"
            active={fakeDataEnabled && !closerEmployeeMode}
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          />
          <ActionTile
            icon={Eye}
            title="Démo Employé"
            description="Vue employé : planning, affectations chantiers et espace personnel."
            onClick={() => (fakeDataEnabled && closerEmployeeMode) ? handleStopDemo() : handleLancerDemo(true)}
            color="green"
            active={fakeDataEnabled && closerEmployeeMode}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-800"
          />
          <ActionTile
            icon={Tag}
            title="Présenter les offres"
            description="Page tarifaire Starter / Pro / Elite à montrer au client en visio."
            onClick={() => navigate("/start?presenter=1")}
            color="orange"
            gradient="bg-gradient-to-br from-orange-500 to-rose-700"
          />
          <ActionTile
            icon={Plus}
            title="Nouvelle Entreprise"
            description="Créer l'espace d'un nouveau client et l'inscrire sur BTP Smart Pro."
            onClick={handleNouvelleEntreprise}
            color="primary"
            gradient="bg-gradient-to-br from-violet-600 to-purple-900"
          />
        </div>
      </div>

      {/* Dialog Nouvelle entreprise + inviter dirigeant (sur cette page, sans naviguer) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); setIsCreateDialogOpen(open); }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          {createStep === "create" ? (
            <>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                <DialogDescription>Renseignez le nom du client pour créer son espace.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="create-company-name">Nom de l'entreprise *</Label>
                  <Input
                    id="create-company-name"
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                    placeholder="Ex: Maçonnerie Dupont"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeCreateDialog} className="rounded-xl">Annuler</Button>
                  <Button onClick={handleCreateCompany} disabled={createCompany.isPending || !newCompanyData.name.trim()} className="gap-2 rounded-xl">
                    {createCompany.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Création...</> : <><Save className="w-4 h-4" />Créer</>}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Inviter le dirigeant</DialogTitle>
                <DialogDescription>
                  Entreprise <strong>{createdCompanyName}</strong> créée. Envoyez l&apos;invitation au dirigeant (il pourra s&apos;inscrire et gérer l&apos;abonnement).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="invite-email-actions">Email du dirigeant *</Label>
                  <Input
                    id="invite-email-actions"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="dirigeant@exemple.fr"
                    onKeyDown={(e) => e.key === "Enter" && handleInviteDirigeant()}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeCreateDialog} className="rounded-xl">Terminer</Button>
                  <Button onClick={handleInviteDirigeant} disabled={inviteLoading || !inviteEmail.trim()} className="gap-2 rounded-xl">
                    {inviteLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <><Mail className="w-4 h-4" />Envoyer l&apos;invitation</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
