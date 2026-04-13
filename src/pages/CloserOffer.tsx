/**
 * Présentation commerciale unique : tout le périmètre fonctionnel, sans prix.
 * Routes : /closer/offre (closer), /admin/offre (admin)
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSystemAdmin } from "@/config/admin";
import { cn } from "@/lib/utils";

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Devis & facturation",
    items: [
      "Devis et factures PDF illimités",
      "Bibliothèque de textes et modèles",
      "Signature électronique des devis",
      "Relances automatiques devis et factures",
      "Suivi des paiements et échéanciers",
    ],
  },
  {
    title: "Chantiers & rentabilité",
    items: [
      "Chantiers et suivi de marge en temps réel",
      "Planning des équipes et affectation des ouvriers",
      "Alertes et pilotage du budget chantier",
      "Projets, documents et pièces jointes",
    ],
  },
  {
    title: "Clients & commercial",
    items: [
      "Base clients et historique",
      "Pipeline commercial et conversion",
      "Messagerie intégrée",
      "Rappels et relances personnalisables",
    ],
  },
  {
    title: "RH & équipes",
    items: [
      "Fiches employés, congés et tâches RH",
      "Espace employé et planning personnel",
      "Multi-utilisateurs avec rôles et délégations",
    ],
  },
  {
    title: "Intelligence & pilotage",
    items: [
      "Assistant IA intégré",
      "Analytics et exports",
      "Intégrations (ex. calendrier)",
      "Tableaux de bord dirigeant",
    ],
  },
];

export default function CloserOffer() {
  const navigate = useNavigate();
  const { isCloser, user } = useAuth();
  const backHref = isCloser || isSystemAdmin(user) ? (isCloser ? "/closer/actions" : "/admin/actions") : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-2 rounded-xl shrink-0" onClick={() => navigate(backHref)}>
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Badge variant="secondary" className="text-xs font-medium">
            Offre unique
          </Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">BTP Smart Pro</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Une seule offre : l’ensemble de la plateforme pour piloter votre activité BTP — devis, chantiers,
            équipes et facturation. Le tarif est défini avec vous en fonction de votre structure et de vos besoins.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Essai gratuit sans carte bancaire : l’accès est ouvert pour découvrir l’app ; le règlement se fait via le lien
            de paiement qui vous est communiqué séparément.
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              Tout ce qui est inclus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-2">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">{section.title}</h3>
                <ul className="space-y-2.5">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm sm:text-base leading-snug">
                      <Check className={cn("h-5 w-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5")} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Application mobile · Support selon votre accompagnement · Évolutions produit incluses dans la relation commerciale
        </p>
      </div>
    </div>
  );
}
