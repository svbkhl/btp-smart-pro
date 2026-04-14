import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Calendar, MessageSquare, Sparkles, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ContactForm } from "@/components/ContactForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LEGAL_PUBLIC_PATHS, legalAbsoluteUrl } from "@/lib/legalPublicLinks";

// Déclaration de type pour la propriété globale window
declare global {
  interface Window {
    __IS_PASSWORD_RESET_PAGE__?: boolean;
  }
}

type LandingFaqItem = { q: string; a: string };

/** Uniquement les questions 6, 7, 8, 2, 13 — ordre d'affichage prioritaire. */
const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  {
    q: "Pourquoi c'est un paiement unique et pas un abonnement ?",
    a: "L’accès à la plateforme peut être proposé en paiement unique pour la part « logiciel » : vous savez ce que vous payez une fois pour cette composante. En revanche, selon votre dossier, des frais récurrents peuvent s’ajouter — par exemple hébergement, maintenance ou service après-vente (SAV) — au niveau et à la fréquence prévus dans votre proposition commerciale. Rien n’est facturé sans que ce soit écrit noir sur blanc avant engagement.",
  },
  {
    q: "Est-ce que j'aurai les mises à jour futures incluses ?",
    a: "Les correctifs, la sécurité et les évolutions nécessaires au bon fonctionnement du service font partie de notre engagement produit. Les ajouts majeurs ou options très spécifiques peuvent être précisés au moment de votre souscription ; tout ce qui est annoncé comme inclus dans votre offre le reste sans supplément caché.",
  },
  {
    q: "Que se passe-t-il si je ne suis pas satisfait ? Y a-t-il une garantie ?",
    a: "Votre réussite avec l'outil nous importe. En cas de difficulté, contactez-nous : nous privilégions l'accompagnement (prise en main, paramétrage) pour lever le blocage. Les modalités exactes — délai, remboursement ou avoir — sont celles portées sur votre proposition commerciale ou vos conditions générales au moment de l'achat, afin que tout soit transparent avant paiement.",
  },
  {
    q: "Est-ce que c'est difficile à prendre en main ? Je ne suis pas à l'aise avec les logiciels.",
    a: "L'interface est pensée pour le terrain : peu de jargon, parcours guidés, et vous pouvez commencer petit (clients, un premier devis) puis enrichir. L'essai gratuit permet de tester sans pression, et nous pouvons vous aider à démarrer selon l'accompagnement prévu dans votre dossier.",
  },
  {
    q: "Est-ce que BTP Smart Pro est conforme aux normes françaises (TVA, facturation électronique 2026) ?",
    a: "L'application est orientée facturation et devis à la française (TVA, mentions courantes, numérotation). La réglementation évolue — notamment vers la facturation électronique à horizon 2026 — et nous suivons ces évolutions pour adapter le produit. En revanche, la conformité définitive dépend aussi de votre activité, de votre expert-comptable et de la façon dont vous utilisez l'outil : vous restez responsable du respect de vos obligations légales et fiscales.",
  },
];

const Index = () => {
  const [contactFormOpen, setContactFormOpen] = useState(false);
  
  // Vérifier si on doit ouvrir le formulaire d'essai depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openTrialForm') === 'true') {
      setContactFormOpen(true);
      // Nettoyer l'URL pour ne pas réouvrir le formulaire à chaque rechargement
      window.history.replaceState({}, '', '/');
    }
  }, []);
  
  // Les sections sont visibles par défaut, puis animées au scroll
  const [heroRef, heroVisible] = useScrollAnimation(0.2);
  const [aiRef, aiVisible] = useScrollAnimation(0.1);
  const [featuresRef, featuresVisible] = useScrollAnimation(0.1);
  const [faqRef, faqVisible] = useScrollAnimation(0.1);
  const [ctaRef, ctaVisible] = useScrollAnimation(0.2);
  
  // La section hero doit être visible immédiatement
  const [heroInitialized, setHeroInitialized] = useState(false);
  
  useEffect(() => {
    // S'assurer que la section hero est visible au chargement
    setHeroInitialized(true);
  }, []);

  // Ne jamais rediriger automatiquement : la landing reste toujours accessible
  // L'utilisateur clique "Accéder à l'app" pour aller vers l'app (auth, start ou dashboard)

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      {/* Particules animées en arrière-plan optimisées pour la performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ contain: 'layout style paint' }}>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)' }} />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-[hsl(320_80%_60%)]/15 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', transform: 'translateZ(0)', animationDelay: '0.5s' }} />
      </div>

      {/* Navigation — couleurs thème (primary / accent) */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 transition-opacity duration-150 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center transition-all duration-150 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg">
              <span className="text-primary-foreground font-bold text-base sm:text-lg md:text-xl">B</span>
            </div>
            <span className="font-bold text-base sm:text-lg md:text-xl text-foreground">BTP Smart Pro</span>
          </div>
          <Link to="/auth" className="group">
            <Button variant="ghost" className="gap-2 text-sm md:text-base hover:scale-105 transition-all duration-200 hover:shadow-lg text-primary hover:text-primary hover:bg-primary/10">
              <span className="hidden sm:inline">Accéder à l'application</span>
              <span className="sm:hidden">App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero — minimal centré, palette identique au reste du site */}
      <section
        ref={heroRef}
        className={`relative z-10 bg-background pt-24 md:pt-32 pb-16 md:pb-24 px-4 transition-opacity duration-200 ${
          heroInitialized || heroVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          willChange: heroInitialized || heroVisible ? "auto" : "transform, opacity",
          transform: heroInitialized || heroVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        <div className="max-w-3xl mx-auto text-center space-y-8 md:space-y-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
            <Sparkles className="h-4 w-4 text-[hsl(320_80%_60%)] shrink-0" aria-hidden />
            Application professionnelle BTP
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Gérez vos chantiers avec{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              intelligence
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-primary font-medium leading-relaxed flex flex-wrap items-center justify-center gap-x-2 gap-y-2 max-w-2xl mx-auto">
            <a
              href="#features"
              className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary transition-colors"
            >
              Devis &amp; Factures IA automatiques
            </a>
            <span className="text-primary/50 select-none" aria-hidden>
              •
            </span>
            <a
              href="#features"
              className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary transition-colors"
            >
              Gestion de projets
            </a>
            <span className="text-primary/50 select-none" aria-hidden>
              •
            </span>
            <a
              href="#features"
              className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary transition-colors"
            >
              CRM intégré
            </a>
          </p>

          <div className="flex flex-col items-center gap-5">
            <Link to="/auth">
              <Button
                size="lg"
                className="h-auto rounded-xl px-8 py-3.5 text-base md:text-lg font-semibold gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all"
              >
                Accéder à l&apos;application
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setContactFormOpen(true)}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Demander un essai gratuit
              </button>
              <span className="hidden sm:inline text-border">|</span>
              <Link to="/demo" className="underline underline-offset-4 hover:text-foreground transition-colors">
                Voir la démo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section avec animations optimisées */}
      <section
        id="features"
        ref={featuresRef}
        className={`scroll-mt-24 py-12 md:py-20 px-4 transition-opacity duration-200 ${
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
                title: "Facturation automatisée",
                description: "Envoi automatique de devis et factures par email avec liens de signature électronique et de paiement. Simplifiez votre suivi client",
                color: "text-accent",
                delay: "delay-400"
              },
              {
                icon: Sparkles,
                title: "Devis et factures intelligents avec IA",
                description: "Génération automatique de devis et factures professionnels en quelques secondes grâce à l'IA. Analyse intelligente des besoins et tarification optimisée",
                color: "text-[hsl(320_80%_60%)]",
                delay: "delay-500"
              },
              {
                icon: CheckCircle,
                title: "Gestion d'équipe",
                description: "Planning des interventions, suivi des employés et gestion des documents. Organisez vos équipes et suivez l'avancement des chantiers efficacement",
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
        className={`py-12 md:py-20 px-4 transition-opacity duration-200 ${
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
                Gagnez jusqu'à 14 heures par semaine
              </h3>
              <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-2">
                L'IA prend en charge vos tâches répétitives : génération de devis, analyse de photos, 
                conseils personnalisés. Vous vous concentrez sur ce qui compte vraiment : votre métier.
              </p>
              <Button 
                size="lg" 
                variant="ghost" 
                onClick={() => setContactFormOpen(true)}
                className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden group/btn"
              >
                <span className="relative z-10">Découvrir l'IA en action</span>
                <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        ref={faqRef}
        className={`scroll-mt-24 py-12 md:py-20 px-4 transition-opacity duration-200 ${
          faqVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          willChange: faqVisible ? "auto" : "transform, opacity",
          transform: faqVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        }}
      >
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8 sm:mb-10 px-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              Questions fréquentes
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Les réponses aux objections les plus fréquentes avant de vous engager
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full rounded-xl border border-border bg-card px-4 sm:px-6">
            {LANDING_FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`} className="border-border/80">
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-4 sm:py-5 text-[0.95rem] sm:text-base leading-snug">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4 sm:pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
                Essayez la gestion chantier et les outils IA pour fluidifier devis, facturation et suivi client au quotidien.
              </p>
              <Button 
                size="lg" 
                variant="ghost" 
                onClick={() => setContactFormOpen(true)}
                className="gap-2 text-base md:text-lg px-6 md:px-8 hover:scale-105 transition-all duration-200 hover:shadow-xl relative overflow-hidden group/btn"
              >
                <span className="relative z-10">Démarrer maintenant</span>
                <ArrowRight className="w-4 md:w-5 h-4 md:h-5 group-hover/btn:translate-x-1 transition-transform relative z-10" />
                <div className="absolute inset-0 shimmer opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 md:py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground space-y-4">
          <nav
            aria-label="Informations légales"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-wide sm:text-xs"
          >
            <a
              href={legalAbsoluteUrl(LEGAL_PUBLIC_PATHS.confidentialite)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Politique de confidentialité
            </a>
            <span className="hidden text-border sm:inline" aria-hidden>
              |
            </span>
            <a
              href={legalAbsoluteUrl(LEGAL_PUBLIC_PATHS.cookies)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Politique cookies
            </a>
            <span className="hidden text-border sm:inline" aria-hidden>
              |
            </span>
            <a
              href={legalAbsoluteUrl(LEGAL_PUBLIC_PATHS.conditionsGenerales)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Conditions générales
            </a>
          </nav>
          <p className="text-sm md:text-base">&copy; 2026 BTP Smart Pro. Tous droits réservés.</p>
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
