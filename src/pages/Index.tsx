import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Calendar, MessageSquare, Sparkles, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg md:text-xl">B</span>
            </div>
            <span className="font-bold text-lg md:text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <Link to="/dashboard">
            <Button variant="default" className="gap-2 text-sm md:text-base">
              <span className="hidden sm:inline">Accéder à l'app</span>
              <span className="sm:hidden">App</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-12 md:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-4 md:space-y-6 animate-fade-in">
              <div className="inline-block px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 rounded-full text-primary font-medium text-xs md:text-sm">
                Nouvelle génération de gestion BTP
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Devis, chantiers, clients —{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  tout dans une seule app
                </span>
              </h1>
              <p className="text-base md:text-xl text-muted-foreground">
                L'application complète pour les artisans, TPE et PME du bâtiment. 
                Gérez vos chantiers, suivez vos clients et boostez votre rentabilité.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 text-base md:text-lg px-6 md:px-8 w-full">
                    Commencer gratuitement
                    <ArrowRight className="w-4 md:w-5 h-4 md:h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto">
                  Voir la démo
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 pt-2 md:pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-primary" />
                  <span className="text-xs md:text-sm text-muted-foreground">Sans engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-primary" />
                  <span className="text-xs md:text-sm text-muted-foreground">Installation rapide</span>
                </div>
              </div>
            </div>
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl md:rounded-3xl blur-3xl" />
              <img 
                src={heroImage} 
                alt="Chantier moderne avec technologie" 
                className="relative rounded-2xl md:rounded-3xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Une solution complète pour gérer votre activité BTP efficacement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Calendar,
                title: "Gestion de chantiers",
                description: "Suivez l'avancement en temps réel avec photos et commentaires quotidiens",
                color: "text-primary"
              },
              {
                icon: Users,
                title: "Suivi clients",
                description: "Historique complet, devis, factures et espace client dédié",
                color: "text-accent"
              },
              {
                icon: BarChart3,
                title: "Analyses & Statistiques",
                description: "Tableau de bord avec CA, rentabilité et conseils IA",
                color: "text-primary"
              },
              {
                icon: MessageSquare,
                title: "Communication simplifiée",
                description: "Chat intégré et notifications automatiques pour vos clients",
                color: "text-accent"
              },
              {
                icon: Sparkles,
                title: "Devis intelligents",
                description: "Génération automatique de devis avec IA et signature électronique",
                color: "text-primary"
              },
              {
                icon: CheckCircle,
                title: "Gestion d'équipe",
                description: "Planning, géolocalisation et suivi du matériel en temps réel",
                color: "text-accent"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 md:mb-6`}>
                  <feature.icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color}`} />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary to-accent rounded-2xl md:rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTEwIDBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                Prêt à transformer votre gestion BTP ?
              </h2>
              <p className="text-base md:text-xl mb-6 md:mb-8 text-white/90">
                Rejoignez les centaines d'entreprises qui nous font déjà confiance
              </p>
              <Link to="/dashboard">
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8">
                  Démarrer maintenant
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 md:py-8 px-4 bg-muted/30">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="text-sm md:text-base">&copy; 2024 BTP Smart Pro. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
