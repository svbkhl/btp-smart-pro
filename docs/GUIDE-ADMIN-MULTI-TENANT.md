# 🛠️ Guide Admin - Multi-Tenant SaaS

Ce guide explique comment gérer le système multi-tenant de BTP Smart Pro.

## 📋 Table des matières

1. [Architecture Multi-Tenant](#architecture-multi-tenant)
2. [Scripts SQL Disponibles](#scripts-sql-disponibles)
3. [Gestion des Entreprises](#gestion-des-entreprises)
4. [Gestion des Utilisateurs](#gestion-des-utilisateurs)
5. [Tests de Séparation](#tests-de-séparation)
6. [Dépannage](#dépannage)

---

## 🏗️ Architecture Multi-Tenant

### Structure des Tables

#### `companies`
Table principale des entreprises.
- `id` : UUID (clé primaire)
- `name` : Nom de l'entreprise
- `owner_id` : UUID de l'utilisateur propriétaire
- `plan` : Plan (basic, pro, enterprise, custom)
- `features` : JSON des features activées
- `status` : Statut (active, suspended, no_support)
- `created_at`, `updated_at` : Timestamps

#### `company_users`
Table de liaison entre utilisateurs et entreprises.
- `company_id` : UUID (référence companies.id)
- `user_id` : UUID (référence auth.users.id)
- `role` : Rôle (owner, admin, member)
- `status` : Statut (optionnel : active, inactive)
- Unique sur `(company_id, user_id)`

#### Tables Métier
Toutes les tables métier contiennent une colonne `company_id` :
- `clients` : Clients de l'entreprise
- `projects` : Projets/Chantiers
- `ai_quotes` : Devis
- `invoices` : Factures
- `payments` : Paiements
- `employees` : Employés
- `events` : Événements/Planning
- `notifications` : Notifications
- Etc.

### Sécurité (RLS)

**Row Level Security (RLS)** est activé sur toutes les tables métier.

#### Fonction Helper : `current_company_ids()`
Retourne tous les `company_id` où l'utilisateur actuel est membre.

#### Policies RLS
- **SELECT** : L'utilisateur ne peut voir que les données de ses entreprises
- **INSERT** : L'utilisateur ne peut créer que dans ses entreprises
- **UPDATE** : L'utilisateur ne peut modifier que les données de ses entreprises
- **DELETE** : L'utilisateur ne peut supprimer que les données de ses entreprises

```sql
-- Exemple de policy
CREATE POLICY "Company members can view clients"
ON public.clients FOR SELECT
USING (company_id IN (SELECT company_id FROM public.current_company_ids()))
```

---

## 📜 Scripts SQL Disponibles

### Scripts de Migration

#### `20250127000002_complete_multi_tenant_migration_fixed.sql`
**Migration complète multi-tenant**
- Ajoute `company_id` à toutes les tables métier
- Crée les fonctions helper (`current_company_ids()`, `is_company_member()`)
- Configure les RLS policies
- Fait le backfill des données existantes
- ⚠️ **Important** : À exécuter une seule fois lors de la mise en place

**Comment l'exécuter :**
1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez-collez le contenu du script
3. Cliquez sur "Run"
4. Vérifiez les messages de log pour les erreurs éventuelles

### Scripts de Gestion

#### `REMOVE-ADMIN-FROM-ALL-COMPANIES.sql`
**Retirer un admin de toutes les entreprises**
- Utilisé pour : Rendre un utilisateur admin "global" (pas membre d'entreprise)
- Email cible : `sabri.khalfallah6@gmail.com`
- Actions :
  - Retire l'utilisateur de toutes les entreprises
  - Ne supprime pas ses données (elles restent avec leur `company_id`)
  - Utile pour les super-admins qui doivent gérer toutes les entreprises

**Quand l'utiliser :**
- Quand un admin doit avoir accès à toutes les entreprises
- Pour tester la séparation des données
- Pour créer un compte admin global

#### `FIX-ADMIN-ACCOUNT-COMPANY.sql`
**Assigner les données d'un admin à une entreprise**
- Crée une entreprise dédiée pour l'admin
- Assigne toutes ses données à cette entreprise
- Utile pour organiser les données d'un admin

### Scripts de Test

#### `TEST-ISOLATION-MULTI-TENANT.sql`
**Vérifier l'isolation des données**
- Teste que les données sont bien séparées
- Vérifie les RLS policies
- Vérifie qu'il n'y a pas de `company_id` NULL
- Affiche des statistiques par entreprise

**Comment l'utiliser :**
1. Exécutez le script dans Supabase SQL Editor
2. Vérifiez les messages dans les logs
3. Analysez le résumé final

---

## 🏢 Gestion des Entreprises

### Créer une Entreprise

```sql
-- Via l'interface admin (recommandé)
-- Ou via SQL :
INSERT INTO public.companies (name, owner_id, plan, status)
VALUES (
  'Nouvelle Entreprise',
  'user-uuid-here',
  'custom',
  'active'
)
RETURNING id;
```

### Ajouter un Utilisateur à une Entreprise

```sql
INSERT INTO public.company_users (company_id, user_id, role, status)
VALUES (
  'company-uuid-here',
  'user-uuid-here',
  'member', -- ou 'admin', 'owner'
  'active'
)
ON CONFLICT (company_id, user_id) DO UPDATE
SET role = EXCLUDED.role, status = EXCLUDED.status;
```

### Retirer un Utilisateur d'une Entreprise

```sql
DELETE FROM public.company_users
WHERE company_id = 'company-uuid-here'
AND user_id = 'user-uuid-here';
```

### Voir les Membres d'une Entreprise

```sql
SELECT 
  u.email,
  cu.role,
  cu.status,
  c.name AS company_name
FROM public.company_users cu
JOIN auth.users u ON u.id = cu.user_id
JOIN public.companies c ON c.id = cu.company_id
WHERE cu.company_id = 'company-uuid-here';
```

---

## 👥 Gestion des Utilisateurs

### Voir toutes les Entreprises d'un Utilisateur

```sql
SELECT 
  c.id,
  c.name,
  cu.role,
  cu.status
FROM public.company_users cu
JOIN public.companies c ON c.id = cu.company_id
WHERE cu.user_id = 'user-uuid-here';
```

### Changer le Rôle d'un Utilisateur

```sql
UPDATE public.company_users
SET role = 'admin' -- ou 'member', 'owner'
WHERE company_id = 'company-uuid-here'
AND user_id = 'user-uuid-here';
```

---

## ✅ Tests de Séparation

### Test Manuel

1. **Créer deux entreprises de test :**
   ```sql
   -- Entreprise A
   INSERT INTO public.companies (name, owner_id, plan, status)
   VALUES ('Entreprise A', 'user-uuid-1', 'custom', 'active');
   
   -- Entreprise B
   INSERT INTO public.companies (name, owner_id, plan, status)
   VALUES ('Entreprise B', 'user-uuid-2', 'custom', 'active');
   ```

2. **Créer des données de test pour chaque entreprise :**
   ```sql
   -- Clients pour Entreprise A
   INSERT INTO public.clients (user_id, company_id, name, email)
   VALUES ('user-uuid-1', 'company-uuid-a', 'Client A1', 'clienta1@test.com');
   
   -- Clients pour Entreprise B
   INSERT INTO public.clients (user_id, company_id, name, email)
   VALUES ('user-uuid-2', 'company-uuid-b', 'Client B1', 'clientb1@test.com');
   ```

3. **Tester l'isolation :**
   - Connectez-vous avec le compte de l'Entreprise A
   - Vous ne devez voir que les clients de l'Entreprise A
   - Connectez-vous avec le compte de l'Entreprise B
   - Vous ne devez voir que les clients de l'Entreprise B

### Test Automatique

Exécutez le script `TEST-ISOLATION-MULTI-TENANT.sql` :
- Vérifie automatiquement l'isolation
- Affiche les statistiques par entreprise
- Signale les problèmes potentiels

---

## 🔧 Dépannage

### Problème : Un utilisateur voit les données d'une autre entreprise

**Causes possibles :**
1. RLS policies mal configurées
2. `company_id` manquant sur certaines lignes
3. Utilisateur membre de plusieurs entreprises

**Solutions :**
```sql
-- 1. Vérifier les RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'clients';

-- 2. Vérifier les company_id NULL
SELECT COUNT(*) FROM public.clients WHERE company_id IS NULL;

-- 3. Vérifier les entreprises de l'utilisateur
SELECT company_id, role FROM public.company_users
WHERE user_id = 'user-uuid-here';
```

### Problème : Sidebar vide pour un admin

**Cause :** L'admin n'est membre d'aucune entreprise.

**Solution :** 
- Soit ajouter l'admin à une entreprise
- Soit exécuter `REMOVE-ADMIN-FROM-ALL-COMPANIES.sql` (la sidebar devrait alors afficher tous les items car `company = null`)

### Problème : Données avec `company_id` NULL

**Solution :** Exécuter le backfill :
```sql
-- Exemple pour la table clients
UPDATE public.clients
SET company_id = (
  SELECT company_id FROM public.company_users
  WHERE user_id = clients.user_id
  LIMIT 1
)
WHERE company_id IS NULL;
```

---

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Migration Multi-Tenant](./supabase/migrations/20250127000002_complete_multi_tenant_migration_fixed.sql)
- [Script de Test](./supabase/TEST-ISOLATION-MULTI-TENANT.sql)

---

## ⚠️ Notes Importantes

1. **Ne jamais supprimer une entreprise avec des données** : Utilisez le statut `suspended` à la place
2. **Backup avant migration** : Toujours faire un backup avant d'exécuter les migrations
3. **Tester en local d'abord** : Testez les scripts sur une base de test avant la production
4. **RLS est critique** : Ne désactivez jamais RLS en production sans raison valable

---

**Dernière mise à jour :** Janvier 2025
