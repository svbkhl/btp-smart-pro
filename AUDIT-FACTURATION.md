# 🔍 AUDIT COMPLET — Module Facturation BTP Smart Pro

> Date de l'audit : 2026-05-06
> Périmètre : module devis + facture (DB, hooks, services PDF, composants UI, conformité légale).
> **Statut** : AUDIT LECTURE SEULE — aucune modification de code n'a été faite.

---

## 0. Constat préliminaire — divergences brief / réalité du repo

Le brief de mission décrit la stack comme `Next.js 14 (App Router) · Prisma · @react-pdf/renderer ou puppeteer`. **La réalité du repo diffère :**

| Élément | Brief | Réalité (`package.json`, code) |
|---|---|---|
| Framework | Next.js 14 App Router | **Vite + React 18 + react-router-dom** (`vite_react_shadcn_ts`) |
| ORM | Prisma | **Supabase JS direct** — aucun Prisma installé |
| Génération PDF | `@react-pdf/renderer` ou `puppeteer` | **`jspdf` + `html2canvas`** (impératif vectoriel, pas de composants React) |
| UI | Tailwind + Framer Motion | OK — Tailwind + shadcn/ui + Radix + Framer Motion |
| DB | PostgreSQL via Prisma | PostgreSQL via **Supabase** (RLS multi-tenant) |

**Conséquences directes** sur le plan d'exécution proposé :
- Pas de migration Prisma — il faudra écrire des migrations SQL Supabase (`supabase/migrations/*.sql`).
- Pas de composants `<InvoiceDocument />` `@react-pdf/renderer` natifs : le PDF est tracé impérativement via `jsPDF.text/rect/...`. Le **rendu HTML/CSS du preview** et le **rendu PDF** sont **deux pipelines distincts** à maintenir en cohérence (ou unifier via `html2canvas` + `jsPDF.addImage`).
- Le système de `InvoiceTheme` proposé reste valide, mais doit être implémenté côté `jsPDF` (paramétrage de couleurs/polices/structure).

→ **Avant Phase 2** (corrections), je recommande de valider avec toi cette adaptation. Détails en fin de document, section "Décisions à prendre".

---

## 1. Cartographie du module facturation

### Tables Supabase impliquées (confirmées via `supabase/migrations/*` et `supabase/*.sql`)

| Table | Rôle | Colonnes-clés observées |
|---|---|---|
| `invoices` | Factures | `id, user_id, company_id, client_id, quote_id, invoice_number, amount NOT NULL, status, due_date, paid_date, total_ht, total_ttc, tva, client_name, client_email` |
| `invoice_lines` | Lignes facture | `invoice_id, company_id, position, label, description, unit, quantity, unit_price_ht, total_ht, tva_rate, total_tva, total_ttc` |
| `ai_quotes` | Devis | `id, client_id, client_name, company_id, tva_rate (DECIMAL), tva_non_applicable_293b BOOLEAN, subtotal_ht, total_tva, total_ttc, mode, estimated_cost` |
| `quote_lines` | Lignes devis | `quote_id, section_id, label, quantity, unit_price_ht, tva_rate, total_ht, total_tva, total_ttc` |
| `quote_sections` | Regroupement par corps de métier | `quote_id, position, title` |
| `clients` | Clients (particuliers + pros mélangés) | `name TEXT NOT NULL, email, phone, location, titre TEXT CHECK IN ('M.','Mme'), prenom TEXT` |
| `user_settings` | Paramètres entreprise | `company_name, address, city, postal_code, country, siret, vat_number, legal_form, company_logo_url, signature_data, ...` — **aucun champ `vat_regime`** |
| `company_settings` | Existe (mention `tva_293b` dans migration `20260118000001`) | À vérifier — pas utilisé par `useCreateInvoice` |

### Pages / composants

- `src/pages/Invoices.tsx`, `src/pages/BillingOverview.tsx`, `src/pages/QuotePage.tsx`, `src/pages/Quotes.tsx`, `src/pages/QuoteDetail.tsx`
- 13 composants `src/components/invoices/*.tsx` + 17 `src/components/quotes/*.tsx`
- `src/components/ai/AIQuoteGenerator.tsx`, `AIInvoiceGenerator.tsx`, `SimpleInvoiceForm.tsx`, etc.

### Services de génération PDF (deux pipelines distincts)

- `src/services/invoicePdfService.ts` (factures) — **1036 lignes**, contient **2 fonctions à 95 % identiques** (`downloadInvoicePDF` + `generateInvoicePDFAsBase64`)
- `src/services/pdfService.ts` (devis) — fonction `downloadQuotePDF`

### Hooks principaux

- `useInvoices`, `useInvoice`, `useCreateInvoice`, `useUpdateInvoice`, `useDeleteInvoice`, `useDeleteInvoicesBulk`, `useUpdateInvoiceStatus` (dans `useInvoices.ts`, **1316 lignes**)
- `useQuotes`, `useDetailedQuotes`, `useQuoteLines`, `useQuoteSections`, `useQuoteSectionLibrary`, `useQuoteLineLibrary`, `useAIQuotes`, `useQuoteReminders`

---

## 2. Diagnostic point par point

Légende statut : ✅ OK / ⚠️ À améliorer / 🔴 Bug bloquant

### 🔴 BUG #1 — TVA : régime du devis hérité tel quel sur la facture

**Statut** : 🔴 reproductible et confirmé dans le code.

**Localisation** : `src/hooks/useInvoices.ts:280-557` (`useCreateInvoice`).

**Comportement observé** :
1. `useCreateInvoice` lit `tva_rate` et `tva_non_applicable_293b` **depuis le devis** (`ai_quotes`) — lignes 320-338.
2. Le calcul du taux TVA final priorise : `quoteTva293b` → `quoteTvaRate` → `data.vat_rate` → 20 % par défaut (lignes 459-478).
3. **À aucun moment** le code relit l'état actuel de l'entreprise (`user_settings` ou `company_settings.tva_293b`).
4. Aucune colonne `vat_regime` / `vat_legal_mention` / `vat_rate_snapshot` n'est stockée sur la facture — la mention légale est **calculée à l'affichage** (`invoicePdfService.ts:413, 441, 915, 940`) et figée en dur à `"TVA non applicable (Art. 293B du CGI)"`.

**Cause racine confirmée** :
```ts
// useInvoices.ts:333-338
} else if (quote) {
  quoteTvaRate = quote.tva_rate || 0.20;
  quoteTva293b = quote.tva_non_applicable_293b || false;  // ← devis pré-bascule = false
  ...
}
```
Pour `FACTURE-2026-002` : le devis source d'avril a `tva_non_applicable_293b = false` et `tva_rate = 0.20`. La bascule en 293 B faite **dans les paramètres entreprise** ne se propage pas — l'invoice est créée à 20 % TTC.

**Manques structurels** :
- Pas de colonne `current_vat_regime` sur `companies` ni `user_settings` (champ central manquant).
- Pas de snapshot sur `invoices` : `vat_regime`, `vat_rate_snapshot`, `vat_legal_mention`.
- Pas d'avertissement utilisateur en cas de divergence régime devis vs régime entreprise courant.
- Mentions hardcodées : seul l'art. 293 B est géré, **rien pour autoliquidation BTP** (art. 283-2 nonies CGI), pourtant fréquente en sous-traitance bâtiment.

**Recommandations** (Phase 2) :
1. Ajouter à `user_settings` (ou `companies`) : `vat_regime ENUM('STANDARD','FRANCHISE_293B','AUTOLIQUIDATION_BTP') DEFAULT 'STANDARD'`.
2. Ajouter à `invoices` : `vat_regime`, `vat_rate_snapshot NUMERIC`, `vat_legal_mention TEXT NULL`.
3. Modifier `useCreateInvoice` :
   - Toujours lire le régime entreprise au moment T.
   - Si `quote.tva_non_applicable_293b !== entreprise.vat_regime`-équivalent → modal de confirmation bloquant.
   - Snapshotter les 3 colonnes ci-dessus à l'insertion.
4. Helper `resolveVatLegalMention(regime)` → texte exact CGI selon régime.
5. Migration de données existantes : remplir `vat_rate_snapshot` depuis `tva` actuelle pour ne **rien recalculer rétroactivement**.

---

### 🔴 BUG #2 — Duplication civilité bloc client

**Statut** : 🔴 reproductible — bug confirmé dans **3 fichiers**.

**Localisations** :

1. `src/services/invoicePdfService.ts:240-250` (PDF facture, fonction `downloadInvoicePDF`)
   ```ts
   let clientName = '';
   if (clientCivility) clientName += `${clientCivility} `;       // "M. "
   if (clientFirstName) clientName += `${clientFirstName} `;     // "Ks "
   clientName += invoice.client_name || 'Non spécifié';          // "M. Ks Plomberie"
   // → "M. Ks M. Ks Plomberie"
   ```
2. `src/services/invoicePdfService.ts:754-764` (PDF facture base64, fonction `generateInvoicePDFAsBase64`) — **code identique dupliqué**.
3. `src/services/pdfService.ts:308-318` (PDF devis, fonction `downloadQuotePDF`) — **même bug**.

**Cause racine** :
- Le schéma `clients` ne distingue **pas** `last_name` / `company_name` :
  - `name TEXT NOT NULL` (champ libre — peut contenir n'importe quoi : "M. Ks Plomberie", "Jean Dupont", "Plomberie Dupont SARL"…)
  - `titre` (`M.`/`Mme`) et `prenom` ajoutés a posteriori.
- La concaténation `civilité + prénom + name` ne déduplique pas si `name` contient déjà la civilité.
- Aucun helper centralisé : tous les rendus reformatent ad-hoc.

**Recommandations** (Phase 2) :
1. Créer `src/utils/formatClientBlock.ts` exportant `formatClientBlock(client) → string[]` (lignes prêtes à imprimer).
2. Distinguer particulier / pro :
   - Ajouter à `clients` : `type TEXT CHECK IN ('PARTICULIER','PROFESSIONNEL')`, `company_name TEXT NULL`, `last_name TEXT NULL` (le `name` actuel devient legacy/affichage).
3. Sanitization à la saisie : si `last_name` ou `name` commence par `M.|Mme|Mlle|Dr.|Me`, déplacer dans `titre`.
4. Dédup défensive : helper `dedupCivilityLines(lines)` qui retire toute civilité dupliquée sur 2 lignes consécutives.
5. Faire passer **tous les rendus** par `formatClientBlock` (PDF facture × 2 fonctions, PDF devis, `InvoiceDisplay.tsx`, emails, etc.).

---

### 🔴 BUG #3 — Validation logo : absente au-delà du mime/taille

**Statut** : 🔴 confirmé.

**Localisations** :
- `src/services/storageService.ts:17-37` : `validateImageFile()` ne vérifie **que** mime type (5 formats) et taille (≤ 5 Mo).
- `src/components/ImageUpload.tsx:44-101` : pas de validation supplémentaire avant upload.
- `src/services/invoicePdfService.ts:121-146` et `pdfService.ts:191-211` : pas de fallback typo si pas de logo (juste un nom blanc sur bandeau bleu).

**Manques** :
- Pas de check dimensions min (200×200 px).
- Pas de check ratio (rejeter > 4:1 ou < 1:4).
- Pas d'heuristique capture d'écran (échantillonnage pixels bordure).
- Pas de prévisualisation sur fond blanc avant validation.
- Pas d'éditeur intégré (crop / supprimer fond).

**Recommandations** (Phase 2) :
1. Étendre `validateImageFile` → version async `validateLogoFile(file)` qui :
   - Charge l'image (`createImageBitmap`).
   - Vérifie dimensions, ratio.
   - Échantillonne 16+ pixels sur bordure → si > 80 % uniformes (à `ε` près), warning capture d'écran.
2. Ajouter aperçu temps réel `<LogoPreview />` (rendu sur fond blanc, taille réelle PDF).
3. Fallback élégant : si `company_logo_url` vide, afficher le `company_name` en serif large dans l'en-tête.
4. (V2 / roadmap) Bouton "Supprimer le fond" via Cloudinary ou remove.bg.

---

### ⚠️ Findings additionnels (non listés au brief — à prioriser ensemble)

#### A. Duplication massive du code PDF facture
- `invoicePdfService.ts` : `downloadInvoicePDF` (l. 63-575) et `generateInvoicePDFAsBase64` (l. 581-1031) sont **95 % identiques** (~500 lignes copiées). Toute correction (Bug #1, Bug #2, design) doit être faite **deux fois**.
- 🛠️ Refactor : extraire `renderInvoiceToDoc(doc, params)` qui mute le `jsPDF` ; les deux entrées appellent la même fonction puis font `doc.save(...)` ou `doc.output('dataurlstring')`.

#### B. Cohérence devis/facture au niveau du PDF
- Deux pipelines indépendants (`pdfService.ts` pour devis, `invoicePdfService.ts` pour facture).
- Couleurs/polices/marges hardcodées **dans chaque fichier**.
- 🛠️ Centraliser des `pdfTokens.ts` (couleurs, marges, sizes) + helpers `drawHeader`, `drawClientBlock`, `drawLineItemsTable`, `drawTotalsBlock`, `drawLegalFooter`.

#### C. Immutabilité des factures émises (loi anti-fraude TVA)
- `useUpdateInvoice` (l. 945-1077) **ne bloque rien** : on peut éditer une facture `paid`, changer son montant, etc.
- Pas de colonne `cancelled_at` ni statut `CANCELLED` figé.
- 🔴 **Conformité légale française** : une facture émise doit être immuable. Toute modification doit passer par un avoir.

#### D. Numérotation séquentielle continue
- `generateInvoiceNumber` (à auditer dans `src/utils/documentNumbering.ts`) — vérifier qu'aucun saut n'est possible.
- Pas de logique d'avoir (`credit_note`).

#### E. Conformité mentions obligatoires (art. L441-9 + CGI)
État du PDF facture vs obligations :

| Mention | Présent | Notes |
|---|---|---|
| Nom + adresse émetteur | ✅ | via `companyInfo` |
| SIRET, code APE | ⚠️ | SIRET ok, **APE absent** du modèle |
| Forme juridique + capital | ⚠️ | `legal_form` ok, **capital social** absent |
| N° TVA intracom | ✅ | `vat_number` |
| Date d'émission | ✅ | |
| N° unique séquentiel | ⚠️ | À vérifier (`documentNumbering.ts`) |
| Date livraison/prestation | 🔴 | **non gérée** (≠ date émission) |
| Identité client | ⚠️ | dégradée par Bug #2 |
| Désignation prestations | ✅ | |
| PU HT, taux TVA, montant TVA, total HT/TTC | ✅ | mais Bug #1 |
| Conditions de règlement | ✅ | hardcodées |
| Pénalités retard | ✅ | hardcodées (3× taux légal) |
| Indemnité forfaitaire 40 € | ✅ | hardcodée |
| Mention 293 B / autoliquidation | ⚠️ | seulement 293 B, mention figée à l'affichage |

#### F. Calculs et arrondis
- Tout est en `Number` JavaScript, pas en centimes integer (`utils/quoteCalculations.ts:29` `roundTo2Decimals`). Risque d'arrondis cumulés sur factures > 1 000 lignes (rare en BTP, mais possible). Pas critique court terme.
- Logique cohérente : `totalHt = sum(qty*unit_price)` puis `tva = totalHt * rate` (l. 70-94 `quoteCalculations.ts`).
- Multi-taux TVA **pas implémenté** : `tva_rate` stocké au niveau du devis seulement, pas par ligne effective (le champ existe sur la ligne mais l'UI/calcul ne le différencie pas systématiquement).

#### G. Workflow / états facture
- Statuts : `draft`, `sent`, `signed`, `paid`, `cancelled`. Pas de `OVERDUE` calculé.
- Transitions non verrouillées (ex : `useUpdateInvoiceStatus` accepte n'importe quelle valeur).
- Conversion devis → facture : pas de vérification "déjà converti".
- Pas de lien bidirectionnel propre : l'invoice connaît `quote_id`, mais le devis ne stocke pas l'invoice générée.
- Pas de relances automatiques code-side (J+0/J+15/J+30).
- Pas d'acompte / facture finale (cas BTP fréquent).

#### H. Sécurité
- Bucket Supabase Storage `images` configuré **public** (`getPublicUrl` l. 78 `storageService.ts`). Les logos et signatures stockés sont accessibles à toute URL devinée. Acceptable pour un logo d'entreprise (déjà public sur le PDF), à challenger pour les signatures.
- Filtre `company_id` sur queries : OK, multi-tenant respecté (modulo bugs RLS).
- Logs : nombreux `console.log` avec PII (email, phone, montants). Cf. `useInvoices.ts:170-180, 730-740`. À nettoyer pour prod.

#### I. Performance
- Pas de génération PDF en background job — bloquant côté client (`html2canvas` peut prendre >1 s).
- Pas de cache de PDF généré.
- Listes paginées : à vérifier sur `useInvoices` (actuellement `select` sans `range()`).

#### J. UX in-app
- `InvoiceDisplay.tsx` : bonne base mais affichage client (l. 124) ne tient compte **ni de la civilité ni du prénom** — incohérent avec le PDF. Bug #2 partiellement absent ici, mais l'info est juste tronquée.
- Pas de filtre période / montant sur la liste factures (à confirmer en lisant `Invoices.tsx`).
- Pas d'export FEC / CSV comptable.

#### K. Email & envoi
- `auto_send_email` géré (l. 891 `useInvoices.ts`).
- Pas de tracking ouverture/clic visible côté facture.
- Pas de Stripe Payment Link embarqué dans l'email (existe pour devis via `DepositPaymentLink.tsx`, à étendre).

#### L. Mode design (diagnostic)
Conforme au brief — bandeau bleu plein (`primaryColor [59,130,246]`), logo dans carré, hiérarchie typo plate. Aucun système de tokens, aucune variante. Refonte largement justifiée.

---

## 3. Synthèse priorisée

| # | Sujet | Sévérité | Effort estimé | Bloquant prod ? |
|---|---|---|---|---|
| 1 | Bug TVA franchise 293 B (devis→facture) | 🔴 Critique légal | M (2 j) | OUI |
| 2 | Duplication civilité (3 lieux) | 🔴 Image marque | S (½ j) | OUI |
| 3 | Validation logo + heuristique capture | ⚠️ UX | S (½ j) | NON |
| C | Immutabilité facture émise (loi anti-fraude) | 🔴 Légal | M (1 j) | OUI à terme |
| A | Dédup PDF service (refactor `renderInvoiceToDoc`) | ⚠️ Maintenabilité | S (½ j) | NON |
| Refonte | Refonte design éditorial | ⚠️ Image marque | L (3-4 j) | NON |
| B | Tokens PDF + composants partagés devis/facture | ⚠️ Cohérence | M (1 j) | NON |
| E | Mentions légales manquantes (date prestation, capital, APE) | ⚠️ Légal | S (½ j) | OUI à terme |
| F | Multi-taux TVA + centimes integer | ⚠️ Précision | M (1-2 j) | NON |
| G | Workflow facture verrouillé + avoirs | ⚠️ Légal | L (2-3 j) | OUI à terme |

---

## 4. Décisions à prendre avant Phase 2

Je liste les questions bloquantes — avant d'éditer du code, j'ai besoin de tes choix :

1. **Stack mismatch Next.js → Vite** : OK pour adapter le plan ? (Pas de Prisma, migrations SQL Supabase, jsPDF impératif au lieu de composants `@react-pdf/renderer`).
2. **`vat_regime` : où le stocker ?**
   - Option A : sur `user_settings` (existe déjà, multi-tenant via `company_id`).
   - Option B : sur `companies` (plus propre sémantiquement mais nécessite vérifier structure).
   - Recommandation : **A** (collé à ce qui existe).
3. **Mentions légales** : on traite tout à la fois (293 B + autoliquidation BTP + date prestation + APE + capital) ou seulement 293 B + autoliquidation (couvrant le cas client) ?
4. **Refonte design** : feature-flagger côté `user_settings.invoice_template_version` ('v1' | 'v2-editorial') ou bascule directe ?
   - Recommandation : **flag** pour pouvoir rollback 30 jours.
5. **Refactor PDF (`renderInvoiceToDoc`)** : on l'inclut dans le scope de cette PR ou on le sépare ? Recommandation : **inclus**, sinon Bug #1 et Bug #2 doivent être patchés à 2 endroits chacun.
6. **Périmètre Phase 2** que je propose pour cette mission :
   - ✅ Bug #1 (TVA snapshot)
   - ✅ Bug #2 (formatClientBlock + dédup)
   - ✅ Bug #3 (validation logo)
   - ✅ Refacto `renderInvoiceToDoc` + `pdfTokens`
   - ✅ Refonte design éditorial v2 (feature-flag, garde V1)
   - ✅ Tests TDD pour Bug #1, Bug #2, formatClientBlock, calculs TVA, snapshot PDF
   - ⏸ Reporter à PR séparée : immutabilité facture émise (C), mentions complémentaires (E), workflow (G), multi-taux (F).

Tes go/no-go sur 1-6 me suffisent pour commencer. Je travaille TDD : tests d'abord, puis implémentation.

---

*Fin de l'audit. Aucune modification de code n'a été faite. À ta validation, je passe en Phase 2.*
