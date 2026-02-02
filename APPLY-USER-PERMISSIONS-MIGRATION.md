# Guide: Appliquer la migration des permissions personnalisées

## 📋 Ce que fait cette migration :

1. **Crée la table `user_permissions`** pour stocker les permissions individuelles de chaque employé
2. **Met à jour la fonction RPC** `get_user_permissions` pour inclure les permissions personnalisées
3. **Configure les RLS policies** pour sécuriser l'accès aux permissions

## 🚀 Comment appliquer la migration :

### Option 1: Via Supabase Dashboard (Recommandé)

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Cliquez sur **New Query**
5. Copiez le contenu du fichier :
   ```
   supabase/migrations/20260201000001_add_user_permissions.sql
   ```
6. Collez-le dans l'éditeur
7. Cliquez sur **Run** (ou `Cmd+Enter` / `Ctrl+Enter`)

### Option 2: Via Supabase CLI

```bash
# Assurez-vous d'être dans le répertoire du projet
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# Appliquer la migration
supabase db push

# Ou appliquer la migration spécifique
supabase migration up --db-url "postgresql://postgres:[VOTRE_PASSWORD]@[VOTRE_HOST]:5432/postgres"
```

### Option 3: Via psql (ligne de commande PostgreSQL)

```bash
psql "postgresql://postgres:[VOTRE_PASSWORD]@[VOTRE_HOST]:5432/postgres" \
  -f supabase/migrations/20260201000001_add_user_permissions.sql
```

## ✅ Vérifier que la migration a fonctionné :

Exécutez cette requête dans le SQL Editor :

```sql
-- Vérifier que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_permissions'
);

-- Vérifier que la fonction existe
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'get_user_permissions_with_custom'
);
```

Les deux requêtes doivent retourner `true`.

## 🔄 Après la migration :

1. **Redémarrez votre application** pour prendre en compte les changements
2. **Testez en tant que patron** : vous devriez voir un bouton "Permissions" pour chaque employé
3. **Configurez les permissions** pour vos employés via l'interface

## 🎯 Fonctionnalités disponibles :

Le patron peut maintenant accorder individuellement ces permissions :

### Clients
- ✅ Voir les clients
- ✅ Créer des clients
- ✅ Modifier les clients
- ✅ Supprimer les clients

### Projets
- ✅ Voir les projets
- ✅ Créer des projets
- ✅ Modifier les projets
- ✅ Supprimer les projets

### Devis
- ✅ Voir les devis
- ✅ Créer des devis
- ✅ Modifier les devis
- ✅ Supprimer les devis

### Factures
- ✅ Voir les factures
- ✅ Créer des factures
- ✅ Envoyer les factures

### Employés
- ✅ Inviter des employés
- ✅ Voir les employés

### Paramètres
- ✅ Gérer les paramètres de l'entreprise

## 🐛 En cas d'erreur :

Si vous voyez une erreur "relation already exists", c'est normal si vous aviez déjà une version de la table. Supprimez d'abord l'ancienne :

```sql
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP FUNCTION IF EXISTS public.get_user_permissions_with_custom CASCADE;
```

Puis réexécutez la migration.

## 📝 Notes :

- Les permissions **s'ajoutent** aux permissions du rôle (elles ne les remplacent pas)
- Si vous révoquezune permission (granted = false), elle sera retirée même si le rôle la possède
- Seuls les **owners** peuvent gérer les permissions des employés
