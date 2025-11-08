import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Plus,
  Calendar,
  Users,
  Euro,
  MapPin,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Projects = () => {
  const projects = [
    {
      id: 1,
      name: "Rénovation Maison Martin",
      client: "M. Martin",
      status: "En cours",
      progress: 65,
      budget: "28 000 €",
      location: "Paris 15e",
      startDate: "01/11/2024",
      endDate: "15/12/2024",
      image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400"
    },
    {
      id: 2,
      name: "Extension Garage Dupont",
      client: "Mme. Dupont",
      status: "En attente",
      progress: 30,
      budget: "15 500 €",
      location: "Versailles",
      startDate: "15/11/2024",
      endDate: "22/12/2024",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400"
    },
    {
      id: 3,
      name: "Peinture Bureau Bernard",
      client: "Entreprise Bernard",
      status: "En cours",
      progress: 85,
      budget: "8 200 €",
      location: "Boulogne",
      startDate: "20/10/2024",
      endDate: "10/12/2024",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400"
    },
    {
      id: 4,
      name: "Construction Terrasse Lambert",
      client: "M. Lambert",
      status: "Terminé",
      progress: 100,
      budget: "12 000 €",
      location: "Saint-Cloud",
      startDate: "01/09/2024",
      endDate: "30/10/2024",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400"
    },
    {
      id: 5,
      name: "Rénovation Salle de bain Petit",
      client: "Mme. Petit",
      status: "En cours",
      progress: 45,
      budget: "18 500 €",
      location: "Neuilly",
      startDate: "10/11/2024",
      endDate: "20/12/2024",
      image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400"
    },
    {
      id: 6,
      name: "Installation Cuisine Richard",
      client: "M. Richard",
      status: "Planifié",
      progress: 0,
      budget: "22 000 €",
      location: "Levallois",
      startDate: "05/12/2024",
      endDate: "15/01/2025",
      image: "https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=400"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En cours":
        return "default";
      case "En attente":
        return "secondary";
      case "Terminé":
        return "outline";
      case "Planifié":
        return "secondary";
      default:
        return "default";
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
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Chantiers</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Gérez tous vos chantiers en un seul endroit
              </p>
            </div>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau chantier</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un chantier..." 
                className="pl-10"
              />
            </div>
            <div className="flex gap-3 md:gap-4">
              <Button variant="outline" className="flex-1 sm:flex-none text-sm">Tous les statuts</Button>
              <Button variant="outline" className="flex-1 sm:flex-none text-sm">Trier par date</Button>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={project.image} 
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge variant={getStatusColor(project.status)} className="backdrop-blur-sm">
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {project.client}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {project.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4" />
                          {project.budget}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {project.startDate} - {project.endDate}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium text-foreground">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <Button variant="ghost" className="w-full gap-2 group-hover:bg-primary/10 group-hover:text-primary">
                      Voir les détails
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Projects;
