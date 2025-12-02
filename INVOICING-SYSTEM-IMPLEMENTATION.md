# Système de Facturation et Paiement - Récapitulatif d'Implémentation

## ✅ Ce qui a été fait

### 1. Base de données (Supabase)
- ✅ **Table `invoices`** : Structure complète pour les factures
  - Numérotation automatique YEAR-XXXX (ex: 2025-0001)
  - Gestion des clients, devis associés
  - Champs pour signature et paiement Stripe
  - Statuts : draft, sent, signed, paid, cancelled
  
- ✅ **Table `invoice_counters`** : Compteurs par année pour la numérotation automatique

- ✅ **Table `payments`** : Historique des paiements Stripe
  - Support pour acomptes (deposit) et factures complètes
  - Liaison avec invoices et quotes
  
- ✅ **Table `email_messages`** : Historique des emails envoyés
  - Templates pour devis, factures, signatures, paiements
  
- ✅ **Table `signature_sessions`** : Sessions de signature électronique
  - Tokens sécurisés pour URLs publiques
  - Expiration automatique (30 jours)
  
- ✅ **Policies RLS** : Sécurité complète avec Row Level Security
- ✅ **Triggers** : Génération automatique de numéros et mise à jour de dates

**Fichier SQL** : `supabase/CREATE-INVOICES-SYSTEM.sql`

### 2. Frontend - Composants React

#### ✅ Page principale `/invoices`
- **Fichier** : `src/pages/Invoices.tsx`
- Liste des factures avec filtres (statut, recherche)
- Affichage en cartes avec glassmorphism
- Actions : voir, supprimer (si brouillon)
- Dialog de visualisation

#### ✅ Formulaire de création
- **Fichier** : `src/components/invoices/CreateInvoiceDialog.tsx`
- **Création simple en UNE PAGE** avec :
  - Sélection ou création de client
  - Description des travaux (éditable)
  - Montant HT, TVA (configurable), Total TTC
  - Travaux supplémentaires (ajout/suppression dynamique)
  - Date d'échéance optionnelle
  - Aperçu en temps réel des totaux
  - Support pour conversion depuis devis (quote_id)

#### ✅ Composant d'affichage
- **Fichier** : `src/components/invoices/InvoiceDisplay.tsx`
- Affichage détaillé d'une facture
- Informations client complètes
- Détails des montants (HT, TVA, TTC)
- Travaux supplémentaires
- Badges de statut

#### ✅ Hooks React Query
- **Fichier** : `src/hooks/useInvoices.ts`
- `useInvoices()` : Liste avec filtres
- `useInvoice(id)` : Détails d'une facture
- `useCreateInvoice()` : Création
- `useUpdateInvoice()` : Mise à jour
- `useDeleteInvoice()` : Suppression
- `useUpdateInvoiceStatus()` : Changement de statut

### 3. Navigation
- ✅ Route `/invoices` ajoutée dans `App.tsx`
- ✅ Lien "Factures" ajouté dans la Sidebar avec icône `Receipt`

### 4. Design System
- ✅ Respect du design existant :
  - Glassmorphism blanc
  - Cartes flottantes
  - Bordures arrondies (xl à 2xl)
  - Ombres douces
  - Animations subtiles (une seule par page via PageTransition)

---

## 🔨 À compléter (Priorités)

### PRIORITÉ 1 : Fonctionnalités essentielles

#### 1. Signature électronique (URGENT)
- [ ] **Edge Function** : `supabase/functions/create-signature-session/index.ts`
  - Générer un token sécurisé
  - Créer une session dans `signature_sessions`
  - Retourner une URL publique : `/sign/:token`
  
- [ ] **Page publique de signature** : `src/pages/PublicSignature.tsx`
  - Route : `/sign/:token`
  - Canvas de signature (reprendre `QuoteSignature.tsx`)
  - Validation et sauvegarde
  
- [ ] **Bouton "Envoyer pour signature"** dans `InvoiceDisplay.tsx`
  - Appeler l'Edge Function
  - Envoyer email au client (voir section Email)
  - Mettre à jour statut : draft → sent

#### 2. Service PDF pour factures
- [ ] **Fichier** : `src/services/invoicePdfService.ts`
  - Réutiliser la structure de `pdfService.ts` (quotes)
  - Adapter pour factures :
    - En-tête avec numéro de facture
    - Informations client
    - Description + travaux supplémentaires
    - Tableau des montants (HT, TVA, TTC)
    - Signature si signée
  
- [ ] **Intégration** dans `InvoiceDisplay.tsx`
  - Bouton "Télécharger PDF"
  - Générer et télécharger

#### 3. Intégration Stripe (Paiement)

##### Configuration Stripe
- [ ] Ajouter les variables d'environnement :
  ```env
  STRIPE_SECRET_KEY=sk_...
  STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

##### Edge Functions
- [ ] **`supabase/functions/create-payment-session/index.ts`**
  - Créer une session Stripe Checkout
  - Pour devis : acompte (configurable : % ou montant fixe)
  - Pour factures : solde restant
  - Sauvegarder dans `payments`
  
- [ ] **`supabase/functions/stripe-webhook/index.ts`**
  - Écouter les événements Stripe
  - Mettre à jour `payments.status`
  - Mettre à jour `invoices.status` : signed → paid
  - Notifier l'utilisateur

##### Frontend
- [ ] **Composant** : `src/components/invoices/PaymentButton.tsx`
  - Bouton "Payer" sur facture signée
  - Redirection vers Stripe Checkout
  
- [ ] **Page de succès** : `src/pages/PaymentSuccess.tsx`
  - Route : `/payment/success`
  - Confirmer le paiement
  
- [ ] **Page d'erreur** : `src/pages/PaymentError.tsx`
  - Route : `/payment/error`
  - Gérer les échecs

#### 4. Système d'envoi d'emails

##### Edge Function
- [ ] **`supabase/functions/send-email/index.ts`**
  - Utiliser Resend, SendGrid, ou service email de Supabase
  - Templates pour :
    - Envoi de devis (`email_type: 'quote'`)
    - Envoi de facture (`email_type: 'invoice'`)
    - Demande de signature (`email_type: 'signature_request'`)
    - Confirmation de paiement (`email_type: 'payment_confirmation'`)
  - Joindre PDF en pièce jointe
  - Sauvegarder dans `email_messages`

##### Templates HTML
- [ ] Créer les templates dans `src/templates/emails/` :
  - `quote-email.html`
  - `invoice-email.html`
  - `signature-request-email.html`
  - `payment-confirmation-email.html`

##### Intégration
- [ ] Boutons "Envoyer par email" dans :
  - `Quotes.tsx` : Envoyer devis
  - `Invoices.tsx` : Envoyer facture
  - `InvoiceDisplay.tsx` : Envoyer pour signature

### PRIORITÉ 2 : Fonctionnalités avancées

#### 5. Boîte Mail (IMAP)
- [ ] **Page** : `src/pages/EmailInbox.tsx`
  - Route : `/email` ou `/mail`
  - Configuration IMAP dans Settings
  
- [ ] **Backend** : Edge Function pour IMAP
  - Connexion Gmail, Outlook, OVH
  - Récupération inbox
  - Threads de conversation
  - Réponse depuis l'app

#### 6. Améliorations UX
- [ ] Preview facture avant envoi
- [ ] Rappels automatiques d'échéance
- [ ] Export CSV des factures
- [ ] Statistiques facturation (revenus, impayés)

---

## 📝 Commandes à exécuter

### 1. Appliquer le schéma SQL
```bash
# Dans Supabase Dashboard → SQL Editor
# Copier-coller le contenu de: supabase/CREATE-INVOICES-SYSTEM.sql
```

### 2. Vérifier les types TypeScript
```bash
# Générer les types depuis Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### 3. Tester la création de facture
```bash
npm run dev
# Aller sur /invoices
# Cliquer "Nouvelle facture"
# Remplir le formulaire et créer
```

---

## 🔐 Variables d'environnement nécessaires

```env
# Stripe (à ajouter)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (choisir un service)
RESEND_API_KEY=re_...
# OU
SENDGRID_API_KEY=SG...
# OU utiliser le service email de Supabase
```

---

## 📚 Documentation des composants

### CreateInvoiceDialog
**Props** :
- `open: boolean` - État d'ouverture du dialog
- `onOpenChange: (open: boolean) => void` - Callback de changement
- `quoteId?: string` - ID du devis à convertir (optionnel)

**Fonctionnalités** :
- Création de client en ligne
- Ajout dynamique de travaux supplémentaires
- Calcul automatique des totaux (HT, TVA, TTC)
- Preview en temps réel

### InvoiceDisplay
**Props** :
- `invoice: Invoice` - Objet facture à afficher
- `showActions?: boolean` - Afficher les boutons d'action
- `onSendForSignature?: () => void` - Callback pour envoyer en signature
- `onDownloadPDF?: () => void` - Callback pour télécharger PDF

---

## 🎯 Prochaines étapes recommandées

1. **Appliquer le SQL** dans Supabase
2. **Créer l'Edge Function** pour la signature
3. **Intégrer Stripe** (test mode d'abord)
4. **Mettre en place l'envoi d'emails**
5. **Tester le workflow complet** : Création → Signature → Paiement

---

## 🐛 Problèmes connus / À vérifier

- [ ] La numérotation automatique est-elle testée avec plusieurs utilisateurs ?
- [ ] Les policies RLS sont-elles bien appliquées pour les sessions de signature publiques ?
- [ ] Le calcul des totaux gère-t-il correctement les arrondis ?

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs Supabase (Edge Functions)
2. Vérifier la console navigateur
3. Tester avec des données de test

---

**Date de création** : $(date)
**Version** : 1.0.0
**Statut** : ✅ Base complète, fonctionnalités avancées en cours

