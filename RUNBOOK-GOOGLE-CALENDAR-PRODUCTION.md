# 🚀 RUNBOOK - Google Calendar Sync Production

## 📋 Vue d'Ensemble

Système de synchronisation bidirectionnelle automatique entre l'application et Google Calendar, avec :
- ✅ OAuth PKCE sécurisé
- ✅ Synchronisation App → Google (via queue)
- ✅ Synchronisation Google → App (via webhooks + syncToken)
- ✅ Anti-doublons (contrainte UNIQUE)
- ✅ Anti-loop (last_update_source)
- ✅ Gestion robuste des erreurs

---

## 🔧 1. VARIABLES D'ENVIRONNEMENT

### Supabase Secrets (Edge Functions)

```bash
# OAuth Google
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce

# Webhook
WEBHOOK_BASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-webhook
```

**Où configurer** : Supabase Dashboard > Project Settings > Edge Functions > Secrets

---

## 🌐 2. SETUP GOOGLE CLOUD CONSOLE

### 2.1. Activer Calendar API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. **APIs & Services** > **Library**
4. Recherchez "Google Calendar API"
5. Cliquez sur **Enable**

### 2.2. Configurer OAuth Consent Screen

1. **APIs & Services** > **OAuth consent screen**
2. **User Type** : External (ou Internal si G Suite)
3. Remplissez :
   - **App name** : BTP Smart Pro
   - **User support email** : votre email
   - **Developer contact** : votre email
4. **Scopes** : Ajoutez
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. **Test users** : Ajoutez vos emails de test
6. **Save and Continue**

### 2.3. Créer OAuth 2.0 Credentials

1. **APIs & Services** > **Credentials**
2. **Create Credentials** > **OAuth client ID**
3. **Application type** : Web application
4. **Name** : BTP Smart Pro Web
5. **Authorized redirect URIs** :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
   ```
6. **Save**
7. **Copiez** le **Client ID** et **Client Secret**

### 2.4. Configurer Domain Verification (pour webhooks)

1. **APIs & Services** > **Domain verification**
2. Ajoutez votre domaine Supabase :
   ```
   renmjmqlmafqjzldmsgs.supabase.co
   ```
3. Suivez les instructions de vérification (DNS TXT record)

---

## 🗄️ 3. MIGRATIONS SQL

### 3.1. Migration Principale

Exécutez dans Supabase Dashboard > SQL Editor :

```sql
-- Fichier: supabase/GOOGLE-CALENDAR-SYNC-COMPLETE.sql
```

**Ce script crée** :
- ✅ Colonnes manquantes (`google_calendar_id`, `google_updated_at`, `last_update_source`, `deleted_at`)
- ✅ Contrainte UNIQUE `(google_calendar_id, google_event_id)`
- ✅ Tables `google_calendar_webhooks`, `google_calendar_sync_queue`
- ✅ Triggers pour queue automatique
- ✅ Fonctions helper (`get_valid_google_calendar_token`, `cleanup_*`)
- ✅ Index pour performances

### 3.2. Vérification Post-Migration

```sql
-- Vérifier les colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'events'
AND column_name IN (
  'google_calendar_id',
  'google_event_id',
  'google_updated_at',
  'last_update_source',
  'deleted_at',
  'last_synced_at'
)
ORDER BY column_name;

-- Vérifier la contrainte UNIQUE
SELECT 
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass
AND conname = 'events_google_calendar_event_unique';

-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('google_calendar_webhooks', 'google_calendar_sync_queue');
```

---

## ⏰ 4. CRON JOBS

### 4.1. Activer pg_cron

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 4.2. Exécuter le Script

```sql
-- Fichier: supabase/CRON-JOBS-GOOGLE-CALENDAR-SYNC.sql
```

**Cron jobs créés** :
1. `process-google-calendar-sync-queue` : Toutes les 5 minutes (App → Google)
2. `sync-google-calendar-incremental` : Toutes les 15 minutes (Google → App, fallback)
3. `cleanup-google-calendar-sync-queue` : Quotidien 2h (nettoyage)
4. `renew-google-calendar-webhooks` : Quotidien 3h (renouvellement)
5. `cleanup-expired-google-webhooks` : Quotidien 4h (nettoyage)

### 4.3. Vérification

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job 
WHERE jobname LIKE '%google-calendar%'
ORDER BY jobname;
```

---

## 📦 5. DÉPLOIEMENT EDGE FUNCTIONS

```bash
cd supabase/

# Fonctions principales
supabase functions deploy google-calendar-oauth-entreprise-pkce
supabase functions deploy google-calendar-sync-processor
supabase functions deploy google-calendar-sync-incremental
supabase functions deploy google-calendar-sync-changes
supabase functions deploy google-calendar-webhook
supabase functions deploy google-calendar-watch
```

---

## 🔗 6. INITIALISATION WEBHOOK

### 6.1. Connexion OAuth (Frontend)

1. Dans l'app : **Paramètres** > **Google Calendar**
2. Cliquez sur **Connecter Google Calendar**
3. Autorisez l'accès
4. Le webhook est initialisé automatiquement après connexion

### 6.2. Vérification Webhook

```sql
SELECT 
  id,
  company_id,
  calendar_id,
  channel_id,
  resource_id,
  expiration_timestamp,
  enabled,
  EXTRACT(EPOCH FROM (to_timestamp(expiration_timestamp / 1000) - now())) / 3600 as hours_until_expiration
FROM google_calendar_webhooks
WHERE enabled = true
ORDER BY expiration_timestamp ASC;
```

---

## 🧪 7. TESTS

### Test 1 : Créer événement App → Google

1. Créer un événement dans l'app
2. Vérifier la queue :
   ```sql
   SELECT * FROM google_calendar_sync_queue 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. Attendre 5 minutes (cron) ou déclencher manuellement
4. Vérifier dans Google Calendar
5. Vérifier que `events.google_event_id` est rempli

### Test 2 : Modifier événement Google → App

1. Modifier le titre d'un événement dans Google Calendar
2. Attendre notification webhook (max 1-2 minutes)
3. Vérifier dans Supabase :
   ```sql
   SELECT 
     id,
     title,
     google_event_id,
     last_update_source,
     last_synced_at,
     google_updated_at
   FROM events
   WHERE google_event_id IS NOT NULL
   ORDER BY last_synced_at DESC
   LIMIT 5;
   ```
4. **Vérifier qu'il n'y a PAS de doublon** (même `google_event_id`)

### Test 3 : Supprimer événement Google → App

1. Supprimer un événement dans Google Calendar
2. Attendre notification webhook
3. Vérifier que `events.deleted_at` est rempli :
   ```sql
   SELECT 
     id,
     title,
     deleted_at,
     last_update_source
   FROM events
   WHERE deleted_at IS NOT NULL
   ORDER BY deleted_at DESC
   LIMIT 5;
   ```

### Test 4 : Modifier événement App → Google

1. Modifier le titre d'un événement dans l'app
2. Vérifier que `events.last_update_source = 'app'`
3. Attendre traitement queue (5 minutes max)
4. Vérifier dans Google Calendar que la modification apparaît

### Test 5 : Anti-Doublons

```sql
-- Compter les doublons (devrait être 0)
SELECT 
  google_calendar_id, 
  google_event_id, 
  COUNT(*) as count
FROM events
WHERE google_calendar_id IS NOT NULL
AND google_event_id IS NOT NULL
GROUP BY google_calendar_id, google_event_id
HAVING COUNT(*) > 1;
```

---

## 🔍 8. MONITORING & DEBUGGING

### 8.1. Logs Edge Functions

```bash
# Logs en temps réel
supabase functions logs google-calendar-sync-incremental --follow
supabase functions logs google-calendar-webhook --follow
supabase functions logs google-calendar-sync-processor --follow
```

### 8.2. Vérifier la Queue

```sql
-- Items en attente
SELECT 
  id,
  company_id,
  event_id,
  action,
  status,
  retry_count,
  error_message,
  created_at
FROM google_calendar_sync_queue
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Items en erreur
SELECT 
  id,
  company_id,
  event_id,
  action,
  status,
  retry_count,
  error_message,
  created_at
FROM google_calendar_sync_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### 8.3. Vérifier les Connexions

```sql
-- Connexions actives
SELECT 
  id,
  company_id,
  calendar_id,
  enabled,
  expires_at,
  sync_token IS NOT NULL as has_sync_token,
  sync_direction
FROM google_calendar_connections
WHERE enabled = true
ORDER BY created_at DESC;
```

---

## 🐛 9. DÉPANNAGE

### Problème : Doublons persistent

**Diagnostic** :
```sql
-- Vérifier contrainte
SELECT * FROM pg_constraint 
WHERE conname = 'events_google_calendar_event_unique';

-- Vérifier google_calendar_id rempli
SELECT COUNT(*) FROM events 
WHERE google_event_id IS NOT NULL 
AND google_calendar_id IS NULL;
```

**Solution** : Exécuter migration SQL + nettoyage manuel si nécessaire

### Problème : Modifications Google ne se reflètent pas

**Diagnostic** :
```sql
-- Vérifier webhooks actifs
SELECT * FROM google_calendar_webhooks 
WHERE enabled = true 
AND expiration_timestamp > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Vérifier logs webhook
-- (voir Supabase Dashboard > Edge Functions > Logs)
```

**Solution** : Vérifier logs, renouveler webhook si expiré

### Problème : Modifications App ne se reflètent pas dans Google

**Diagnostic** :
```sql
-- Vérifier queue
SELECT * FROM google_calendar_sync_queue 
WHERE status = 'pending' 
ORDER BY created_at ASC;

-- Vérifier tokens
SELECT 
  id,
  company_id,
  expires_at,
  expires_at > now() as is_valid
FROM google_calendar_connections
WHERE enabled = true;
```

**Solution** : Vérifier tokens, logs processor, déclencher manuellement si besoin

### Problème : Webhook expire trop souvent

**Solution** : Le cron `renew-google-calendar-webhooks` renouvelle automatiquement. Vérifier qu'il s'exécute :
```sql
SELECT * FROM cron.job_run_history 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'renew-google-calendar-webhooks')
ORDER BY start_time DESC 
LIMIT 5;
```

---

## ✅ 10. CHECKLIST PRODUCTION

### Pré-Déploiement
- [ ] Migration SQL exécutée
- [ ] Variables d'environnement configurées
- [ ] Google Cloud Console configuré
- [ ] Edge Functions déployées
- [ ] Cron jobs configurés

### Post-Déploiement
- [ ] Connexion OAuth testée
- [ ] Webhook initialisé et vérifié
- [ ] Test création App → Google réussi
- [ ] Test modification Google → App réussi (pas de doublon)
- [ ] Test suppression Google → App réussi
- [ ] Test modification App → Google réussi
- [ ] Aucun doublon détecté
- [ ] Logs propres (pas d'erreurs critiques)

---

## 📚 11. ARCHITECTURE TECHNIQUE

### Flux App → Google

1. **Trigger** : INSERT/UPDATE/DELETE sur `events`
2. **Queue** : `queue_google_calendar_sync()` ajoute à `google_calendar_sync_queue`
3. **Processor** : Cron job appelle `google-calendar-sync-processor`
4. **Google API** : Création/modification/suppression événement
5. **Update DB** : Mise à jour `google_event_id`, `last_update_source='app'`

### Flux Google → App

1. **Webhook** : Google envoie notification à `google-calendar-webhook`
2. **Sync** : Webhook déclenche `google-calendar-sync-changes`
3. **Incremental** : Utilise `syncToken` pour récupérer changements
4. **UPSERT** : Mise à jour `events` avec `last_update_source='google'`
5. **Anti-loop** : Les triggers ignorent `last_update_source='google'`

### Anti-Doublons

- **Contrainte UNIQUE** : `(google_calendar_id, google_event_id)`
- **UPSERT** : Utilise `onConflict` sur la contrainte
- **Vérification conflits** : Compare `google_updated_at` pour ignorer updates obsolètes

### Anti-Loop

- **last_update_source** : 'app' ou 'google'
- **last_synced_at** : Timestamp dernière sync
- **Vérification** : Ignorer si `last_update_source='google'` OU `updated_at <= last_synced_at`

---

## 🔐 12. SÉCURITÉ

### RLS Policies

- **events** : SELECT/INSERT/UPDATE/DELETE limité à `user_id = auth.uid()` et `company_id` via `company_users`
- **google_calendar_sync_queue** : SELECT seulement (INSERT via SECURITY DEFINER)
- **google_calendar_webhooks** : SELECT/INSERT/DELETE limité aux admins/owners

### Edge Functions

- Utilisent `SUPABASE_SERVICE_ROLE_KEY` pour contourner RLS
- Validation des tokens OAuth
- Vérification des permissions (owner/admin)

---

## 📊 13. MÉTRIQUES & PERFORMANCE

### Index Créés

- `idx_events_google_calendar_id` (WHERE NOT NULL)
- `idx_events_google_event_id` (WHERE NOT NULL)
- `idx_events_google_composite` (composite)
- `idx_events_deleted_at` (WHERE NOT NULL)
- `idx_events_last_update_source` (WHERE NOT NULL)

### Optimisations

- Sync incrémentale (syncToken) au lieu de full sync
- Queue asynchrone pour éviter les timeouts
- Retry logic avec `max_retries`
- Cleanup automatique des items complétés

---

## 🎯 14. MAINTENANCE

### Quotidien

- Vérifier logs Edge Functions (erreurs critiques)
- Vérifier queue (items bloqués)
- Vérifier webhooks (expiration)

### Hebdomadaire

- Vérifier doublons (requête SQL)
- Vérifier performance (temps de sync)
- Nettoyer données obsolètes

### Mensuel

- Renouveler tokens OAuth si nécessaire
- Vérifier quotas Google Calendar API
- Audit sécurité (RLS, permissions)

---

## 📞 15. SUPPORT

### Logs à Fournir en Cas de Problème

1. **Logs Edge Functions** (Supabase Dashboard)
2. **Requête SQL** : État de la queue, webhooks, connexions
3. **Console Browser** : Erreurs frontend
4. **Google Cloud Console** : Quotas API, erreurs OAuth

### Contacts

- **Documentation Google Calendar API** : https://developers.google.com/calendar/api/v3/reference
- **Documentation Supabase** : https://supabase.com/docs

---

## ✅ RÉSUMÉ

Système prêt pour production avec :
- ✅ Synchronisation bidirectionnelle automatique
- ✅ Anti-doublons (contrainte UNIQUE + UPSERT)
- ✅ Anti-loop (last_update_source)
- ✅ Gestion robuste des erreurs
- ✅ Logs structurés
- ✅ Monitoring et debugging

**Prochaine étape** : Exécuter les migrations SQL et tester end-to-end.
