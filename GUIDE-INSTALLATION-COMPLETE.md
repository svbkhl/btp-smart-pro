# 🚀 Guide d'Installation Complète - Toutes les Étapes

## 📋 Vue d'Ensemble

Ce guide vous permet d'appliquer **tous les scripts SQL** dans le bon ordre pour que votre SaaS soit 100% fonctionnel.

---

## 🎯 Ordre d'Installation

1. **Migration de base** (tables principales)
2. **Validation** (validation côté serveur)
3. **Calendrier** (système d'événements)
4. **Emails** (système d'emails automatiques)
5. **Storage** (configuration du stockage)

---

## 📝 Étape 1 : Migration de Base (Si pas déjà fait)

### Appliquer `supabase/APPLY-MIGRATION.sql`

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor** (💬 dans le menu)
3. **Cliquez sur "New query"**
4. **Ouvrez le fichier** : `supabase/APPLY-MIGRATION.sql`
5. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
6. **Collez dans SQL Editor** (`Cmd+V`)
7. **Cliquez sur "Run"** (ou `Cmd+Enter`)
8. **Vérifiez** : Vous devriez voir "Success"

### Vérification

```sql
-- Vérifier que les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'projects', 'user_stats', 'user_settings');
```

Vous devriez voir **4 tables**.

---

## 📝 Étape 2 : Validation Côté Serveur

### Appliquer `supabase/ADD-VALIDATION.sql`

1. **Dans SQL Editor**, cliquez sur "New query"
2. **Ouvrez le fichier** : `supabase/ADD-VALIDATION.sql`
3. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
4. **Collez dans SQL Editor** (`Cmd+V`)
5. **Cliquez sur "Run"** (ou `Cmd+Enter`)
6. **Vérifiez** : Vous devriez voir "Success"

### Vérification

```sql
-- Vérifier que les fonctions de validation existent
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE 'validate%';
```

Vous devriez voir **3 fonctions** :
- ✅ `validate_email`
- ✅ `validate_phone`
- ✅ `validate_project_dates`

---

## 📝 Étape 3 : Système de Calendrier

### Appliquer `supabase/CREATE-CALENDAR-SYSTEM.sql`

1. **Dans SQL Editor**, cliquez sur "New query"
2. **Ouvrez le fichier** : `supabase/CREATE-CALENDAR-SYSTEM.sql`
3. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
4. **Collez dans SQL Editor** (`Cmd+V`)
5. **Cliquez sur "Run"** (ou `Cmd+Enter`)
6. **Vérifiez** : Vous devriez voir "Success"

### Vérification

```sql
-- Vérifier que la table events existe
SELECT * FROM public.events LIMIT 1;

-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%event%';
```

Vous devriez voir :
- ✅ Table `events`
- ✅ Fonction `get_events_by_date_range`
- ✅ Fonction `get_today_events`

---

## 📝 Étape 4 : Système d'Emails

### Appliquer `supabase/CREATE-EMAIL-SYSTEM.sql`

1. **Dans SQL Editor**, cliquez sur "New query"
2. **Ouvrez le fichier** : `supabase/CREATE-EMAIL-SYSTEM.sql`
3. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
4. **Collez dans SQL Editor** (`Cmd+V`)
5. **Cliquez sur "Run"** (ou `Cmd+Enter`)
6. **Vérifiez** : Vous devriez voir "Success"

### Vérification

```sql
-- Vérifier que la table email_queue existe
SELECT * FROM public.email_queue LIMIT 1;

-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%email%' OR routine_name LIKE '%reminder%';
```

Vous devriez voir :
- ✅ Table `email_queue`
- ✅ Fonction `send_project_confirmation_email`
- ✅ Fonction `send_overdue_project_reminders`

---

## 📝 Étape 5 : Configuration Storage

### Étape 5.1 : Créer le Bucket

1. **Dans Supabase Dashboard**, allez dans **Storage** (📦 dans le menu)
2. **Cliquez sur "New bucket"**
3. **Configurez le bucket** :
   - **Name** : `images`
   - **Public bucket** : ✅ **Activé**
   - **File size limit** : `5242880` (5 MB)
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`
4. **Cliquez sur "Create bucket"**

### Étape 5.2 : Appliquer les Politiques RLS

1. **Dans SQL Editor**, cliquez sur "New query"
2. **Ouvrez le fichier** : `supabase/CONFIGURE-STORAGE.sql`
3. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
4. **Collez dans SQL Editor** (`Cmd+V`)
5. **Cliquez sur "Run"** (ou `Cmd+Enter`)
6. **Vérifiez** : Vous devriez voir "Success"

### Vérification

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE name = 'images';

-- Vérifier les politiques
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';
```

Vous devriez voir :
- ✅ Bucket `images`
- ✅ **4 politiques** RLS

---

## 🧪 Tests Fonctionnels

### Test 1 : Calendrier

1. **Dans l'application**, allez dans **Calendrier**
2. **Cliquez sur "Nouvel événement"**
3. **Remplissez le formulaire** :
   - Titre : "Test événement"
   - Type : Réunion
   - Date de début : Aujourd'hui
   - Date de fin : Aujourd'hui
4. **Cliquez sur "Créer"**
5. **Vérifiez** que l'événement apparaît dans le calendrier

### Test 2 : Création de Projet

1. **Dans l'application**, allez dans **Chantiers**
2. **Cliquez sur "Nouveau chantier"**
3. **Remplissez le formulaire** :
   - Nom : "Test projet"
   - Statut : Planifié
   - Budget : 10000
4. **Cliquez sur "Créer"**
5. **Vérifiez** :
   - Le projet apparaît dans la liste
   - Une notification est créée
   - Un email est ajouté à la queue (si configuré)

### Test 3 : Upload d'Image

1. **Dans l'application**, créez ou modifiez un projet
2. **Uploadez une image** dans le formulaire
3. **Vérifiez** :
   - L'image s'affiche en prévisualisation
   - L'image est sauvegardée
   - L'image est accessible

### Test 4 : Notifications

1. **Dans l'application**, créez un projet
2. **Vérifiez** que la cloche de notifications affiche un badge
3. **Cliquez sur la cloche**
4. **Vérifiez** que la notification apparaît

---

## 🔧 Configuration Optionnelle

### Configurer Resend (Emails)

1. **Créez un compte** : https://resend.com
2. **Générez une clé API** : Settings > API Keys > Create API Key
3. **Dans Supabase Dashboard** :
   - Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Ajoutez : `RESEND_API_KEY` = votre clé API Resend
4. **Changez l'adresse email d'envoi** dans :
   - `supabase/functions/send-email/index.ts` (ligne ~70)
   - `supabase/functions/process-email-queue/index.ts` (ligne ~60)

### Configurer les Cron Jobs

Voir `APPLIQUER-SYSTEME-EMAILS.md` section "Configurer les Cron Jobs"

---

## ✅ Checklist Complète

### Scripts SQL
- [ ] `APPLY-MIGRATION.sql` appliqué
- [ ] `ADD-VALIDATION.sql` appliqué
- [ ] `CREATE-CALENDAR-SYSTEM.sql` appliqué
- [ ] `CREATE-EMAIL-SYSTEM.sql` appliqué
- [ ] `CONFIGURE-STORAGE.sql` appliqué

### Storage
- [ ] Bucket `images` créé
- [ ] Bucket configuré comme public
- [ ] Politiques RLS configurées

### Tests
- [ ] Calendrier fonctionne
- [ ] Création de projet fonctionne
- [ ] Upload d'image fonctionne
- [ ] Notifications fonctionnent

### Configuration Optionnelle
- [ ] Resend API configuré (optionnel)
- [ ] Cron jobs configurés (optionnel)

---

## 🆘 Dépannage

### Erreur : "relation does not exist"

**Solution** : Vérifiez que vous avez appliqué les scripts SQL dans le bon ordre.

### Erreur : "permission denied"

**Solution** : Vérifiez que les politiques RLS sont correctement configurées.

### Erreur : "bucket not found"

**Solution** : Vérifiez que le bucket `images` existe dans Storage.

### Les événements ne s'affichent pas

**Solution** : 
1. Vérifiez que la table `events` existe
2. Vérifiez que les politiques RLS sont configurées
3. Vérifiez que l'utilisateur est connecté

### Les emails ne sont pas envoyés

**Solution** :
1. Vérifiez que la table `email_queue` existe
2. Vérifiez que Resend API est configuré (si vous voulez envoyer de vrais emails)
3. Vérifiez que les cron jobs sont configurés

---

## 📊 Résumé

### Scripts SQL à Appliquer

1. ✅ `APPLY-MIGRATION.sql` - Tables principales
2. ✅ `ADD-VALIDATION.sql` - Validation côté serveur
3. ✅ `CREATE-CALENDAR-SYSTEM.sql` - Système de calendrier
4. ✅ `CREATE-EMAIL-SYSTEM.sql` - Système d'emails
5. ✅ `CONFIGURE-STORAGE.sql` - Configuration Storage

### Configuration Requise

1. ✅ Créer le bucket `images` dans Storage
2. ⚠️ Configurer Resend API (optionnel)
3. ⚠️ Configurer les cron jobs (optionnel)

### Tests à Effectuer

1. ✅ Test du calendrier
2. ✅ Test de création de projet
3. ✅ Test d'upload d'image
4. ✅ Test des notifications

---

## 🎉 C'est Fait !

**Une fois toutes les étapes terminées, votre SaaS sera 100% fonctionnel !**

**Temps estimé** : 15-30 minutes

**Besoin d'aide ?** Consultez les guides détaillés :
- `APPLIQUER-CALENDRIER.md`
- `APPLIQUER-SYSTEME-EMAILS.md`
- `APPLIQUER-STORAGE-COMPLET.md`

---

**Bon courage ! 🚀**

