/**
 * Pages légales BTP Smart Pro : RGPD, Mentions légales, Conditions générales (un seul onglet)
 */

import { GlassCard } from "@/components/ui/GlassCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const sectionClass = "text-sm text-muted-foreground space-y-4 leading-relaxed";

export function LegalPagesContent() {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
          <div className="space-y-10">
            {/* 1. RGPD */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Politique de confidentialité (RGPD)</h2>
              <div className={sectionClass}>
                <p><strong>Éditeur :</strong> BTP Smart Pro</p>
                <p>
                  BTP Smart Pro s’engage à protéger vos données personnelles conformément au Règlement général sur la protection des données (RGPD) et à la loi « Informatique et Libertés ».
                </p>
                <h3 className="font-semibold text-foreground mt-4">1. Données collectées</h3>
                <p>
                  Nous collectons les données nécessaires au fonctionnement du service : identité (nom, prénom, email), données de l’entreprise (raison sociale, SIRET, adresse), et données relatives aux devis, factures et échanges avec vos clients.
                </p>
                <h3 className="font-semibold text-foreground mt-4">2. Finalités</h3>
                <p>
                  Les données sont utilisées pour la gestion de votre compte, la génération de devis et factures, l’envoi d’emails, la sauvegarde de vos préférences et l’amélioration du service.
                </p>
                <h3 className="font-semibold text-foreground mt-4">3. Base légale</h3>
                <p>
                  Le traitement repose sur l’exécution du contrat (utilisation du service), votre consentement lorsque requis, et nos intérêts légitimes (sécurité, support, évolution du produit).
                </p>
                <h3 className="font-semibold text-foreground mt-4">4. Durée de conservation</h3>
                <p>
                  Les données sont conservées pendant la durée d’utilisation du compte puis pendant la durée des obligations légales (comptabilité, litiges). Vous pouvez demander l’effacement de vos données dans les limites prévues par la loi.
                </p>
                <h3 className="font-semibold text-foreground mt-4">5. Vos droits</h3>
                <p>
                  Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation du traitement, de portabilité et d’opposition. Pour les exercer : contact@btpsmartpro.com. Vous pouvez introduire une réclamation auprès de la CNIL.
                </p>
                <h3 className="font-semibold text-foreground mt-4">6. Sécurité</h3>
                <p>
                  Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données (accès sécurisé, hébergement conforme, sauvegardes).
                </p>
              </div>
            </section>

            {/* 2. Mentions légales */}
            <section className="pt-6 border-t border-border/50">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Mentions légales</h2>
              <div className={sectionClass}>
                <p><strong>Éditeur du site et du service :</strong> BTP Smart Pro</p>
                <p>
                  Ces mentions légales s’appliquent au site et à l’application BTP Smart Pro.
                </p>
                <h3 className="font-semibold text-foreground mt-4">Hébergement</h3>
                <p>
                  L’application et les données sont hébergées par des prestataires assurant une disponibilité et une sécurité conformes aux exigences en vigueur. Pour toute information sur l’hébergeur, contactez-nous.
                </p>
                <h3 className="font-semibold text-foreground mt-4">Propriété intellectuelle</h3>
                <p>
                  L’ensemble des contenus (textes, interfaces, logos, logiciels) relatifs à BTP Smart Pro est protégé par le droit d’auteur et le droit des marques. Toute reproduction ou utilisation non autorisée peut constituer une contrefaçon.
                </p>
                <h3 className="font-semibold text-foreground mt-4">Limitation de responsabilité</h3>
                <p>
                  BTP Smart Pro s’efforce d’assurer la disponibilité et l’exactitude du service. Nous ne pouvons toutefois pas être tenus responsables des dommages indirects ou des interruptions de service dues à des cas de force majeure ou à des tiers.
                </p>
                <h3 className="font-semibold text-foreground mt-4">Contact</h3>
                <p>
                  Pour toute question relative aux mentions légales : contact@btpsmartpro.com
                </p>
              </div>
            </section>

            {/* 3. CGU */}
            <section className="pt-6 border-t border-border/50">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Conditions générales d’utilisation (CGU)</h2>
              <div className={sectionClass}>
                <p>
                  Les présentes conditions régissent l’utilisation du service BTP Smart Pro. En utilisant le service, vous acceptez ces conditions.
                </p>
                <h3 className="font-semibold text-foreground mt-4">1. Objet</h3>
                <p>
                  BTP Smart Pro est une solution de gestion pour les professionnels du BTP (devis, factures, clients, planning, messagerie). L’accès au service est soumis à l’acceptation des présentes CGU et à la souscription d’un abonnement le cas échéant.
                </p>
                <h3 className="font-semibold text-foreground mt-4">2. Compte et responsabilité</h3>
                <p>
                  Vous êtes responsable de la confidentialité de vos identifiants et des données que vous saisissez. Vous vous engagez à fournir des informations exactes et à ne pas utiliser le service à des fins illicites.
                </p>
                <h3 className="font-semibold text-foreground mt-4">3. Disponibilité</h3>
                <p>
                  Nous nous efforçons d’assurer un service disponible et performant. Des opérations de maintenance peuvent entraîner des indisponibilités temporaires, annoncées lorsque cela est possible.
                </p>
                <h3 className="font-semibold text-foreground mt-4">4. Données et propriété</h3>
                <p>
                  Vous restez propriétaire de vos données. BTP Smart Pro les traite uniquement pour fournir le service et conformément à sa politique de confidentialité (RGPD).
                </p>
                <h3 className="font-semibold text-foreground mt-4">5. Résiliation</h3>
                <p>
                  Vous pouvez résilier votre compte à tout moment. En cas de manquement aux présentes conditions, BTP Smart Pro se réserve le droit de suspendre ou résilier l’accès au service.
                </p>
                <h3 className="font-semibold text-foreground mt-4">6. Évolution et contact</h3>
                <p>
                  BTP Smart Pro peut faire évoluer les présentes CGU. Les utilisateurs seront informés des changements substantiels. Pour toute question : contact@btpsmartpro.com
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  );
}
