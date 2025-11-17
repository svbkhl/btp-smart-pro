import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Calendar, MessageSquare, Sparkles, CheckCircle, Building2, Brain, Zap, Image, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Index = () => {
  const [heroRef, heroVisible] = useScrollAnimation(0.2);
  const [aiRef, aiVisible] = useScrollAnimation(0.1);
  const [featuresRef, featuresVisible] = useScrollAnimation(0.1);
  const [ctaRef, ctaVisible] = useScrollAnimation(0.2);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
      {/* Particules animées en arrière-plan avec nouvelles couleurs vibrantes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/25 rounded-full blur-3xl animate-pulse animate-pulse-glow" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-accent/25 rounded-full blur-3xl animate-pulse delay-500 animate-pulse-glow-accent" />
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse delay-300" />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-primary/15 rounded-full blur-3xl animate-pulse delay-200" />
        <div className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-[hsl(320_80%_60%)]/15 rounded-full blur-3xl animate-pulse delay-400" />
      </div>

      {/* Navigation avec effet glassmorphism amélioré */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-sm will-change-transform">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg">
              <span className="text-primary-foreground font-bold text-lg md:text-xl">B</span>
            </div>
            <span className="font-bold text-lg md:text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <Link to="/dashboard" className="group">
            <Button variant="default" className="gap-2 text-sm md:text-base hover:scale-105 transition-all duration-200 hover:shadow-lg">
              <span className="hidden sm:inline">Accéder à l'app</span>
              <span className="sm:hidden">App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section avec animations */}
      <section 
        ref={heroRef}
        className={`pt-20 md:pt-32 pb-12 md:pb-20 px-4 relative overflow-hidden transition-all duration-1000 will-change-transform ${
          heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
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
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                <span className="inline-block animate-fade-in-up delay-100">
                  Devis, chantiers, clients —
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-gradient-shift inline-block delay-200">
                  tout dans une seule app
                </span>
                <br />
                <span className="bg-gradient-to-r from-[hsl(320_80%_60%)] to-[hsl(320_80%_65%)] bg-clip-text text-transparent animate-gradient-shift inline-block delay-300">
                  avec l'intelligence artificielle
                </span>
              </h1>
              
              <p className="text-base md:text-xl text-muted-foreground animate-fade-in-up delay-400">
                L'application complète pour les artisans, TPE et PME du bâtiment. 
                Gérez vos chantiers, suivez vos clients et boostez votre rentabilité grâce à l'IA.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 animate-fade-in-up delay-500">
                <Link to="/dashboard" className="w-full sm:w-auto group">
                  <Button size="lg" className="gap-2 text-base md:text-lg px-6 md:px-8 w-full hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden">
                    <span className="relative z-10">Commencer maintenant</span>
                    <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
                <Link to="/demo" className="w-full sm:w-auto group">
                  <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto hover:scale-105 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5">
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
            
            {/* Hero Image avec effet 3D et animations */}
            <div className="relative mt-8 lg:mt-0 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/20 rounded-2xl md:rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-500 animate-pulse-glow" />
              <div className="relative rounded-2xl md:rounded-3xl shadow-2xl w-full h-auto bg-gradient-to-br from-primary via-primary/80 to-primary aspect-video flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-500 animate-gradient-shift">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent)]" />
                <div className="text-center space-y-4 p-8 relative z-10">
                  <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform duration-500 animate-float">
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

      {/* AI Features Section avec animations staggerées */}
      <section 
        ref={aiRef}
        className={`py-12 md:py-20 px-4 bg-gradient-to-br from-[hsl(320_80%_60%)]/5 via-[hsl(320_80%_60%)]/10 to-[hsl(320_80%_60%)]/5 dark:from-[hsl(320_80%_60%)]/10 dark:via-[hsl(320_80%_60%)]/15 dark:to-[hsl(320_80%_60%)]/10 transition-all duration-1000 ${
          aiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[hsl(320_80%_60%)]/10 to-[hsl(320_80%_60%)]/20 rounded-full mb-4 border border-[hsl(320_80%_60%)]/30 hover:scale-105 transition-transform hover:border-[hsl(320_80%_60%)]/50 select-none">
              <Sparkles className="w-5 h-5 text-[hsl(320_80%_60%)] animate-spin-slow" />
              <span className="text-sm md:text-base font-semibold text-[hsl(320_80%_60%)]">Intelligence Artificielle</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              L'IA au service de votre productivité
            </h2>
            <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Automatisez vos tâches répétitives et prenez des décisions éclairées grâce à nos fonctionnalités IA avancées
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12">
            {[
              {
                icon: Brain,
                title: "Assistant IA",
                description: "Posez vos questions et obtenez des conseils personnalisés pour optimiser vos chantiers et votre rentabilité",
                color: "text-[hsl(320_80%_60%)]",
                bgColor: "bg-[hsl(320_80%_60%)]/10",
                delay: "delay-100"
              },
              {
                icon: Zap,
                title: "Devis IA",
                description: "Générez automatiquement des devis professionnels en quelques secondes à partir d'une simple description",
                color: "text-[hsl(320_80%_60%)]",
                bgColor: "bg-[hsl(320_80%_60%)]/10",
                delay: "delay-200"
              },
              {
                icon: Image,
                title: "Analyse d'images",
                description: "Analysez vos photos de chantier pour détecter les problèmes, estimer les coûts et suivre l'avancement",
                color: "text-[hsl(320_80%_60%)]",
                bgColor: "bg-[hsl(320_80%_60%)]/10",
                delay: "delay-300"
              },
              {
                icon: Bell,
                title: "Rappels intelligents",
                description: "Recevez des alertes automatiques pour la maintenance préventive et les échéances importantes",
                color: "text-[hsl(320_80%_60%)]",
                bgColor: "bg-[hsl(320_80%_60%)]/10",
                delay: "delay-400"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`bg-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border 
                           hover:shadow-2xl transition-all duration-500 
                           hover:-translate-y-2 hover:scale-[1.02]
                           group relative overflow-hidden cursor-pointer
                           select-none
                           before:absolute before:inset-0 before:bg-gradient-to-r 
                           before:from-primary/0 before:via-primary/10 before:to-primary/0
                           before:translate-x-[-100%] hover:before:translate-x-[100%]
                           before:transition-transform before:duration-700
                           ${aiVisible ? 'animate-scale-in' : 'opacity-0'} ${feature.delay}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(320_80%_60%)]/5 to-[hsl(320_80%_60%)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${feature.bgColor} flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <feature.icon className={`w-7 h-7 md:w-8 md:h-8 ${feature.color} group-hover:scale-110 transition-transform`} />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3 group-hover:text-[hsl(320_80%_60%)] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[hsl(320_80%_60%)] via-[hsl(320_80%_65%)] to-[hsl(320_80%_60%)] rounded-2xl md:rounded-3xl p-6 md:p-10 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 animate-gradient-shift select-none">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTEwIDBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative text-center">
              <Sparkles className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-90 animate-spin-slow group-hover:scale-110 transition-transform" />
              <h3 className="text-xl md:text-3xl font-bold mb-3 md:mb-4">
                Gagnez jusqu'à 10 heures par semaine
              </h3>
              <p className="text-base md:text-lg mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto">
                L'IA prend en charge vos tâches répétitives : génération de devis, analyse de photos, 
                conseils personnalisés. Vous vous concentrez sur ce qui compte vraiment : votre métier.
              </p>
              <Link to="/demo" className="inline-block group/btn">
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden">
                  <span className="relative z-10">Découvrir l'IA en action</span>
                  <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section avec animations */}
      <section 
        ref={featuresRef}
        className={`py-12 md:py-20 px-4 bg-muted/30 transition-all duration-1000 ${
          featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
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
                className={`bg-card p-6 md:p-8 rounded-xl md:rounded-2xl border border-border 
                           hover:shadow-xl transition-all duration-500 
                           hover:-translate-y-2 hover:scale-[1.02]
                           group relative overflow-hidden cursor-pointer
                           select-none
                           before:absolute before:inset-0 before:bg-gradient-to-r 
                           before:from-primary/0 before:via-primary/10 before:to-primary/0
                           before:translate-x-[-100%] hover:before:translate-x-[100%]
                           before:transition-transform before:duration-700
                           ${featuresVisible ? 'animate-scale-in' : 'opacity-0'} ${feature.delay}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
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

      {/* CTA Section avec animations */}
      <section 
        ref={ctaRef}
        className={`py-12 md:py-20 px-4 transition-all duration-1000 ${
          ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary via-accent to-primary rounded-2xl md:rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 animate-gradient-shift select-none">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTEwIDBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50 group-hover:opacity-60 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 opacity-90 animate-spin-slow group-hover:scale-110 transition-transform" />
                <h2 className="text-2xl md:text-4xl font-bold">
                  Prêt à transformer votre gestion BTP avec l'IA ?
              </h2>
              </div>
              <p className="text-base md:text-xl mb-6 md:mb-8 text-white/90">
                Rejoignez les centaines d'entreprises qui utilisent déjà l'intelligence artificielle pour optimiser leur productivité
              </p>
              <Link to="/demo" className="inline-block group/btn">
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden">
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
    </div>
  );
};

export default Index;
