# 📧 Système d'Emails Automatiques - Guide Complet

## 📋 Vue d'Ensemble

Ce système permet d'envoyer automatiquement des emails pour :
- ✅ Confirmations de projets
- ✅ Relances pour projets en retard
- ✅ Notifications de changement de statut
- ✅ Rappels pour projets à échéance

**Tout est AUTOMATIQUE** grâce aux triggers SQL et aux cron jobs !

---

## 🚀 Installation en 3 Étapes

### Étape 1 : Appliquer le Script SQL

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor** (💬 dans le menu)
3. **Cliquez sur "New query"**
4. **Ouvrez le fichier** : `supabase/CREATE-EMAIL-SYSTEM.sql`
5. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
6. **Collez dans SQL Editor** (`Cmd+V`)
7. **Cliquez sur "Run"** (ou `Cmd+Enter`)
8. **Vérifiez** : Vous devriez voir "Success"

---

### Étape 2 : Configurer le Service d'Email (Optionnel mais Recommandé)

#### Option A : Resend (Recommandé - Gratuit jusqu'à 100 emails/jour)

1. **Créez un compte** : https://resend.com
2. **Générez une clé API** : Settings > API Keys > Create API Key
3. **Dans Supabase Dashboard** :
   - Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Ajoutez : `RESEND_API_KEY` = votre clé API Resend
4. **Changez l'adresse email d'envoi** dans :
   - `supabase/functions/send-email/index.ts` (ligne ~70)
   - `supabase/functions/process-email-queue/index.ts` (ligne ~60)
   - Remplacez `noreply@edifice-opus-one.com` par votre domaine

#### Option B : Sans Service d'Email (Simulation)

- Les emails seront stockés dans la table `email_queue`
- Ils seront marqués comme "sent" mais ne seront pas réellement envoyés
- Utile pour tester sans configurer un service d'email

---

### Étape 3 : Configurer les Cron Jobs

#### Option A : Via Supabase Dashboard (Recommandé)

1. **Dans Supabase Dashboard** :
   - Allez dans **Database** > **Cron Jobs**
   - Cliquez sur **New Cron Job**

2. **Cron Job 1 : Traiter la Queue d'Emails** (toutes les 5 minutes)
   - **Schedule** : `*/5 * * * *` (toutes les 5 minutes)
   - **Function** : `process-email-queue`
   - **Headers** : `Authorization: Bearer YOUR_CRON_SECRET` (optionnel)

3. **Cron Job 2 : Envoyer les Relances** (tous les jours à 9h)
   - **Schedule** : `0 9 * * *` (9h du matin tous les jours)
   - **Function** : `send-reminders`
   - **Headers** : `Authorization: Bearer YOUR_CRON_SECRET` (optionnel)

#### Option B : Via pg_cron (SQL)

Exécutez dans SQL Editor :

```sql
-- Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job pour traiter la queue d'emails (toutes les 5 minutes)
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Cron job pour envoyer les relances (tous les jours à 9h)
SELECT cron.schedule(
  'send-reminders',
  '0 9 * * *', -- 9h du matin tous les jours
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**⚠️ Remplacez** :
- `YOUR_PROJECT_REF` : Votre référence de projet Supabase
- `YOUR_ANON_KEY` : Votre clé anonyme Supabase (Settings > API)

---

## ✅ Vérification

### Vérifier que les Tables sont Créées

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier la table email_queue
SELECT * FROM public.email_queue LIMIT 5;

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

### Vérifier les Triggers

```sql
-- Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%notify%' OR trigger_name LIKE '%email%');
```

Vous devriez voir :
- ✅ `trigger_notify_project_created`
- ✅ `trigger_notify_project_overdue`
- ✅ `trigger_notify_project_status_change`
- ✅ `trigger_notify_client_created`

### Tester les Emails

1. **Créez un nouveau projet** dans l'application
2. **Vérifiez la table `email_queue`** :
   ```sql
   SELECT * FROM public.email_queue ORDER BY created_at DESC LIMIT 5;
   ```
3. **Attendez 5 minutes** (ou exécutez manuellement `process-email-queue`)
4. **Vérifiez** que l'email est marqué comme "sent"

---

## 🔧 Configuration Avancée

### Changer la Fréquence des Cron Jobs

#### Traiter les Emails plus Souvent

Dans le cron job `process-email-queue`, changez :
- `*/5 * * * *` → `*/1 * * * *` (toutes les minutes)
- `*/5 * * * *` → `*/10 * * * *` (toutes les 10 minutes)

#### Envoyer les Relances à une Autre Heure

Dans le cron job `send-reminders`, changez :
- `0 9 * * *` → `0 8 * * *` (8h du matin)
- `0 9 * * *` → `0 18 * * *` (18h)

### Configurer une Clé Secrète pour les Cron Jobs

1. **Dans Supabase Dashboard** :
   - Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Ajoutez : `CRON_SECRET` = votre clé secrète (ex: `my-super-secret-key-123`)

2. **Dans les fonctions Edge** :
   - Les fonctions vérifieront automatiquement cette clé
   - Seuls les appels avec la bonne clé seront acceptés

### Désactiver les Emails pour un Utilisateur

Dans **SQL Editor** :

```sql
-- Désactiver les notifications email pour un utilisateur
UPDATE public.user_settings
SET email_notifications = false
WHERE user_id = 'USER_ID_HERE';
```

Ou via l'interface dans **Paramètres** > **Notifications**.

---

## 📊 Monitoring

### Voir les Emails Envoyés

```sql
-- Emails envoyés aujourd'hui
SELECT COUNT(*) 
FROM public.email_queue 
WHERE status = 'sent' 
AND DATE(sent_at) = CURRENT_DATE;

-- Emails en attente
SELECT COUNT(*) 
FROM public.email_queue 
WHERE status = 'pending';

-- Emails échoués
SELECT COUNT(*) 
FROM public.email_queue 
WHERE status = 'failed';
```

### Voir les Détails d'un Email

```sql
SELECT 
  to_email,
  subject,
  type,
  status,
  created_at,
  sent_at,
  error_message
FROM public.email_queue
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🆘 Dépannage

### Les Emails ne sont pas Envoyés

1. **Vérifiez que la queue fonctionne** :
   ```sql
   SELECT * FROM public.email_queue WHERE status = 'pending';
   ```

2. **Vérifiez les logs des Edge Functions** :
   - Dans Supabase Dashboard > Edge Functions > Logs
   - Cherchez les erreurs dans `process-email-queue`

3. **Vérifiez que Resend API Key est configurée** :
   - Settings > Edge Functions > Secrets
   - Vérifiez que `RESEND_API_KEY` existe

### Les Cron Jobs ne Fonctionnent Pas

1. **Vérifiez que les cron jobs sont activés** :
   ```sql
   SELECT * FROM cron.job;
   ```

2. **Vérifiez les logs des cron jobs** :
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```

3. **Testez manuellement les fonctions** :
   - Dans Supabase Dashboard > Edge Functions
   - Cliquez sur `process-email-queue` > "Invoke"
   - Vérifiez la réponse

### Les Emails Arrivent dans les Spams

1. **Configurez SPF et DKIM** dans votre domaine
2. **Utilisez un domaine vérifié** dans Resend
3. **Évitez les mots déclencheurs de spam** dans les sujets

---

## 🎉 C'est Fait !

**Votre système d'emails automatiques est maintenant configuré !**

### Ce qui se Passe Automatiquement :

1. **Création de projet** → Email de confirmation envoyé
2. **Projet en retard** → Notification + email de relance
3. **Projet à échéance** → Notification + email de rappel
4. **Changement de statut** → Notification

### Prochaines Étapes :

1. ✅ Testez en créant un projet
2. ✅ Vérifiez que l'email arrive (ou est dans la queue)
3. ✅ Configurez Resend pour envoyer de vrais emails
4. ✅ Configurez les cron jobs pour l'automatisation

---

## 📝 Résumé des Fichiers

- ✅ `supabase/CREATE-EMAIL-SYSTEM.sql` - Script SQL principal
- ✅ `supabase/functions/send-email/index.ts` - Fonction pour envoyer un email
- ✅ `supabase/functions/process-email-queue/index.ts` - Fonction pour traiter la queue
- ✅ `supabase/functions/send-reminders/index.ts` - Fonction pour les relances
- ✅ `src/services/emailService.ts` - Service frontend pour les emails

---

**Besoin d'aide ? Consultez la section "Dépannage" ou demandez de l'aide !** 📚

