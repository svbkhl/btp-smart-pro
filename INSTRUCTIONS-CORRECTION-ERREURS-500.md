# 🔧 INSTRUCTIONS - CORRECTION DES ERREURS 500

## ❌ Problèmes identifiés

1. **Erreur 500 sur `user_roles`** : La table n'existe pas ou les politiques RLS causent une récursion
2. **Erreur 500 sur `companies`** : La table n'existe pas

## ✅ Solution

Un script SQL unifié a été créé : `supabase/FIX-ALL-TABLES-URGENT.sql`

### 📋 Étapes pour corriger

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir le SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier et exécuter le script**
   - Ouvrir le fichier `supabase/FIX-ALL-TABLES-URGENT.sql`
   - Copier tout le contenu
   - Coller dans le SQL Editor
   - Cliquer sur "Run" (ou Ctrl+Enter)

4. **Vérifier la création**
   - Le script devrait afficher : `✅ Tables user_roles et companies créées avec succès !`
   - Vérifier dans "Table Editor" que les tables existent

## 🔍 Ce que fait le script

### 1. Crée l'enum `app_role`
- Valeurs : `dirigeant`, `salarie`, `client`, `administrateur`

### 2. Crée la table `user_roles`
- Structure correcte avec l'enum `app_role`
- Politiques RLS corrigées (sans récursion)
- Fonction `has_role()` pour éviter les problèmes de récursion

### 3. Crée la table `companies`
- Structure complète pour le système multi-entreprises
- Politiques RLS pour la sécurité

### 4. Crée la table `company_users`
- Liaison entre utilisateurs et entreprises
- Politiques RLS pour la sécurité

### 5. Crée les fonctions utilitaires
- `has_role()` : Vérifie un rôle sans récursion RLS
- `get_user_company_id()` : Obtient la company_id d'un utilisateur
- `is_feature_enabled()` : Vérifie si une feature est activée

## ⚠️ Important

Après avoir exécuté le script, vous devrez peut-être :

1. **Créer un rôle pour votre utilisateur** :
```sql
INSERT INTO public.user_roles (user_id, role) 
VALUES ('VOTRE_USER_ID', 'administrateur'::app_role);
```

2. **Créer une entreprise** :
   - Utiliser l'interface AdminCompanies dans l'application
   - Ou via SQL :
```sql
INSERT INTO public.companies (name, plan, status) 
VALUES ('Mon Entreprise', 'custom', 'active')
RETURNING id;
```

3. **Lier l'utilisateur à l'entreprise** :
```sql
INSERT INTO public.company_users (company_id, user_id, role) 
VALUES ('ID_ENTREPRISE', 'ID_UTILISATEUR', 'owner');
```

## 🐛 Si les erreurs persistent

1. Vérifier que les tables existent dans "Table Editor"
2. Vérifier les politiques RLS dans "Authentication" → "Policies"
3. Vérifier les logs dans "Logs" → "Postgres Logs"
4. Rafraîchir la page de l'application

## 📝 Notes

- Le script utilise `IF NOT EXISTS` donc il est sûr de l'exécuter plusieurs fois
- Les politiques RLS sont recréées pour éviter les conflits
- La fonction `has_role()` utilise `SECURITY DEFINER` pour éviter la récursion RLS













