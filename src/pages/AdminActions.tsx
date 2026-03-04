/**
 * Page des 4 actions Admin : Démo Dirigeant, Démo Employé, Créer entreprise, Présenter l'offre.
 * Ouverte depuis le gros bouton sur /admin.
 */
import { useNavigate } from "react-router-dom";
import { useFakeDataStore } from "@/store/useFakeDataStore";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Eye, Tag, Plus, ArrowRight, ArrowLeft } from "lucide-react";
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

export default function AdminActions() {
  const navigate = useNavigate();
  const { setFakeDataEnabled, fakeDataEnabled, closerEmployeeMode, setCloserEmployeeMode } = useFakeDataStore();

  const handleLancerDemo = (employeeMode: boolean) => {
    setFakeDataEnabled(true);
    setCloserEmployeeMode(employeeMode);
    navigate("/dashboard");
  };

  const handleStopDemo = () => {
    setCloserEmployeeMode(false);
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" className="gap-2 rounded-xl" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <ActionTile
            icon={MonitorPlay}
            title="Démo Dirigeant"
            description="Vue patron avec toutes les fonctionnalités et données réalistes."
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
            icon={Plus}
            title="Créer une entreprise"
            description="Créer l'espace d'un nouveau client et inviter le dirigeant."
            onClick={() => navigate("/admin", { state: { openCreate: true } })}
            color="primary"
            gradient="bg-gradient-to-br from-violet-600 to-purple-900"
          />
          <ActionTile
            icon={Tag}
            title="Présenter l'offre"
            description="Page tarifaire Starter / Pro / Elite à montrer au client en visio."
            onClick={() => navigate("/start?presenter=1")}
            color="orange"
            gradient="bg-gradient-to-br from-orange-500 to-rose-700"
          />
        </div>
      </div>
    </div>
  );
}
