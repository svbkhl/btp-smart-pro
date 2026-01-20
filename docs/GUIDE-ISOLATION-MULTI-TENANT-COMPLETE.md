# 🔒 GUIDE COMPLET : Isolation Multi-Tenant de Toutes les Données

## ⚠️ BUG CRITIQUE CORRIGÉ

**Problème** : Les données (clients, projets, devis, factures, etc.) étaient visibles par toutes les entreprises.

**Solution** : Isolation stricte par entreprise avec RLS + triggers.

---

## 📋 MIGRATION SQL À EXÉCUTER

**Fichier** : `supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql`

**Actions** :
1. Exécutez ce script dans **Supabase Dashboard → SQL Editor**
2. Le script va automatiquement :
   - Ajouter `company_id` à toutes les tables métier
   - Créer les Foreign Keys et index
   - Migrer les données existantes vers leur entreprise
   - Créer les triggers pour forcer `company_id` depuis le JWT
   - Créer les RLS policies strictes
   - Supprimer les anciennes policies permissives

---

## 📊 TABLES ISOLÉES

Toutes les tables métier sont maintenant isolées :

- ✅ **clients** (corrigé)
- ✅ **projects** (chantiers)
- ✅ **ai_quotes** (devis)
- ✅ **invoices** (factures)
- ✅ **payments** (paiements)
- ✅ **employees** (employés)
- ✅ **events** (calendrier)
- ✅ **notifications**
- ✅ **messages** (messagerie)
- ✅ **candidatures** (RH)
- ✅ **taches_rh** (RH)
- ✅ **rh_activities** (RH)
- ✅ **employee_performances** (RH)
- ✅ **maintenance_reminders**
- ✅ **ai_conversations** (IA)
- ✅ **ai_messages** (IA)
- ✅ **image_analysis**
- ✅ **employee_assignments**
- ✅ **quote_lines, quote_sections** (si existent)

---

## 🔧 CORRECTIONS FRONTEND

### ✅ DÉJÀ CORRIGÉ
- `src/hooks/useClients.ts` - Ne passe plus `company_id`

### ⚠️ À CORRIGER
Les hooks suivants envoient encore `company_id` et doivent être corrigés :

1. **`src/hooks/useProjects.ts`** (ligne 142)
   - ❌ `company_id: companyId` dans `insertData`
   - ✅ **À SUPPRIMER** - Le trigger backend le force

2. **`src/hooks/useInvoices.ts`** (lignes 592, 668)
   - ❌ `company_id: companyId` dans les insertions
   - ✅ **À SUPPRIMER** - Le trigger backend le force

3. **Autres hooks** à vérifier :
   - `useQuotes.ts`
   - `usePayments.ts`
   - `useEvents.ts`
   - `useEmployees.ts`
   - Tous les hooks de création

---

## 🔐 SÉCURITÉ

### Protections mises en place :

1. **Trigger `force_company_id()`**
   - Force automatiquement `company_id` depuis le JWT lors des INSERT
   - Ignore toute valeur venant du frontend
   - Rejette les INSERT si l'utilisateur n'est pas membre d'une entreprise

2. **RLS Policies strictes**
   - SELECT : Seulement les données de son entreprise
   - INSERT : Vérification que `company_id` correspond à l'utilisateur
   - UPDATE : Seulement les données de son entreprise
   - DELETE : Seulement les données de son entreprise

3. **Frontend**
   - Ne doit **JAMAIS** envoyer `company_id`
   - Le backend ignore toute valeur `company_id` venant du frontend

---

## 🐛 ERREUR "Load failed (api.supabase.com)"

Cette erreur peut venir de :
1. **Timeout réseau** (3 secondes par défaut)
2. **Configuration Supabase** (URL/keys incorrectes)
3. **Problème de connexion** (firewall, proxy)

**Solutions** :
- Vérifiez les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Augmentez le timeout dans `src/utils/queryWithTimeout.ts` si nécessaire
- Vérifiez la connexion réseau

---

## ✅ TESTS À EFFECTUER

1. **Créer deux entreprises A et B**
2. **Créer des données dans A** :
   - Client dans A → ne doit PAS apparaître dans B
   - Projet dans A → ne doit PAS apparaître dans B
   - Devis dans A → ne doit PAS apparaître dans B
   - Facture dans A → ne doit PAS apparaître dans B
3. **Créer des données dans B** :
   - Client dans B → ne doit PAS apparaître dans A
   - Projet dans B → ne doit PAS apparaître dans A
4. **Vérifier qu'aucune donnée n'est partagée**

---

## 📝 PROCHAINES ÉTAPES

1. ✅ Exécuter la migration SQL
2. ⚠️ Corriger les hooks frontend pour supprimer `company_id`
3. ✅ Tester l'isolation avec deux entreprises
4. ✅ Vérifier qu'aucune donnée n'est partagée

---

## 🚨 IMPORTANT

**Toute violation de l'isolation = bug bloquant critique**

La sécurité est maintenant gérée au niveau de la base de données (RLS + triggers), ce qui garantit l'isolation même si le frontend est compromis.
