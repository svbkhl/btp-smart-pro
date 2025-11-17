# 📋 Guide : Comment Appliquer les Tables dans Supabase

## ✅ Ce qui a été créé

Un fichier de migration SQL a été créé : `supabase/migrations/20241105120000_create_core_tables.sql`

Cette migration contient :
- ✅ Table `clients` - Pour stocker les clients
- ✅ Table `projects` - Pour stocker les projets/chantiers
- ✅ Table `user_stats` - Pour stocker les statistiques
- ✅ Table `user_settings` - Pour stocker les paramètres utilisateur
- ✅ Indexes pour améliorer les performances
- ✅ Row Level Security (RLS) activé
- ✅ Politiques de sécurité configurées
- ✅ Triggers pour mettre à jour automatiquement les dates
- ✅ Fonction pour créer automatiquement stats/settings pour nouveaux utilisateurs

---

## 🚀 Comment Appliquer la Migration

### Option 1 : Via l'Interface Supabase (Recommandé pour débutants)

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://supabase.com
   - Connectez-vous à votre projet

2. **Aller dans l'éditeur SQL**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copier le contenu de la migration**
   - Ouvrez le fichier : `supabase/migrations/20241105120000_create_core_tables.sql`
   - Copiez tout le contenu (Cmd+A, Cmd+C)

4. **Coller et exécuter**
   - Collez le contenu dans l'éditeur SQL
   - Cliquez sur "Run" ou appuyez sur Cmd+Enter
   - Attendez que l'exécution se termine

5. **Vérifier les tables**
   - Allez dans "Table Editor" dans le menu
   - Vous devriez voir les 4 nouvelles tables :
     - `clients`
     - `projects`
     - `user_stats`
     - `user_settings`

### Option 2 : Via la CLI Supabase (Pour développeurs)

1. **Installer Supabase CLI** (si pas déjà fait)
   ```bash
   npm install -g supabase
   ```

2. **Se connecter à Supabase**
   ```bash
   supabase login
   ```

3. **Lier votre projet**
   ```bash
   supabase link --project-ref votre-project-ref
   ```

4. **Appliquer les migrations**
   ```bash
   supabase db push
   ```

---

## 🧪 Tester les Tables

### 1. Vérifier que les tables existent

Dans l'éditeur SQL de Supabase :
```sql
-- Voir toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Vous devriez voir :
- `clients`
- `projects`
- `user_stats`
- `user_settings`

### 2. Tester l'insertion d'un client (après être connecté)

```sql
-- Insérer un client de test
INSERT INTO public.clients (user_id, name, email, phone, location)
VALUES (
  auth.uid(),  -- L'ID de l'utilisateur connecté
  'Client Test',
  'test@example.com',
  '06 12 34 56 78',
  'Paris'
);

-- Voir les clients
SELECT * FROM public.clients;
```

### 3. Vérifier que RLS fonctionne

```sql
-- Vérifier les politiques RLS
SELECT * FROM pg_policies 
WHERE tablename IN ('clients', 'projects', 'user_stats', 'user_settings');
```

---

## 📊 Structure des Tables

### Table `clients`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | ID de l'utilisateur propriétaire |
| `name` | TEXT | Nom du client |
| `email` | TEXT | Email du client |
| `phone` | TEXT | Téléphone |
| `location` | TEXT | Adresse/Ville |
| `avatar_url` | TEXT | URL de l'avatar |
| `status` | TEXT | Statut (actif, terminé, planifié, VIP) |
| `total_spent` | NUMERIC | Total dépensé par le client |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

### Table `projects`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | ID de l'utilisateur propriétaire |
| `client_id` | UUID | ID du client (relation) |
| `name` | TEXT | Nom du projet |
| `status` | TEXT | Statut (planifié, en_attente, en_cours, terminé, annulé) |
| `progress` | INTEGER | Progression (0-100) |
| `budget` | NUMERIC | Budget du projet |
| `location` | TEXT | Lieu du chantier |
| `start_date` | DATE | Date de début |
| `end_date` | DATE | Date de fin |
| `description` | TEXT | Description du projet |
| `image_url` | TEXT | URL de l'image |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

### Table `user_stats`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | ID de l'utilisateur (unique) |
| `total_projects` | INTEGER | Nombre total de projets |
| `total_clients` | INTEGER | Nombre total de clients |
| `total_revenue` | NUMERIC | Chiffre d'affaires total |
| `active_projects` | INTEGER | Nombre de projets actifs |
| `completed_projects` | INTEGER | Nombre de projets terminés |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

### Table `user_settings`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | ID de l'utilisateur (unique) |
| `company_name` | TEXT | Nom de l'entreprise |
| `email` | TEXT | Email de contact |
| `phone` | TEXT | Téléphone |
| `address` | TEXT | Adresse |
| `notifications_enabled` | BOOLEAN | Notifications activées |
| `reminder_enabled` | BOOLEAN | Rappels activés |
| `email_notifications` | BOOLEAN | Notifications email activées |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de modification |

---

## 🔐 Sécurité (RLS)

### Politiques créées

Pour chaque table, 4 politiques ont été créées :
1. **SELECT** : Les utilisateurs peuvent voir leurs propres données
2. **INSERT** : Les utilisateurs peuvent créer leurs propres données
3. **UPDATE** : Les utilisateurs peuvent modifier leurs propres données
4. **DELETE** : Les utilisateurs peuvent supprimer leurs propres données

### Comment ça fonctionne

```sql
-- Exemple de politique
CREATE POLICY "Users can view their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = user_id);
```

**Explication** :
- `auth.uid()` = L'ID de l'utilisateur connecté
- `user_id` = L'ID de l'utilisateur propriétaire de la donnée
- Si les deux correspondent → L'utilisateur peut voir la donnée
- Sinon → Accès refusé

---

## 🎯 Fonctionnalités Automatiques

### 1. Mise à jour automatique de `updated_at`

Quand vous modifiez une ligne, la date `updated_at` est automatiquement mise à jour grâce aux triggers.

### 2. Création automatique de stats/settings

Quand un nouvel utilisateur s'inscrit, les tables `user_stats` et `user_settings` sont automatiquement créées grâce au trigger `on_auth_user_created`.

---

## ⚠️ Problèmes Courants

### Erreur : "relation already exists"

**Solution** : Les tables existent déjà. Vous pouvez soit :
- Supprimer les tables existantes et réexécuter
- Ou utiliser `CREATE TABLE IF NOT EXISTS` (déjà dans le script)

### Erreur : "permission denied"

**Solution** : Vérifiez que vous êtes connecté en tant qu'administrateur dans Supabase.

### Erreur : "policy already exists"

**Solution** : Les politiques existent déjà. Le script utilise `CREATE POLICY` sans `IF NOT EXISTS`, donc vous devrez peut-être supprimer les politiques existantes d'abord.

---

## ✅ Vérification Finale

Après avoir appliqué la migration, vérifiez :

1. ✅ Les 4 tables sont créées
2. ✅ RLS est activé sur toutes les tables
3. ✅ Les politiques sont créées
4. ✅ Les triggers fonctionnent
5. ✅ Vous pouvez insérer des données de test

---

## 🚀 Prochaines Étapes

Une fois les tables créées :

1. **Connecter le frontend** aux tables
2. **Créer des hooks** pour récupérer les données
3. **Implémenter le CRUD** (Create, Read, Update, Delete)
4. **Tester** avec des données réelles

**Besoin d'aide ?** Dites-moi si vous avez des questions ! 🎉

