# 🔄 Guide Complet : Synchronisation Bidirectionnelle Google Calendar

## 🎯 Objectif

Synchronisation **automatique et bidirectionnelle** entre Google Calendar et votre app :
- ✅ **App → Google** : Création/modification/suppression automatique
- ✅ **Google → App** : Webhooks + syncToken pour changements en temps réel
- ✅ **Aucun doublon** : Contrainte UNIQUE + UPSERT
- ✅ **Anti-loop** : `last_update_source` évite les boucles infinies

---

## 📋 Prérequis

1. **Supabase** : Projet configuré avec Edge Functions activées
2. **Google Cloud Console** : Compte avec Calendar API activée
3. **OAuth 2.0** : Credentials configurés (Client ID + Secret)
4. **HTTPS** : URL publique pour webhooks (obligatoire)

---

## 🚀 Étape 1 : Migration SQL

### 1.1 Exécuter la migration complète

```sql
-- Fichier: supabase/GOOGLE-CALENDAR-SYNC-COMPLETE.sql
-- Exécutez dans Supabase Dashboard > SQL Editor
```

**Ce script crée** :
- ✅ Colonnes manquantes (`google_calendar_id`, `google_updated_at`, `last_update_source`, `deleted_at`)
- ✅ Contrainte UNIQUE `(google_calendar_id, google_event_id)`
- ✅ Tables `google_calendar_webhooks` et `google_calendar_sync_queue`
- ✅ Triggers pour queue automatique (App → Google)
- ✅ Fonctions helper (`get_valid_google_calendar_token`, `cleanup_*`)
- ✅ Index pour performances
- ✅ Nettoyage des doublons existants

### 1.2 Vérifier la migration

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

## 🔧 Étape 2 : Configuration Google Cloud Console

### 2.1 Activer Calendar API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. **APIs & Services** > **Library**
4. Recherchez "Google Calendar API"
5. Cliquez sur **Enable**

### 2.2 Configurer OAuth Consent Screen

1. **APIs & Services** > **OAuth consent screen**
2. Choisissez **External** (ou Internal si G Suite)
3. Remplissez :
   - **App name** : Votre app
   - **User support email** : Votre email
   - **Developer contact** : Votre email
4. **Scopes** : Ajoutez
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. **Test users** : Ajoutez vos emails de test
6. **Save and Continue**

### 2.3 Créer OAuth 2.0 Credentials

1. **APIs & Services** > **Credentials**
2. **Create Credentials** > **OAuth client ID**
3. **Application type** : Web application
4. **Name** : Votre app
5. **Authorized redirect URIs** :
   ```
   https://votre-projet.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
   ```
6. **Save**
7. **Copiez** le **Client ID** et **Client Secret**

### 2.4 Configurer Domain Verification (pour webhooks)

1. **APIs & Services** > **Domain verification**
2. Ajoutez votre domaine Supabase :
   ```
   votre-projet.supabase.co
   ```
3. Suivez les instructions de vérification (DNS TXT record)

---

## 🔐 Étape 3 : Variables d'Environnement Supabase

### 3.1 Secrets Supabase

Allez dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets**

Ajoutez :

```bash
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=https://votre-projet.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
WEBHOOK_BASE_URL=https://votre-projet.supabase.co/functions/v1/google-calendar-webhook
```

### 3.2 Vérifier les secrets

```bash
# Via Supabase CLI
supabase secrets list
```

---

## 📦 Étape 4 : Déployer les Edge Functions

### 4.1 Déployer toutes les fonctions

```bash
cd supabase/

# Fonction de synchronisation incrémentale (Google → App)
supabase functions deploy google-calendar-sync-incremental

# Fonction de traitement de la queue (App → Google)
supabase functions deploy google-calendar-sync-processor

# Fonction webhook receiver (notifications Google)
supabase functions deploy google-calendar-webhook

# Fonction pour créer/renouveler webhooks (Watch API)
supabase functions deploy google-calendar-watch

# Fonction pour récupérer changements après webhook
supabase functions deploy google-calendar-sync-changes
```

### 4.2 Vérifier les déploiements

```bash
supabase functions list
```

Toutes les fonctions doivent être listées avec leur URL.

---

## ⏰ Étape 5 : Configurer les Cron Jobs

### 5.1 Activer pg_cron

```sql
-- Vérifier que pg_cron est activé
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Si pas activé :
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 5.2 Créer les cron jobs

Exécutez le script : `supabase/CRON-JOBS-GOOGLE-CALENDAR-SYNC.sql`

**Jobs créés** :
1. **process-google-calendar-sync-queue** : Toutes les 5 minutes
   - Traite la queue App → Google
2. **sync-google-calendar-incremental** : Toutes les 15 minutes
   - Sync incrémentale Google → App (fallback si webhook échoue)
3. **cleanup-google-calendar-sync-queue** : Tous les jours
   - Nettoie la queue (supprime items complétés > 7 jours)
4. **renew-google-calendar-webhooks** : Tous les jours
   - Renouvelle les webhooks expirant dans 24h
5. **cleanup-expired-google-webhooks** : Tous les jours
   - Désactive les webhooks expirés

### 5.3 Vérifier les cron jobs

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%google%';
```

---

## 🔗 Étape 6 : Initialiser la Connexion Google Calendar

### 6.1 Connexion OAuth (Frontend)

1. Dans votre app, allez dans **Paramètres** > **Google Calendar**
2. Cliquez sur **Connecter Google Calendar**
3. Autorisez l'accès
4. Le `access_token` et `refresh_token` sont stockés dans `google_calendar_connections`

### 6.2 Initialiser le Webhook (Watch API)

Après la connexion OAuth, initialisez le webhook :

```typescript
// Dans votre app frontend
const { data, error } = await supabase.functions.invoke('google-calendar-watch', {
  body: {
    company_id: currentCompanyId,
  },
});
```

**Ce que fait cette fonction** :
- ✅ Vérifie qu'une connexion Google existe
- ✅ Rafraîchit le token si nécessaire
- ✅ Appelle Google Calendar `events/watch` API
- ✅ Stocke `channel_id`, `resource_id`, `expiration` dans `google_calendar_webhooks`
- ✅ Configure l'URL webhook : `WEBHOOK_BASE_URL`

### 6.3 Vérifier le webhook

```sql
SELECT 
  id,
  company_id,
  calendar_id,
  channel_id,
  resource_id,
  expiration_timestamp,
  enabled,
  created_at
FROM google_calendar_webhooks
WHERE enabled = true
ORDER BY created_at DESC;
```

---

## 🧪 Étape 7 : Tests

### Test 1 : Créer un événement dans l'app

1. **Créer** un événement dans votre app
2. **Vérifier** dans Supabase :
   ```sql
   SELECT * FROM google_calendar_sync_queue 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Attendre** 5 minutes (cron job) ou déclencher manuellement :
   ```bash
   curl -X POST https://votre-projet.supabase.co/functions/v1/google-calendar-sync-processor \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```
4. **Vérifier** dans Google Calendar que l'événement apparaît
5. **Vérifier** dans Supabase que `events.google_event_id` est rempli

### Test 2 : Modifier un événement dans Google Calendar

1. **Modifier** le titre d'un événement dans Google Calendar
2. **Attendre** la notification webhook (max 1-2 minutes)
3. **Vérifier** dans Supabase que l'événement est mis à jour :
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
4. **Vérifier** qu'il n'y a **PAS** de doublon (même `google_event_id`)

### Test 3 : Supprimer un événement dans Google Calendar

1. **Supprimer** un événement dans Google Calendar
2. **Attendre** la notification webhook
3. **Vérifier** dans Supabase que `events.deleted_at` est rempli :
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
4. **Vérifier** que l'événement n'apparaît plus dans le calendrier frontend

### Test 4 : Modifier un événement dans l'app

1. **Modifier** le titre d'un événement dans l'app
2. **Vérifier** dans Supabase que `events.last_update_source = 'app'`
3. **Attendre** le traitement de la queue (5 minutes max)
4. **Vérifier** dans Google Calendar que la modification apparaît

### Test 5 : Vérifier l'anti-doublons

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

## 🔍 Monitoring et Debugging

### Logs Edge Functions

```bash
# Voir les logs en temps réel
supabase functions logs google-calendar-sync-incremental --follow
supabase functions logs google-calendar-webhook --follow
supabase functions logs google-calendar-sync-processor --follow
```

### Vérifier la queue

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

### Vérifier les webhooks

```sql
-- Webhooks actifs
SELECT 
  id,
  company_id,
  calendar_id,
  channel_id,
  expiration_timestamp,
  enabled,
  EXTRACT(EPOCH FROM (to_timestamp(expiration_timestamp / 1000) - now())) / 3600 as hours_until_expiration
FROM google_calendar_webhooks
WHERE enabled = true
ORDER BY expiration_timestamp ASC;
```

### Vérifier les connexions Google

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

## ⚠️ Dépannage

### Problème : Les doublons persistent

**Solution** :
1. Vérifier que la contrainte UNIQUE existe :
   ```sql
   SELECT * FROM pg_constraint 
   WHERE conname = 'events_google_calendar_event_unique';
   ```
2. Vérifier que `google_calendar_id` est rempli :
   ```sql
   SELECT COUNT(*) FROM events 
   WHERE google_event_id IS NOT NULL 
   AND google_calendar_id IS NULL;
   ```
3. Exécuter le nettoyage manuel (voir migration SQL)

### Problème : Les modifications Google ne se reflètent pas

**Solution** :
1. Vérifier que les webhooks sont actifs :
   ```sql
   SELECT * FROM google_calendar_webhooks 
   WHERE enabled = true 
   AND expiration_timestamp > EXTRACT(EPOCH FROM now())::BIGINT * 1000;
   ```
2. Vérifier les logs du webhook :
   ```bash
   supabase functions logs google-calendar-webhook --follow
   ```
3. Déclencher manuellement la sync :
   ```bash
   curl -X POST https://votre-projet.supabase.co/functions/v1/google-calendar-sync-changes \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"company_id": "xxx", "calendar_id": "yyy"}'
   ```

### Problème : Les modifications App ne se reflètent pas dans Google

**Solution** :
1. Vérifier la queue :
   ```sql
   SELECT * FROM google_calendar_sync_queue 
   WHERE status = 'pending' 
   ORDER BY created_at ASC;
   ```
2. Vérifier les logs du processor :
   ```bash
   supabase functions logs google-calendar-sync-processor --follow
   ```
3. Vérifier que le token n'est pas expiré :
   ```sql
   SELECT 
     id,
     company_id,
     expires_at,
     expires_at > now() as is_valid
   FROM google_calendar_connections
   WHERE enabled = true;
   ```

### Problème : Webhook expire trop souvent

**Solution** :
- Les webhooks Google expirent après 7 jours max
- Le cron job `renew-google-calendar-webhooks` renouvelle automatiquement
- Vérifier qu'il s'exécute :
  ```sql
  SELECT * FROM cron.job_run_history 
  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'renew-google-calendar-webhooks')
  ORDER BY start_time DESC 
  LIMIT 5;
  ```

---

## ✅ Checklist de Déploiement

- [ ] Migration SQL exécutée (`GOOGLE-CALENDAR-SYNC-COMPLETE.sql`)
- [ ] Google Cloud Console configuré (Calendar API, OAuth, Domain)
- [ ] Secrets Supabase configurés (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.)
- [ ] Edge Functions déployées (5 fonctions)
- [ ] Cron jobs configurés (5 jobs)
- [ ] Connexion OAuth testée (frontend)
- [ ] Webhook initialisé (google-calendar-watch)
- [ ] Test création App → Google réussi
- [ ] Test modification Google → App réussi (pas de doublon)
- [ ] Test suppression Google → App réussi
- [ ] Test modification App → Google réussi
- [ ] Aucun doublon détecté après tests

---

## 🎉 Résultat Final

Après déploiement complet :

- ✅ **Création App** → Créé dans Google Calendar avec `google_event_id` stocké
- ✅ **Modification App** → Modifié dans Google Calendar
- ✅ **Suppression App** → Supprimé dans Google Calendar
- ✅ **Modification Google** → Mis à jour dans l'app (pas de doublon)
- ✅ **Suppression Google** → Soft delete (`deleted_at` rempli)
- ✅ **Aucun doublon** : Contrainte UNIQUE empêche les doublons
- ✅ **Anti-loop** : `last_update_source` évite les boucles infinies
- ✅ **Temps réel** : Webhooks + syncToken pour synchronisation rapide

---

## 📚 Documentation Supplémentaire

- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Google Calendar Watch API](https://developers.google.com/calendar/api/v3/push)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
