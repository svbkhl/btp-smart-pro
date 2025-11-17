# 🗄️ Guide d'Application de la Migration

## 📋 Fichier de Migration

Le fichier de migration se trouve ici :
**`supabase/APPLY-MIGRATION.sql`**

Ce fichier contient toutes les commandes SQL nécessaires pour créer :
- ✅ Table `clients`
- ✅ Table `projects`
- ✅ Table `user_stats`
- ✅ Table `user_settings`
- ✅ Indexes pour les performances
- ✅ Row Level Security (RLS)
- ✅ Politiques de sécurité
- ✅ Triggers automatiques
- ✅ Fonctions helper

---

## 🚀 Comment Appliquer la Migration

### Méthode 1 : Via l'Interface Web (Recommandé)

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com
   - Connectez-vous
   - Sélectionnez votre projet

2. **Ouvrez SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copier le Contenu**
   - Ouvrez le fichier : `supabase/APPLY-MIGRATION.sql`
   - Sélectionnez TOUT le contenu (Cmd+A)
   - Copiez (Cmd+C)

4. **Coller et Exécuter**
   - Collez dans l'éditeur SQL de Supabase (Cmd+V)
   - Cliquez sur "Run" (bouton en bas à droite)
   - Ou appuyez sur Cmd+Enter

5. **Vérifier le Résultat**
   - Vous devriez voir un message "Success"
   - Allez dans "Table Editor"
   - Vérifiez que les 4 tables sont créées

### Méthode 2 : Via la CLI Supabase

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

---

## ✅ Vérification

Après avoir exécuté la migration, vérifiez :

1. **Dans Table Editor**, vous devriez voir :
   - ✅ `clients`
   - ✅ `projects`
   - ✅ `user_stats`
   - ✅ `user_settings`

2. **Dans SQL Editor**, exécutez cette requête pour vérifier :

```sql
-- Vérifier que les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('clients', 'projects', 'user_stats', 'user_settings');
```

Vous devriez voir 4 lignes.

---

## 🆘 En Cas d'Erreur

### Erreur : "relation already exists"

**Solution** : Les tables existent déjà. C'est normal si vous avez déjà exécuté la migration.

### Erreur : "permission denied"

**Solution** : Vérifiez que vous êtes connecté en tant qu'administrateur dans Supabase.

### Erreur : "policy already exists"

**Solution** : Les politiques existent déjà. Le script utilise `DROP POLICY IF EXISTS` donc cela devrait être géré automatiquement.

---

## 📝 Contenu de la Migration

La migration crée :

1. **4 Tables** :
   - `clients` - Informations des clients
   - `projects` - Informations des projets
   - `user_stats` - Statistiques utilisateur
   - `user_settings` - Paramètres utilisateur

2. **Indexes** pour améliorer les performances

3. **Row Level Security (RLS)** activé sur toutes les tables

4. **Politiques de sécurité** pour chaque table

5. **Triggers** pour mise à jour automatique des dates

6. **Fonctions** pour création automatique de stats/settings

---

## ✅ Après la Migration

Une fois la migration appliquée :

1. ✅ Les tables sont créées
2. ✅ La sécurité est activée
3. ✅ Les triggers fonctionnent
4. ✅ Vous pouvez créer des clients et projets

**Votre application est prête !** 🎉

