import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, FolderKanban } from "lucide-react";
import StatsCard from "@/components/StatsCard";

const Stats = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Statistiques</h1>
          <p className="text-muted-foreground text-sm md:text-base">Analyse de vos performances</p>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          <StatsCard
            title="Chiffre d'affaires"
            value="245 000 €"
            trend="+12% ce mois"
            trendUp={true}
            icon={TrendingUp}
          />
          <StatsCard
            title="Projets actifs"
            value="8"
            trend="3 en cours"
            icon={FolderKanban}
          />
          <StatsCard
            title="Clients"
            value="24"
            trend="+4 ce mois"
            trendUp={true}
            icon={Users}
          />
          <StatsCard
            title="Taux de réussite"
            value="94%"
            trend="+2% ce mois"
            trendUp={true}
            icon={BarChart3}
          />
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Évolution mensuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Graphique à venir...</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projets par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Graphique à venir...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Stats;
