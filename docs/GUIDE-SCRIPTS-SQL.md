# 📜 Guide des Scripts SQL

Ce document liste tous les scripts SQL disponibles dans le projet et explique leur utilisation.

## 📋 Table des matières

1. [Scripts de Migration](#scripts-de-migration)
2. [Scripts de Gestion Multi-Tenant](#scripts-de-gestion-multi-tenant)
3. [Scripts de Gestion Admin](#scripts-de-gestion-admin)
4. [Scripts de Test](#scripts-de-test)
5. [Scripts de Maintenance](#scripts-de-maintenance)
6. [Guide d'Exécution](#guide-dexécution)

---

## 🔄 Scripts de Migration

### `20250127000002_complete_multi_tenant_migration_fixed.sql`
**Migration complète multi-tenant (SaaS)**

**Description :** Transforme l'application en mode SaaS multi-entreprises avec séparation totale des données.

**Ce qu'il fait :**
- Ajoute la colonne `company_id` à toutes les tables métier
- Crée les tables `companies` et `company_users` si elles n'existent pas
- Crée les fonctions helper (`current_company_ids()`, `is_company_member()`)
- Configure les RLS policies pour toutes les tables
- Fait le backfill des données existantes
- Rend `company_id` NOT NULL après le backfill

**Quand l'utiliser :**
- Lors de la mise en place du système multi-tenant
- Une seule fois par base de données

**Prérequis :**
- Tables `companies` et `company_users` doivent exister
- Faire un backup avant exécution

**Temps d'exécution :** ~2-5 minutes selon le volume de données

---

## 🏢 Scripts de Gestion Multi-Tenant

### `REMOVE-ADMIN-FROM-ALL-COMPANIES.sql`
**Retirer un admin de toutes les entreprises**

**Description :** Retire l'utilisateur `sabri.khalfallah6@gmail.com` de toutes les entreprises pour en faire un admin global.

**Ce qu'il fait :**
- Trouve l'utilisateur admin
- Retire l'utilisateur de toutes les entreprises
- Affiche un résumé des actions

**Quand l'utiliser :**
- Pour créer un compte admin global
- Pour tester la séparation des données
- Quand un admin doit avoir accès à toutes les entreprises via l'interface admin

**Résultat :** L'admin n'est plus membre d'aucune entreprise et peut gérer toutes les entreprises.

---

### `FIX-ADMIN-ACCOUNT-COMPANY.sql`
**Assigner les données d'un admin à une entreprise**

**Description :** Crée une entreprise dédiée pour l'admin et assigne toutes ses données à cette entreprise.

**Ce qu'il fait :**
- Trouve l'utilisateur admin
- Crée l'entreprise "BTP Smart Pro - Admin" si elle n'existe pas
- Ajoute l'admin comme owner de cette entreprise
- Assigne toutes les données de l'admin à cette entreprise

**Quand l'utiliser :**
- Pour organiser les données d'un admin
- Quand un admin doit avoir ses propres données isolées

---

### `TEST-ISOLATION-MULTI-TENANT.sql`
**Vérifier l'isolation des données**

**Description :** Script de test pour vérifier que les données sont bien séparées entre entreprises.

**Ce qu'il fait :**
- Test 1 : Vérifie que chaque entreprise a ses propres données
- Test 2 : Vérifie que les RLS policies sont activées
- Test 3 : Vérifie qu'il n'y a pas de `company_id` NULL
- Test 4 : Vérifie que les fonctions helper existent
- Affiche des statistiques par entreprise

**Quand l'utiliser :**
- Après une migration multi-tenant
- Pour vérifier l'intégrité des données
- Lors de tests de régression

**Sortie attendue :** Tous les tests doivent être au vert (✅)

---

## 👨‍💼 Scripts de Gestion Admin

### `GIVE-ADMIN-ALL-PERMISSIONS.sql`
**Donner toutes les permissions à un admin**

**Description :** Donne tous les rôles et permissions à un utilisateur admin.

**Quand l'utiliser :** Pour créer un super-admin avec tous les droits.

---

### `SET-ADMIN-ROLE-FOR-SABRI.sql`
**Définir le rôle admin pour un utilisateur spécifique**

**Description :** Définit le rôle admin pour l'utilisateur `sabri.khalfallah6@gmail.com`.

**Quand l'utiliser :** Pour donner les droits admin à un utilisateur.

---

## 🧪 Scripts de Test

### `VERIFICATION-POST-MIGRATION-MULTI-TENANT.sql`
**Vérification après migration multi-tenant**

**Description :** Vérifie que la migration s'est bien passée.

**Ce qu'il vérifie :**
- Présence de la colonne `company_id` dans toutes les tables
- Absence de valeurs NULL dans `company_id`
- Présence des RLS policies
- Fonctionnement des fonctions helper

---

## 🔧 Scripts de Maintenance

### `DELETE-ALL-INVOICES.sql`
**Supprimer toutes les factures**

**Description :** Supprime toutes les factures de la base de données.

**⚠️ ATTENTION :** Script destructif, à utiliser avec précaution.

**Quand l'utiliser :**
- Pour nettoyer les données de test
- Lors d'un reset complet des factures

---

## 📖 Guide d'Exécution

### Comment exécuter un script SQL

#### Méthode 1 : Supabase Dashboard (Recommandé)

1. **Accédez au Dashboard Supabase :**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor :**
   - Cliquez sur "SQL Editor" dans la sidebar gauche

3. **Exécutez le script :**
   - Cliquez sur "New query"
   - Copiez-collez le contenu du script
   - Cliquez sur "Run" (ou Ctrl/Cmd + Enter)

4. **Vérifiez les résultats :**
   - Regardez la sortie dans la console
   - Vérifiez les messages `RAISE NOTICE`
   - Analysez les erreurs éventuelles

#### Méthode 2 : psql (Ligne de commande)

```bash
# Se connecter à Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Exécuter le script
\i supabase/SCRIPT-NAME.sql

# Ou directement
psql "postgresql://..." < supabase/SCRIPT-NAME.sql
```

#### Méthode 3 : Migration automatique

Pour les scripts de migration dans `supabase/migrations/`, Supabase les exécute automatiquement via la CLI :

```bash
# Appliquer toutes les migrations
supabase db push

# Ou spécifique
supabase migration up
```

### Bonnes Pratiques

1. **Backup avant exécution :**
   ```sql
   -- Toujours faire un backup avant migration
   pg_dump -h db.[PROJECT-REF].supabase.co -U postgres -d postgres > backup.sql
   ```

2. **Tester en local d'abord :**
   - Utilisez Supabase Local Development
   - Testez sur une copie de la base de données

3. **Vérifier les prérequis :**
   - Lisez la documentation du script
   - Vérifiez que les tables nécessaires existent

4. **Exécuter dans une transaction (si possible) :**
   ```sql
   BEGIN;
   -- Votre script ici
   COMMIT;
   -- Ou ROLLBACK; en cas d'erreur
   ```

5. **Analyser les logs :**
   - Tous les scripts utilisent `RAISE NOTICE` pour le feedback
   - Vérifiez tous les messages dans la console

### Résolution des Erreurs

#### Erreur : "relation does not exist"
**Cause :** La table n'existe pas encore.

**Solution :** Exécutez d'abord les scripts de création de tables.

#### Erreur : "permission denied"
**Cause :** RLS bloque l'opération ou manque de permissions.

**Solution :** 
- Vérifiez que vous êtes connecté en tant qu'admin
- Vérifiez les RLS policies

#### Erreur : "column does not exist"
**Cause :** La colonne n'existe pas dans la table.

**Solution :** Exécutez d'abord les scripts de migration.

#### Erreur : "duplicate key value"
**Cause :** Violation de contrainte unique.

**Solution :** Vérifiez les données existantes avant insertion.

---

## 📚 Structure des Dossiers

```
supabase/
├── migrations/
│   ├── 20250127000002_complete_multi_tenant_migration_fixed.sql
│   └── ...
├── REMOVE-ADMIN-FROM-ALL-COMPANIES.sql
├── FIX-ADMIN-ACCOUNT-COMPANY.sql
├── TEST-ISOLATION-MULTI-TENANT.sql
├── VERIFICATION-POST-MIGRATION-MULTI-TENANT.sql
└── ...
```

---

## 🔗 Liens Utiles

- [Documentation Supabase SQL](https://supabase.com/docs/guides/database)
- [Documentation RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Guide Multi-Tenant](./GUIDE-ADMIN-MULTI-TENANT.md)

---

**Dernière mise à jour :** Janvier 2025
