# 🚀 Guide de Déploiement - Système Automatisé de Notifications

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer et configurer le système automatisé de notifications et d'emails pour votre application BTP.

---

## 🎯 Étape 1 : Créer les Tables et Fonctions SQL

### 1.1 Exécuter le Script SQL

1. **Ouvrez Supabase Dashboard → SQL Editor**
2. **Ouvrez le fichier** : `supabase/AUTOMATED-NOTIFICATIONS-SYSTEM.sql`
3. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
4. **Collez dans SQL Editor** (Cmd+V)
5. **Cliquez sur "Run"** (Cmd+Enter)

**Ce script crée** :
- ✅ Table `payments` pour les paiements
- ✅ Table `notification_log` pour l'historique
- ✅ Colonnes supplémentaires dans les tables existantes
- ✅ Fonctions SQL pour vérifier les conditions
- ✅ Triggers pour mettre à jour les dates

### 1.2 Vérifier les Tables

Exécutez cette requête pour vérifier que tout est créé :

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'notification_log');

-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'check_%';
```

---

## 🎯 Étape 2 : Déployer la Edge Function

### 2.1 Via Supabase CLI

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer la fonction
supabase functions deploy smart-notifications
```

### 2.2 Via Supabase Dashboard

1. **Allez dans Supabase Dashboard → Edge Functions**
2. **Cliquez sur "Create a new function"**
3. **Nommez-la** : `smart-notifications`
4. **Copiez le contenu** de `supabase/functions/smart-notifications/index.ts`
5. **Collez dans l'éditeur**
6. **Cliquez sur "Deploy"**

---

## 🎯 Étape 3 : Configurer les Variables d'Environnement

### 3.1 Dans Supabase Dashboard

1. **Allez dans Settings → Edge Functions → Secrets**
2. **Ajoutez les secrets suivants** :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx  (Optionnel, pour les emails)
CRON_SECRET=your-secret-key-here  (Recommandé pour sécuriser les appels)
```

### 3.2 Obtenir une Clé Resend API (Optionnel)

1. **Créez un compte** sur https://resend.com
2. **Obtenez votre clé API** dans le dashboard
3. **Ajoutez-la** dans les secrets Supabase

**Note** : Si vous n'ajoutez pas `RESEND_API_KEY`, les emails seront mis en queue mais ne seront pas envoyés. Vous pouvez les traiter plus tard avec `process-email-queue`.

---

## 🎯 Étape 4 : Configurer le Cron Job

### 4.1 Option 1 : Via Supabase Dashboard (Recommandé)

1. **Allez dans Database → Cron Jobs**
2. **Cliquez sur "Create a new cron job"**
3. **Configurez** :
   - **Name** : `smart-notifications-hourly`
   - **Schedule** : `0 * * * *` (toutes les heures)
   - **SQL** :
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
     ),
     body := '{}'::jsonb
   );
   ```
4. **Remplacez** :
   - `YOUR_PROJECT_REF` par votre référence de projet
   - `YOUR_SERVICE_ROLE_KEY` par votre clé de service (Settings → API → service_role key)
5. **Cliquez sur "Create"**

### 4.2 Option 2 : Via SQL Editor

Exécutez cette requête dans SQL Editor :

```sql
-- Activer l'extension pg_cron si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Créer le cron job (toutes les heures)
SELECT cron.schedule(
  'smart-notifications-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Vérifier que le cron job est créé
SELECT * FROM cron.job WHERE jobname = 'smart-notifications-hourly';
```

**Remplacez** :
- `YOUR_PROJECT_REF` par votre référence de projet (ex: `renmjmqlmafqjzldmsgs`)
- `YOUR_SERVICE_ROLE_KEY` par votre clé de service

### 4.3 Options de Schedule

- **Toutes les heures** : `0 * * * *`
- **Toutes les 6 heures** : `0 */6 * * *`
- **Tous les jours à 8h** : `0 8 * * *`
- **Toutes les 30 minutes** : `*/30 * * * *`

---

## 🎯 Étape 5 : Tester la Fonction

### 5.1 Test Manuel

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/smart-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5.2 Vérifier les Résultats

1. **Vérifiez les notifications** dans l'application
2. **Vérifiez les emails** dans `email_queue`
3. **Vérifiez les logs** dans `notification_log`

```sql
-- Vérifier les notifications créées
SELECT * FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Vérifier les emails en queue
SELECT * FROM public.email_queue 
WHERE status = 'pending'
ORDER BY created_at DESC 
LIMIT 10;

-- Vérifier les logs
SELECT * FROM public.notification_log 
ORDER BY sent_at DESC 
LIMIT 10;
```

---

## 🎯 Étape 6 : Configurer le Traitement des Emails

### 6.1 Déployer process-email-queue

Si ce n'est pas déjà fait, déployez la fonction `process-email-queue` :

```bash
supabase functions deploy process-email-queue
```

### 6.2 Configurer le Cron Job pour process-email-queue

Créez un cron job pour traiter la queue d'emails toutes les 5 minutes :

```sql
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## ✅ Vérification Finale

### Checklist

- [ ] Tables créées (`payments`, `notification_log`)
- [ ] Fonctions SQL créées (`check_pending_quotes`, etc.)
- [ ] Edge Function `smart-notifications` déployée
- [ ] Variables d'environnement configurées (`RESEND_API_KEY`, `CRON_SECRET`)
- [ ] Cron job configuré pour `smart-notifications`
- [ ] Cron job configuré pour `process-email-queue`
- [ ] Test manuel réussi
- [ ] Notifications créées dans l'application
- [ ] Emails mis en queue

---

## 🆘 Dépannage

### Les notifications ne sont pas créées

1. **Vérifiez les logs** de la Edge Function dans Supabase Dashboard
2. **Vérifiez que les données existent** (devis, projets, etc.)
3. **Vérifiez que les conditions sont remplies** (dates, statuts, etc.)

### Les emails ne sont pas envoyés

1. **Vérifiez que `RESEND_API_KEY` est configuré**
2. **Vérifiez que `process-email-queue` fonctionne**
3. **Vérifiez les logs** dans `email_queue` (status, error_message)

### Le cron job ne s'exécute pas

1. **Vérifiez que l'extension `pg_cron` est activée**
2. **Vérifiez que le cron job est actif** : `SELECT * FROM cron.job;`
3. **Vérifiez les logs** dans Supabase Dashboard → Logs → Postgres Logs

---

## 📊 Monitoring

### Vérifier les Statistiques

```sql
-- Statistiques des notifications
SELECT 
  notification_type,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM public.notification_log
GROUP BY notification_type
ORDER BY count DESC;

-- Statistiques des emails
SELECT 
  status,
  type,
  COUNT(*) as count
FROM public.email_queue
GROUP BY status, type
ORDER BY count DESC;
```

---

## 🎯 Prochaines Étapes

1. ✅ **Tester** le système avec des données réelles
2. ✅ **Ajuster** les délais si nécessaire (3 jours, 7 jours, etc.)
3. ✅ **Personnaliser** les templates d'emails si nécessaire
4. ✅ **Monitorer** les performances et les erreurs

---

**Le système est maintenant configuré et fonctionnel !** 🚀

