# 🚀 Guide de Finalisation - Application (Sans IA)

## 📋 Checklist Complète

### ✅ Étape 1 : Vérifier le Fichier .env (5 min)

**Action** : Vérifier que votre `.env` contient les bonnes valeurs

**Valeurs correctes** :
```env
VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbWFmcWp6bGRtc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTA0OTksImV4cCI6MjA3ODE4NjQ5OX0.aJoeIcBb9FiSL2n90vfGevlQQJApym8AVlMktSYOwss
VITE_SUPABASE_PROJECT_ID=renmjmqlmafqjzldmsgs
```

**Instructions** :
1. Ouvrez le fichier `.env` à la racine du projet
2. Si les valeurs sont différentes, remplacez-les par celles ci-dessus
3. Redémarrez le serveur : `npm run dev`

---

### ✅ Étape 2 : Configurer Supabase Storage (15-30 min)

#### 2.1 Créer le Bucket "images"

1. **Ouvrez Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans Storage** (📦 dans le menu de gauche)

3. **Cliquez sur "New bucket"**

4. **Configurez le bucket** :
   - **Name** : `images` (exactement comme ça, en minuscules)
   - **Public bucket** : ✅ **Activé** (très important !)
   - **File size limit** : `5242880` (5 MB)
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`

5. **Cliquez sur "Create bucket"**

#### 2.2 Appliquer les Politiques RLS

1. **Dans Supabase Dashboard**, allez dans **SQL Editor** (💬 dans le menu)

2. **Cliquez sur "New query"**

3. **Ouvrez le fichier** : `supabase/CONFIGURE-STORAGE.sql`

4. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)

5. **Collez dans SQL Editor** (Cmd+V)

6. **Cliquez sur "Run"** (ou Cmd+Enter)

7. **Vérifiez** qu'il n'y a pas d'erreurs

#### 2.3 Vérifier la Configuration

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE name = 'images';

-- Vérifier les politiques (devrait retourner 4 lignes)
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';
```

**Résultat attendu** :
- 1 ligne pour le bucket
- 4 lignes pour les politiques

---

### ✅ Étape 3 : Vérifier les Tables de Base de Données (10 min)

Dans **Supabase Dashboard → SQL Editor**, exécutez :

```sql
-- Vérifier toutes les tables principales
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'clients',
  'projects',
  'user_stats',
  'user_settings',
  'events',
  'email_queue'
)
ORDER BY table_name;
```

**Résultat attendu** : 6 tables listées

**Si une table manque**, exécutez le script SQL correspondant :
- `clients`, `projects`, `user_stats`, `user_settings` → `supabase/APPLY-MIGRATION.sql`
- `events` → `supabase/CREATE-CALENDAR-SYSTEM.sql`
- `email_queue` → `supabase/CREATE-EMAIL-SYSTEM.sql`

---

### ✅ Étape 4 : Vérifier les Edge Functions (5 min)

Dans **Supabase Dashboard → Edge Functions**, vérifiez que ces fonctions sont listées :

**Fonctions Email** :
- ✅ `send-email`
- ✅ `process-email-queue`
- ✅ `send-reminders`

**Fonctions Statistiques** :
- ✅ `generate-stats`
- ✅ `check-maintenance-reminders`

**Fonctions IA** (on les laisse pour plus tard) :
- ⏳ `ai-assistant` (à corriger plus tard)
- ⏳ `generate-quote` (à corriger plus tard)
- ⏳ `analyze-image` (à corriger plus tard)
- ⏳ `sign-quote` (à corriger plus tard)

**Si une fonction manque**, déployez-la :
```bash
npx supabase functions deploy [nom-de-la-fonction]
```

---

### ✅ Étape 5 : Tester les Fonctionnalités (15 min)

#### Test 1 : Dashboard
1. Connectez-vous à l'application
2. Vérifiez que le Dashboard affiche :
   - Statistiques (projets, clients, revenus)
   - Projets récents
   - Graphiques

#### Test 2 : Clients
1. Allez dans **Clients**
2. **Créez un client** (bouton "Nouveau client")
3. **Testez la recherche** (tapez un nom)
4. **Testez les filtres** (par statut)
5. **Testez l'export CSV** (bouton Export)

#### Test 3 : Projets
1. Allez dans **Projets**
2. **Créez un projet** (bouton "Nouveau projet")
3. **Testez la recherche**
4. **Testez les filtres**
5. **Testez l'export CSV**
6. **Cliquez sur un projet** pour voir la page de détail

#### Test 4 : Calendrier
1. Allez dans **Calendrier**
2. **Créez un événement** (bouton "Nouvel événement")
3. **Testez les vues** : Jour, Semaine, Mois
4. **Modifiez un événement**
5. **Supprimez un événement**

#### Test 5 : Stats
1. Allez dans **Stats**
2. Vérifiez que les graphiques s'affichent :
   - Graphique en camembert (répartition par statut)
   - Graphique en barres (évolution dans le temps)

#### Test 6 : Settings
1. Allez dans **Settings**
2. **Modifiez vos paramètres** (nom entreprise, email, etc.)
3. **Activez/désactivez les notifications**
4. **Sauvegardez**
5. **Rechargez la page** et vérifiez que les changements sont sauvegardés

#### Test 7 : Upload d'Images (après configuration Storage)
1. **Créez un projet** avec une image
2. **Créez un client** avec un avatar
3. **Vérifiez** que les images s'affichent correctement

---

## 🎯 Résumé des Actions

| Action | Temps | Priorité |
|--------|-------|----------|
| Vérifier `.env` | 5 min | 🔴 Critique |
| Configurer Storage | 15-30 min | 🔴 Critique |
| Vérifier les tables | 10 min | 🟡 Important |
| Vérifier Edge Functions | 5 min | 🟡 Important |
| Tester les fonctionnalités | 15 min | 🟢 Vérification |

**Temps total** : **50 min - 1h15**

---

## ✅ Après ces Étapes

Votre application sera fonctionnelle à **~95%** (sans l'IA).

**Ce qui fonctionnera** :
- ✅ Dashboard avec statistiques
- ✅ Gestion complète clients/projets
- ✅ Calendrier
- ✅ Upload d'images
- ✅ Export de données
- ✅ Recherche et filtres
- ✅ Paramètres utilisateur

**Ce qui restera** :
- ⏳ Fonctionnalités IA (on s'en occupe en dernier)

---

## 🆘 Si Problème

Si vous rencontrez un problème à une étape :

1. **Notez l'étape** où vous êtes bloqué
2. **Notez le message d'erreur** exact
3. **Partagez-moi** ces informations

Je vous aiderai à résoudre le problème ! 🚀

