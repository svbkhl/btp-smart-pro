import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  Euro
} from "lucide-react";

const Clients = () => {
  const clients = [
    {
      id: 1,
      name: "M. Martin",
      email: "martin@email.com",
      phone: "06 12 34 56 78",
      location: "Paris 15e",
      projects: 2,
      totalSpent: "45 000 €",
      status: "Actif",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Martin"
    },
    {
      id: 2,
      name: "Mme. Dupont",
      email: "dupont@email.com",
      phone: "06 23 45 67 89",
      location: "Versailles",
      projects: 1,
      totalSpent: "15 500 €",
      status: "Actif",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dupont"
    },
    {
      id: 3,
      name: "Entreprise Bernard",
      email: "contact@bernard.fr",
      phone: "01 23 45 67 89",
      location: "Boulogne",
      projects: 3,
      totalSpent: "82 000 €",
      status: "VIP",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bernard"
    },
    {
      id: 4,
      name: "M. Lambert",
      email: "lambert@email.com",
      phone: "06 34 56 78 90",
      location: "Saint-Cloud",
      projects: 1,
      totalSpent: "12 000 €",
      status: "Terminé",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lambert"
    },
    {
      id: 5,
      name: "Mme. Petit",
      email: "petit@email.com",
      phone: "06 45 67 89 01",
      location: "Neuilly",
      projects: 1,
      totalSpent: "18 500 €",
      status: "Actif",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Petit"
    },
    {
      id: 6,
      name: "M. Richard",
      email: "richard@email.com",
      phone: "06 56 78 90 12",
      location: "Levallois",
      projects: 1,
      totalSpent: "22 000 €",
      status: "Planifié",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Richard"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Actif":
        return "default";
      case "VIP":
        return "default";
      case "Terminé":
        return "secondary";
      case "Planifié":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clients</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Gérez votre portefeuille clients
              </p>
            </div>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau client</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un client..." 
                  className="pl-10"
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold text-foreground">{clients.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={client.avatar}
                        alt={client.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-foreground">{client.name}</h3>
                        <Badge variant={getStatusColor(client.status)} className="mt-1">
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {client.location}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <FolderKanban className="w-3 h-3" />
                          Chantiers
                        </div>
                        <p className="font-semibold text-foreground">{client.projects}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Euro className="w-3 h-3" />
                          Total dépensé
                        </div>
                        <p className="font-semibold text-foreground">{client.totalSpent}</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4">
                    Voir le profil
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Clients;
