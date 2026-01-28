# Guide de Diagnostic : Problème de Suppression Client

## Problème
Lorsqu'un client est supprimé dans une entreprise, il disparaît aussi dans une autre entreprise, indiquant un problème d'isolation multi-tenant.

## Scripts de Diagnostic Créés

### 1. `VERIFIER-COMPANIES-UTILISATEURS.sql`
**Objectif :** Vérifier si des utilisateurs sont membres de plusieurs entreprises
**Utilisation :** Exécuter dans Supabase Dashboard > SQL Editor
**À vérifier :**
- Si des utilisateurs sont membres de plusieurs entreprises (requête #2)
- Si plusieurs utilisateurs partagent le même company_id (requête #1)

### 2. `DIAGNOSTIC-COMPLET-DELETE-CLIENT.sql`
**Objectif :** Diagnostic complet de la table clients et des RLS policies
**Utilisation :** Exécuter dans Supabase Dashboard > SQL Editor
**À vérifier :**
- Si des clients partagent le même ID entre entreprises (requête #7)
- Les RLS policies DELETE actives (requête #4)
- Si RLS est activé (requête #3)

### 3. `TEST-RLS-DELETE-ISOLATION.sql`
**Objectif :** Tester l'isolation RLS lors de la suppression
**Utilisation :** 
1. Exécuter en tant qu'utilisateur A (entreprise 1) avec un client ID de l'entreprise 1
2. Vérifier le résultat de `can_delete` (requête #4)
3. Si `can_delete = false`, la suppression devrait être bloquée par RLS

### 4. `TEST-DELETE-CLIENT-COMPLET.sql`
**Objectif :** Test complet de suppression avec vérifications
**Utilisation :** Exécuter dans Supabase Dashboard > SQL Editor

## Corrections Apportées

### 1. Frontend (`useClients.ts`)
- ✅ Modification de la vérification pour utiliser RLS uniquement (sans filtre `company_id` explicite)
- ✅ Vérification supplémentaire que `existingClient.company_id === companyId`
- ✅ Logs détaillés pour déboguer

### 2. RLS Policies (`FIX-CLIENTS-DELETE-RLS-POLICY-FINAL.sql`)
- ✅ Policy DELETE stricte qui vérifie :
  - `company_id IS NOT NULL`
  - `company_id = current_company_id()`
  - L'utilisateur est membre de l'entreprise

## Hypothèses sur la Cause

1. **Utilisateurs membres de plusieurs entreprises** : Si un utilisateur est membre de plusieurs entreprises, `getCurrentCompanyId()` retourne toujours le premier `company_id` trouvé, pas nécessairement celui de l'entreprise active.

2. **Même compte utilisateur pour les deux entreprises** : Si les deux entreprises testent avec le même compte, `getCurrentCompanyId()` retournera le même `company_id` pour les deux.

3. **Clients partageant le même ID** : Si deux clients dans différentes entreprises ont le même UUID (problème de données).

## Étapes de Résolution

1. **Exécuter les scripts de diagnostic** pour identifier la cause exacte
2. **Vérifier les logs** dans la console lors d'une suppression
3. **Si le problème persiste**, vérifier que :
   - Les utilisateurs testent avec des comptes différents
   - Chaque utilisateur n'est membre que d'une seule entreprise
   - Les clients n'ont pas le même ID entre entreprises

## Logs à Surveiller

Lors d'une suppression, surveiller dans la console :
- `company_id retrieved for delete` : Quel company_id est utilisé
- `All companies for user` : Tous les company_id de l'utilisateur
- `Client verification with RLS only` : Ce que RLS retourne
- `DELETE query result` : Combien de clients ont été supprimés
