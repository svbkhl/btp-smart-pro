# 🔍 Audit SaaS Production - Rapport Complet

**Date** : 2025-01-14  
**Scope** : Audit complet du codebase pour production SaaS  
**Objectif** : Identifier et corriger les erreurs critiques, failles de sécurité, anti-patterns

---

## 📊 ÉTAPE 1 : Cartographie du Repo

### Structure Principale

#### Routes & Pages (50+ pages)
- **Publiques** : `/`, `/auth`, `/invite/accept`, `/signature/*`, `/payment/*`, `/quote/*`
- **Protégées** : `/dashboard`, `/clients`, `/projects`, `/calendar`, `/ai`, `/settings`, etc.
- **Admin** : `/admin/*`, `/roles`, `/users`

#### Composants Majeurs
- `src/components/ai/*` : Génération devis IA, assistant
- `src/components/invoices/*` : Facturation
- `src/components/quotes/*` : Devis
- `src/components/admin/*` : Invitations, gestion
- `src/components/ui/*` : Design system (shadcn/ui)

#### Hooks de Data (Supabase)
- `useAuth`, `useClients`, `useProjects`, `useQuotes`, `useInvoices`
- `useUserSettings`, `useUserStats`, `useEmployees`
- `useGoogleCalendar`, `useEmailAccounts`, `useMessages`

#### Edge Functions (60+)
- Auth : `create-company-invite`, `verify-invite`, `accept-invite`
- IA : `generate-quote`, `ai-assistant`, `analyze-image`
- Calendar : `google-calendar-*` (sync, oauth, webhook)
- Email : `send-email`, `email-oauth-*`, `sync-imap-inbox`
- Payment : `create-payment-link`, `payment-webhook`, `stripe-*`
- Notifications : `smart-notifications`, `send-reminders`

#### Schéma SQL
- Tables core : `clients`, `projects`, `user_stats`, `user_settings`
- Multi-tenant : `companies`, `company_users`, `company_invites`
- RBAC : `roles`, `permissions`, `role_permissions`, `delegations`
- Features : `ai_quotes`, `invoices`, `payments`, `events`, `employees`

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 🔴 P0 - CRITIQUES (Blocage Production)

#### P0.1 : Risque `.single()` sans gestion d'erreur
**Fichiers** : 50+ occurrences dans hooks/services  
**Problème** : `.single()` crash si 0 ou 2+ résultats  
**Impact** : Crash runtime, UX cassée  
**Fix** : Utiliser `.maybeSingle()` + vérification null

#### P0.2 : Accès `window`/`localStorage` sans vérification SSR
**Fichiers** : `ThemeProvider.tsx`, `use-mobile.tsx`, hooks  
**Problème** : Crash en SSR (Next.js/Vite SSR)  
**Impact** : Build/rendu serveur échoue  
**Fix** : Guards `typeof window !== 'undefined'`

#### P0.3 : RLS Multi-tenant incomplet
**Fichiers** : Migrations SQL, policies  
**Problème** : Tables `clients`, `projects` utilisent `user_id` au lieu de `company_id`  
**Impact** : Fuite de données entre entreprises  
**Fix** : Migration + RLS basées sur `company_users`

#### P0.4 : Edge Functions sans validation auth stricte
**Fichiers** : `generate-quote`, `create-payment-link`, etc.  
**Problème** : Pas de vérification `company_id` + rôle  
**Impact** : Accès non autorisé, fuite de données  
**Fix** : Middleware auth + vérification company

#### P0.5 : Tokens Google Calendar stockés côté client
**Fichiers** : `useGoogleCalendar.ts`, hooks  
**Problème** : Tokens accessibles dans localStorage  
**Impact** : Fuite de tokens OAuth  
**Fix** : Stocker en DB protégée, Edge Functions uniquement

---

### 🟡 P1 - IMPORTANTS (Qualité/Sécurité)

#### P1.1 : Types TypeScript `any` excessifs
**Fichiers** : Hooks, services, composants  
**Problème** : Perte de type safety  
**Impact** : Bugs runtime, DX dégradée  
**Fix** : Types stricts, interfaces partagées

#### P1.2 : Pas de gestion d'erreur cohérente
**Fichiers** : Tous les hooks/services  
**Problème** : Erreurs silencieuses ou mal formatées  
**Impact** : Debug difficile, UX confuse  
**Fix** : Error boundaries, toasts standardisés

#### P1.3 : Queries React Query sans limites/pagination
**Fichiers** : `useClients`, `useProjects`, `useQuotes`  
**Problème** : Chargement de toutes les données  
**Impact** : Performance dégradée, coûts Supabase  
**Fix** : Pagination, `.limit()`, virtual scrolling

#### P1.4 : Doublons événements calendrier
**Fichiers** : `Calendar.tsx`, `useEvents.ts`  
**Problème** : Sync Google crée doublons  
**Impact** : UX confuse, données corrompues  
**Fix** : Unique constraint + upsert intelligent

#### P1.5 : Aperçu devis se ferme automatiquement
**Fichiers** : `AIQuoteGenerator.tsx`, `QuoteDisplay.tsx`  
**Problème** : `isPreviewOpen` se réinitialise  
**Impact** : UX frustrante  
**Fix** : État persistant, contrôle utilisateur

---

### 🟢 P2 - AMÉLIORATIONS (DX/Performance)

#### P2.1 : Code mort et duplication
**Fichiers** : Composants, hooks, services  
**Problème** : Fichiers non utilisés, code dupliqué  
**Impact** : Bundle size, maintenabilité  
**Fix** : Cleanup, extraction de utilities

#### P2.2 : Logs non structurés
**Fichiers** : Edge Functions  
**Problème** : `console.log` partout  
**Impact** : Debug difficile en prod  
**Fix** : Logger structuré, niveaux (info/warn/error)

#### P2.3 : Pas de tests
**Fichiers** : Tous  
**Problème** : Aucun test unitaire/intégration  
**Impact** : Régression, confiance faible  
**Fix** : Tests critiques (auth, RLS, invitations)

#### P2.4 : Imports non optimisés
**Fichiers** : Composants  
**Problème** : Imports complets de librairies lourdes  
**Impact** : Bundle size, temps de chargement  
**Fix** : Tree-shaking, lazy loading

---

## 🔧 PLAN D'ACTION

### Phase 1 : P0 (Critiques) - PRIORITÉ ABSOLUE
1. ✅ Fix `.single()` → `.maybeSingle()` + null checks
2. ✅ Fix SSR guards pour `window`/`localStorage`
3. ✅ Migration RLS multi-tenant
4. ✅ Validation auth Edge Functions
5. ✅ Sécurisation tokens OAuth

### Phase 2 : P1 (Importants) - Semaine 1
6. Types TypeScript stricts
7. Gestion d'erreur cohérente
8. Pagination queries
9. Fix doublons calendrier
10. Fix aperçu devis

### Phase 3 : P2 (Améliorations) - Semaine 2+
11. Cleanup code mort
12. Logs structurés
13. Tests critiques
14. Optimisation imports

---

## 📝 COMMITS PLANIFIÉS

### Commit 1 : Fix P0.1 - `.single()` → `.maybeSingle()`
- Remplacer tous les `.single()` par `.maybeSingle()`
- Ajouter vérifications null
- Gérer cas "not found" proprement

### Commit 2 : Fix P0.2 - SSR Guards
- Ajouter `typeof window !== 'undefined'` partout
- Créer utilitaire `isBrowser()`
- Fix `ThemeProvider`, `use-mobile`, hooks

### Commit 3 : Fix P0.3 - RLS Multi-tenant
- Migration SQL : ajouter `company_id` aux tables
- Mettre à jour RLS policies
- Migration de données existantes

### Commit 4 : Fix P0.4 - Auth Edge Functions
- Middleware auth dans Edge Functions
- Vérification `company_id` + rôle
- Tests de sécurité

### Commit 5 : Fix P0.5 - Tokens OAuth sécurisés
- Stocker tokens en DB (table protégée)
- Edge Functions uniquement pour accès
- Supprimer localStorage

---

## ✅ VALIDATION

### Checklist Avant Prod
- [ ] Tous les P0 corrigés
- [ ] Tests critiques passent
- [ ] RLS validée (test multi-tenant)
- [ ] Aucun secret côté client
- [ ] Build sans erreurs TypeScript
- [ ] Performance acceptable (<3s FCP)
- [ ] Logs structurés en place

---

**Prochaines étapes** : Commencer par les fixes P0.1 et P0.2 (les plus rapides et impactants).
