# Correction : Affectations owner → planning member

## Problème
Les affectations créées par l'owner dans le planning des employés ne s'affichaient pas sur le planning des members (employés).

## Solution
1. **RLS fallback** : Les employés peuvent toujours voir leurs affectations (policy sur `employee_assignments`).
2. **Sync employees** : Chaque membre d'une entreprise doit avoir une fiche dans `employees` pour apparaître au patron et voir son planning.

## Appliquer les corrections (recommandé : tout-en-un)

**Pour que chaque employé de chaque entreprise voie les modifs de son patron** :

→ Exécuter `docs/APPLIQUER-PLANNING-TOUS-EMPLOYES.sql` dans Supabase Dashboard → SQL Editor.

Ce script applique en une fois :
1. La policy RLS sur `employee_assignments`
2. La synchronisation des membres de `company_users` vers `employees` (toutes les entreprises)

### Alternative : appliquer séparément

#### 1. Policy RLS (obligatoire)
Exécuter `supabase/migrations/20260222000001_employee_assignments_fallback_for_members.sql`.

#### 2. Sync employees (pour tous les employés de toutes les entreprises)
Exécuter `supabase/migrations/20260223000001_sync_all_company_users_to_employees.sql` dans le SQL Editor.  
Cela crée une fiche employé pour chaque membre qui n'en a pas encore.

**Ou exécuter tout en une fois :** `docs/APPLIQUER-PLANNING-TOUS-EMPLOYES.sql` (RLS lecture seule + sync + fix company_users).

### Vérification
Après application :
1. L'owner crée une affectation pour un employé (Planning > Planning employés)
2. L'employé ouvre Mon planning
3. L'affectation doit apparaître dans son planning

### 3. Lecture seule pour les employés (20260224000001)
Exécuter `supabase/migrations/20260224000001_employees_view_only_assignments.sql` pour que les employés ne puissent que **voir** leurs affectations (pas créer, modifier ou supprimer). Seul le patron peut gérer le planning.

### Si des employés ne voient toujours pas leurs affectations
Ré-exécuter la sync (migration 20260223000001 ou script tout-en-un) pour créer les fiches manquantes.  
Pour un employé spécifique : `docs/AJOUTER-ISLAM-SLIMANI-EMPLOYEE-PLANNING.sql` (adapter les emails si besoin).
