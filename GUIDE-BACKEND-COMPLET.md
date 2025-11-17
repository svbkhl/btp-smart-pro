# 🚀 Guide : Créer Tout le Backend Supabase

## 📋 Ce qui a été créé

Un fichier SQL complet a été créé : **`supabase/BACKEND-COMPLET.sql`**

Ce script contient **TOUTES** les tables nécessaires pour l'application :

### ✅ Tables créées (19 tables)

1. **profiles** - Profils utilisateurs
2. **user_roles** - Rôles utilisateurs (dirigeant, salarié, administrateur)
3. **clients** - Clients
4. **projects** - Projets/Chantiers
5. **user_stats** - Statistiques utilisateur
6. **user_settings** - Paramètres utilisateur
7. **events** - Événements du calendrier
8. **employees** - Employés
9. **employee_assignments** - Affectations employés aux projets
10. **ai_quotes** - Devis générés par l'IA
11. **notifications** - Notifications utilisateur
12. **candidatures** - Candidatures RH
13. **taches_rh** - Tâches RH
14. **rh_activities** - Activités RH
15. **employee_performances** - Performances employés
16. **maintenance_reminders** - Rappels de maintenance
17. **image_analysis** - Analyses d'images
18. **ai_conversations** - Conversations avec l'IA
19. **email_queue** - File d'attente des emails

### ✅ Fonctionnalités incluses

- ✅ **Indexes** pour améliorer les performances
- ✅ **Triggers** pour mettre à jour automatiquement `updated_at`
- ✅ **Row Level Security (RLS)** activé sur toutes les tables
- ✅ **Politiques de sécurité** configurées
- ✅ **Fonction automatique** pour créer stats/settings/role lors de l'inscription

---

## 🚀 Comment Appliquer le Backend

### Option 1 : Via l'Interface Supabase (Recommandé)

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://supabase.com
   - Connectez-vous à votre projet

2. **Aller dans l'éditeur SQL**
   - Cliquez sur **"SQL Editor"** dans le menu de gauche
   - Cliquez sur **"New query"**

3. **Copier le contenu du script**
   - Ouvrez le fichier : `supabase/BACKEND-COMPLET.sql`
   - Sélectionnez tout le contenu (Cmd+A / Ctrl+A)
   - Copiez (Cmd+C / Ctrl+C)

4. **Coller et exécuter**
   - Collez le contenu dans l'éditeur SQL
   - Cliquez sur **"Run"** ou appuyez sur **Cmd+Enter** (Mac) / **Ctrl+Enter** (Windows)
   - ⏳ Attendez que l'exécution se termine (peut prendre 1-2 minutes)

5. **Vérifier les tables**
   - Allez dans **"Table Editor"** dans le menu
   - Vous devriez voir toutes les 19 tables listées ci-dessus

### Option 2 : Via la CLI Supabase

```bash
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier votre projet
supabase link --project-ref votre-project-ref

# 4. Appliquer le script
supabase db execute --file supabase/BACKEND-COMPLET.sql
```

---

## ✅ Vérification

### Vérifier que toutes les tables sont créées

Exécutez cette requête dans SQL Editor :

```sql
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
      'user_settings', 'events', 'employees', 'employee_assignments',
      'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
      'rh_activities', 'employee_performances', 'maintenance_reminders',
      'image_analysis', 'ai_conversations', 'email_queue'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'user_roles', 'clients', 'projects', 'user_stats', 
  'user_settings', 'events', 'employees', 'employee_assignments',
  'ai_quotes', 'notifications', 'candidatures', 'taches_rh',
  'rh_activities', 'employee_performances', 'maintenance_reminders',
  'image_analysis', 'ai_conversations', 'email_queue'
)
ORDER BY table_name;
```

Toutes les tables devraient afficher **"✅ Existe"**.

### Vérifier les politiques RLS

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Vous devriez voir de nombreuses politiques pour chaque table.

---

## 🔧 Configuration Supplémentaire

### 1. Storage Bucket pour les Images

Si vous n'avez pas encore créé le bucket `images` :

1. Allez dans **Storage** dans le menu Supabase
2. Cliquez sur **"New bucket"**
3. Nom : `images`
4. Cochez **"Public bucket"**
5. Cliquez sur **"Create bucket"**

### 2. Edge Functions (Optionnel)

Si vous utilisez des Edge Functions (comme `manage-employees`), vous devrez les déployer séparément.

---

## 🐛 Résolution de Problèmes

### Erreur : "relation already exists"

Si certaines tables existent déjà, le script utilisera `CREATE TABLE IF NOT EXISTS`, donc cela ne devrait pas poser de problème. Si vous avez une erreur, vous pouvez :

1. Supprimer les tables existantes (attention : cela supprimera les données)
2. Ou modifier le script pour utiliser `DROP TABLE IF EXISTS` avant `CREATE TABLE`

### Erreur : "permission denied"

Assurez-vous d'être connecté en tant qu'administrateur du projet Supabase.

### Erreur : "policy already exists"

Si certaines politiques existent déjà, vous pouvez les supprimer d'abord :

```sql
-- Exemple pour supprimer une politique
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
```

Puis réexécutez le script.

---

## 📊 Structure des Tables

### Relations Principales

```
auth.users
  ├── profiles (1:1)
  ├── user_roles (1:1)
  ├── user_stats (1:1)
  ├── user_settings (1:1)
  ├── clients (1:N)
  ├── projects (1:N)
  ├── events (1:N)
  ├── employees (1:1)
  ├── ai_quotes (1:N)
  ├── notifications (1:N)
  └── ...

projects
  ├── clients (N:1)
  ├── events (1:N)
  └── employee_assignments (1:N)

employees
  ├── employee_assignments (1:N)
  ├── employee_performances (1:N)
  └── rh_activities (1:N)
```

---

## ✅ Checklist Finale

- [ ] Script SQL exécuté sans erreur
- [ ] Toutes les 19 tables sont visibles dans Table Editor
- [ ] RLS est activé sur toutes les tables
- [ ] Les politiques de sécurité sont créées
- [ ] Les indexes sont créés
- [ ] Les triggers fonctionnent (testez en modifiant un enregistrement)
- [ ] Le bucket `images` existe dans Storage (si nécessaire)

---

## 🎉 C'est Fait !

Une fois le script exécuté, votre backend est complètement configuré et prêt à être utilisé par l'application frontend.

Toutes les tables, politiques de sécurité, indexes et triggers sont en place pour garantir :
- ✅ Sécurité des données (RLS)
- ✅ Performance (indexes)
- ✅ Automatisation (triggers)
- ✅ Intégrité des données (contraintes)

