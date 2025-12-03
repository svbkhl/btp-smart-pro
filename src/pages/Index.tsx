import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Calendar, MessageSquare, Sparkles, CheckCircle, Building2, Brain, Zap, Image, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/hooks/useAuth";
import { ContactForm } from "@/components/ContactForm";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactFormOpen, setContactFormOpen] = useState(false);
  
  // Les sections sont visibles par défaut, puis animées au scroll
  const [heroRef, heroVisible] = useScrollAnimation(0.2);
  const [aiRef, aiVisible] = useScrollAnimation(0.1);
  const [featuresRef, featuresVisible] = useScrollAnimation(0.1);
  const [ctaRef, ctaVisible] = useScrollAnimation(0.2);
  
  // La section hero doit être visible immédiatement
  const [heroInitialized, setHeroInitialized] = useState(false);
  
  useEffect(() => {
    // S'assurer que la section hero est visible au chargement
    setHeroInitialized(true);
  }, []);

  // Si l'utilisateur est connecté, rediriger vers le dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      {/* Particules animées en arrière-plan optimisées pour la performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ contain: 'layout style paint' }}>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)' }} />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-[hsl(320_80%_60%)]/15 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '0.5s' }} />
      </div>

      {/* Navigation avec effet glassmorphism amélioré */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 transition-opacity duration-150 shadow-sm" style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}>
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center transition-all duration-150 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg">
              <span className="text-primary-foreground font-bold text-base sm:text-lg md:text-xl">B</span>
            </div>
            <span className="font-bold text-base sm:text-lg md:text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <Link to="/dashboard" className="group">
            <Button variant="ghost" className="gap-2 text-sm md:text-base hover:scale-105 transition-all duration-200 hover:shadow-lg">
              <span className="hidden sm:inline">Accéder à l'app</span>
              <span className="sm:hidden">App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section avec animations optimisées */}
      <section 
        ref={heroRef}
        className={`pt-20 md:pt-32 pb-12 md:pb-20 px-4 relative overflow-hidden transition-opacity duration-200 ${
          heroInitialized || heroVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: heroInitialized || heroVisible ? 'auto' : 'transform, opacity',
          transform: heroInitialized || heroVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out'
        }}
      >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/8 pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-block px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 rounded-full text-primary font-medium text-xs md:text-sm hover:scale-105 transition-transform cursor-default select-none">
                Nouvelle génération de gestion BTP
                </div>
                <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-[hsl(320_80%_60%)]/10 to-[hsl(320_80%_60%)]/20 rounded-full text-[hsl(320_80%_60%)] font-medium text-xs md:text-sm border border-[hsl(320_80%_60%)]/30 hover:border-[hsl(320_80%_60%)]/50 transition-all hover:scale-105 select-none">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 animate-spin-slow" />
                  Propulsé par l'IA
                </div>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                <span className="inline-block animate-fade-in-up delay-100">
                  Devis, chantiers, clients —
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-gradient-shift inline-block delay-200">
                  tout dans une seule app
                </span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground animate-fade-in-up delay-400">
                L'application complète pour les artisans, TPE et PME du bâtiment. 
                Gérez vos chantiers, suivez vos clients et boostez votre rentabilité grâce à l'IA.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 animate-fade-in-up delay-500">
                <Button 
                  size="lg" 
                  onClick={() => setContactFormOpen(true)}
                  className="gap-2 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 w-full sm:w-auto hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden group"
                >
                  <span className="relative z-10">Demander un essai gratuit</span>
                  <Sparkles className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform relative z-10" />
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Link to="/demo" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 w-full sm:w-auto hover:scale-105 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                  >
                    Voir la démo
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 pt-2 md:pt-4 animate-fade-in-up delay-600">
                <div className="flex items-center gap-2 group">
                  <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm text-muted-foreground">Sans engagement</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm text-muted-foreground">Installation rapide</span>
                </div>
              </div>
            </div>
            
            {/* Hero Image avec effet 3D et animations optimisées */}
            <div className="relative mt-8 lg:mt-0 group" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/20 rounded-2xl md:rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-150" style={{ willChange: 'opacity, filter' }} />
              <div className="relative rounded-2xl md:rounded-3xl shadow-2xl w-full h-auto bg-gradient-to-br from-primary via-primary/80 to-primary aspect-video flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-150" style={{ willChange: 'transform' }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent)]" />
                <div className="text-center space-y-4 p-8 relative z-10">
                  <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform duration-150 animate-float">
                    <Building2 className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Gestion BTP Moderne</h3>
                  <p className="text-white/80 text-sm">Tout votre chantier dans une seule application</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section avec animations optimisées */}
      <section 
        ref={featuresRef}
        className={`py-12 md:py-20 px-4 bg-muted/30 transition-opacity duration-200 ${
          featuresVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: featuresVisible ? 'auto' : 'transform, opacity',
          transform: featuresVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out'
        }}
      >
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-16 px-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground">
              Une solution complète pour gérer votre activité BTP efficacement
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                icon: Calendar,
                title: "Gestion de chantiers",
                description: "Suivez l'avancement en temps réel avec photos et commentaires quotidiens",
                color: "text-primary",
                delay: "delay-100"
              },
              {
                icon: Users,
                title: "Suivi clients",
                description: "Historique complet, devis, factures et espace client dédié",
                color: "text-accent",
                delay: "delay-200"
              },
              {
                icon: BarChart3,
                title: "Analyses & Statistiques IA",
                description: "Tableau de bord intelligent avec CA, rentabilité et conseils personnalisés générés par l'IA pour optimiser vos performances",
                color: "text-primary",
                delay: "delay-300"
              },
              {
                icon: MessageSquare,
                title: "Communication simplifiée",
                description: "Chat intégré et notifications automatiques pour vos clients",
                color: "text-accent",
                delay: "delay-400"
              },
              {
                icon: Sparkles,
                title: "Devis intelligents avec IA",
                description: "Génération automatique de devis professionnels en quelques secondes grâce à l'IA. Analyse intelligente des besoins et tarification optimisée",
                color: "text-[hsl(320_80%_60%)]",
                delay: "delay-500"
              },
              {
                icon: CheckCircle,
                title: "Gestion d'équipe",
                description: "Planning, géolocalisation et suivi du matériel en temps réel",
                color: "text-accent",
                delay: "delay-600"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`bg-card p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl md:rounded-2xl border border-border 
                           hover:shadow-xl transition-all duration-150 
                           hover:-translate-y-2 hover:scale-[1.02]
                           group relative overflow-hidden cursor-pointer
                           select-none
                           before:absolute before:inset-0 before:bg-gradient-to-r 
                           before:from-primary/0 before:via-primary/10 before:to-primary/0
                           before:translate-x-[-100%] hover:before:translate-x-[100%]
                           before:transition-transform before:duration-200
                           ${featuresVisible ? 'animate-scale-in' : 'opacity-0'} ${feature.delay}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-150">
                    <feature.icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} group-hover:scale-110 transition-transform`} />
                </div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {feature.description}
                </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section avec animations optimisées */}
      <section 
        ref={aiRef}
        className={`py-12 md:py-20 px-4 bg-gradient-to-br from-[hsl(320_80%_60%)]/5 via-[hsl(320_80%_60%)]/10 to-[hsl(320_80%_60%)]/5 dark:from-[hsl(320_80%_60%)]/10 dark:via-[hsl(320_80%_60%)]/15 dark:to-[hsl(320_80%_60%)]/10 transition-opacity duration-200 ${
          aiVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: aiVisible ? 'auto' : 'transform, opacity',
          transform: aiVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out'
        }}
      >
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-[hsl(320_80%_60%)] via-[hsl(320_80%_65%)] to-[hsl(320_80%_60%)] rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-10 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-150 animate-gradient-shift select-none">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTEwIDBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative text-center">
              <Sparkles className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-90 animate-spin-slow group-hover:scale-110 transition-transform" />
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 md:mb-4 px-2">
                Gagnez jusqu'à 10 heures par semaine
              </h3>
              <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-2">
                L'IA prend en charge vos tâches répétitives : génération de devis, analyse de photos, 
                conseils personnalisés. Vous vous concentrez sur ce qui compte vraiment : votre métier.
              </p>
              <Link to="/demo">
                <Button 
                  size="lg" 
                  variant="ghost" 
                  className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden group/btn"
                >
                  <span className="relative z-10">Découvrir l'IA en action</span>
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-16 px-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              Des professionnels témoignent
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Découvrez comment des entreprises du BTP optimisent leur gestion quotidienne grâce à des outils modernes comme le nôtre
            </p>
          </div>

          <div className="relative max-w-7xl mx-auto">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {[
                  {
                    name: "Marc Dubois",
                    role: "Artisan carreleur",
                    company: "Carrelage Dubois",
                    review: "La génération de devis par IA me fait gagner un temps fou. J'arrive à répondre aux clients en quelques minutes au lieu de passer une heure sur chaque devis."
                  },
                  {
                    name: "Sophie Martin",
                    role: "Gérante",
                    company: "Martin Électricité",
                    review: "Le planning intégré change tout. Je vois d'un coup d'œil où sont mes équipes et ce qui est prévu pour la semaine. Plus de doublons ni d'oublis."
                  },
                  {
                    name: "Pierre Lefebvre",
                    role: "Chef d'entreprise",
                    company: "Lefebvre Maçonnerie",
                    review: "Le suivi client est beaucoup plus fluide. Tous les échanges et documents sont au même endroit. Mes clients apprécient cette transparence."
                  },
                  {
                    name: "Julie Bernard",
                    role: "Auto-entrepreneur",
                    company: "Peinture Bernard",
                    review: "Simple et efficace. L'analyse d'images par IA m'aide à mieux estimer les surfaces et les besoins en matériaux. Moins d'erreurs dans mes devis."
                  },
                  {
                    name: "Thomas Moreau",
                    role: "Gérant",
                    company: "Moreau Plomberie",
                    review: "Le tableau de bord me donne une vision claire de ma rentabilité. Je peux identifier rapidement les chantiers les plus rentables et ajuster mes tarifs."
                  },
                  {
                    name: "Laure Petit",
                    role: "Directrice",
                    company: "Petit Charpente",
                    review: "La gestion des documents est un vrai gain de temps. Plus besoin de chercher dans mes emails, tout est centralisé. L'interface est intuitive."
                  },
                  {
                    name: "Nicolas Durand",
                    role: "Artisan plâtrier",
                    company: "Durand Enduits",
                    review: "L'assistant IA répond à mes questions pratiques rapidement. Pour les normes ou les techniques, c'est comme avoir un collègue expert disponible 24/7."
                  },
                  {
                    name: "Céline Roux",
                    role: "Chef d'entreprise",
                    company: "Roux Isolation",
                    review: "Depuis que j'utilise le système, j'ai réduit mes erreurs de devis de moitié. La vérification automatique des prix me rassure avant d'envoyer aux clients."
                  },
                  {
                    name: "Fabien Girard",
                    role: "Gérant",
                    company: "Girard Menuiserie",
                    review: "La communication avec les clients est simplifiée. Ils reçoivent leurs devis directement et peuvent suivre l'avancement des travaux. Ça crée de la confiance."
                  },
                  {
                    name: "Sandrine Blanc",
                    role: "Auto-entrepreneur",
                    company: "Blanc Rénovation",
                    review: "Pour une petite structure comme la mienne, c'est parfait. Je gère mes chantiers, mes clients et mes devis sans avoir besoin de plusieurs outils. Très pratique."
                  },
                  {
                    name: "Julien Leroy",
                    role: "Chef d'entreprise",
                    company: "Leroy Couverture",
                    review: "Le planning m'aide à optimiser mes déplacements. Je regroupe les interventions par secteur et ça réduit mes temps de trajet. Économies de carburant en bonus."
                  },
                  {
                    name: "Marie Dubois",
                    role: "Gérante",
                    company: "Dubois Sols & Murs",
                    review: "L'historique complet de chaque client facilite le suivi. Je vois tout ce qu'on a fait ensemble, les devis précédents, les factures. Ça aide pour les devis de maintenance."
                  }
                ].map((testimonial, index) => (
                  <CarouselItem key={index} className="pl-2 sm:pl-3 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="bg-card p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl md:rounded-2xl border border-border hover:shadow-xl transition-all duration-150 hover:-translate-y-1 group h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-primary font-semibold text-lg">
                            {testimonial.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1">{testimonial.name}</h3>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                          <p className="text-xs text-muted-foreground/80">{testimonial.company}</p>
                        </div>
                      </div>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                        "{testimonial.review}"
                      </p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/20 dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-900 shadow-lg" />
              <CarouselNext className="hidden md:flex -right-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/20 dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-900 shadow-lg" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* CTA Section avec animations optimisées */}
      <section 
        ref={ctaRef}
        className={`py-12 md:py-20 px-4 transition-opacity duration-200 ${
          ctaVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          willChange: ctaVisible ? 'auto' : 'transform, opacity',
          transform: ctaVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out'
        }}
      >
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary via-accent to-primary rounded-xl sm:rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-center text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-150 animate-gradient-shift select-none">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTEwIDBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50 group-hover:opacity-60 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 opacity-90 animate-spin-slow group-hover:scale-110 transition-transform" />
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold px-2">
                  Prêt à transformer votre gestion BTP ?
              </h2>
              </div>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 md:mb-8 text-white/90 px-2">
                Rejoignez les centaines d'entreprises qui utilisent déjà l'intelligence artificielle pour optimiser leur productivité
              </p>
              <Link to="/demo">
                <Button 
                  size="lg" 
                  variant="ghost" 
                  className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden group/btn"
                >
                  <span className="relative z-10">Démarrer maintenant</span>
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />
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

      {/* Contact Form Modal */}
      <ContactForm
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        defaultRequestType="essai_gratuit"
      />
    </div>
  );
};

export default Index;
