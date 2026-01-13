# 🔄 Guide Complet : Synchronisation Bidirectionnelle Google Calendar

## 📋 Vue d'Ensemble

Ce guide explique comment configurer et utiliser la synchronisation bidirectionnelle automatique entre votre application et Google Calendar.

### Fonctionnalités

- ✅ **App → Google** : Création/modification/suppression automatique
- ✅ **Google → App** : Synchronisation automatique via webhooks
- ✅ **Anti-loop** : Évite les boucles infinies
- ✅ **Sync incrémentale** : Utilise `syncToken` pour éviter de re-télécharger tout
- ✅ **Queue système** : Traitement asynchrone pour éviter les timeouts
- ✅ **Retry automatique** : Gestion des erreurs avec retry

---

## 🚀 Installation

### Étape 1 : Exécuter le SQL

Exécutez dans Supabase SQL Editor :

```sql
-- Fichier: supabase/GOOGLE-CALENDAR-BIDIRECTIONAL-SYNC.sql
```

Ce script :
- Ajoute `updated_source` et `last_synced_at` à `events`
- Ajoute `sync_token` à `google_calendar_connections`
- Crée la table `google_calendar_sync_queue`
- Crée les triggers pour détecter les changements
- Configure l'anti-loop

### Étape 2 : Déployer les Edge Functions

```bash
# Depuis le dossier supabase/
supabase functions deploy google-calendar-sync-processor
supabase functions deploy google-calendar-webhook
supabase functions deploy google-calendar-watch
supabase functions deploy google-calendar-sync-incremental
```

### Étape 3 : Configurer les Variables d'Environnement

Dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=https://votre-projet.supabase.co/auth/v1/callback
WEBHOOK_BASE_URL=https://votre-projet.supabase.co
```

**⚠️ IMPORTANT** : `WEBHOOK_BASE_URL` doit être l'URL publique de votre projet Supabase (HTTPS requis par Google).

---

## 🔧 Configuration Google Cloud Console

### 1. Activer Google Calendar API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. **APIs & Services** → **Library**
4. Recherchez "Google Calendar API"
5. Cliquez sur **Enable**

### 2. Configurer OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. Configurez :
   - **User Type** : External
   - **App name** : Votre nom d'app
   - **User support email** : Votre email
   - **Scopes** : 
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - **Test users** : Ajoutez les emails de test

### 3. Créer OAuth 2.0 Credentials

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. **Application type** : Web application
4. **Authorized redirect URIs** :
   ```
   https://votre-projet.supabase.co/auth/v1/callback
   ```
5. Copiez **Client ID** et **Client Secret**

### 4. Configurer le Domaine Webhook (HTTPS requis)

Google nécessite que votre webhook soit accessible via HTTPS.

**Option A : Supabase (recommandé)**
- Utilisez directement l'URL de votre Edge Function :
  ```
  https://votre-projet.supabase.co/functions/v1/google-calendar-webhook
  ```

**Option B : Domaine personnalisé**
- Configurez un domaine personnalisé dans Supabase
- Ajoutez le domaine dans Google Cloud Console → **APIs & Services** → **Domain verification**

---

## 📊 Architecture

### Flux App → Google

1. **Trigger PostgreSQL** détecte INSERT/UPDATE/DELETE sur `events`
2. **Fonction `queue_google_calendar_sync()`** ajoute à `google_calendar_sync_queue`
3. **Edge Function `google-calendar-sync-processor`** traite la queue
4. **Appel Google Calendar API** (create/update/delete)
5. **Mise à jour** `events.google_event_id` et `synced_with_google`

### Flux Google → App

1. **Google Calendar Watch API** envoie notification au webhook
2. **Edge Function `google-calendar-webhook`** reçoit la notification
3. **Edge Function `google-calendar-sync-incremental`** récupère les changements
4. **Upsert dans `events`** avec `updated_source = 'google'`
5. **Anti-loop** : Les triggers ignorent les changements avec `updated_source = 'google'`

---

## 🔄 Utilisation

### Initialiser les Webhooks Google

Après avoir connecté Google Calendar, initialisez les webhooks :

```typescript
// Depuis le frontend ou via API
const { data, error } = await supabase.functions.invoke("google-calendar-watch", {
  body: { company_id: "votre-company-id" },
});
```

### Traiter la Queue (Cron Job)

Configurez un cron job pour traiter la queue régulièrement :

```bash
# Exemple avec Supabase Cron (pg_cron)
SELECT cron.schedule(
  'process-google-calendar-sync',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://votre-projet.supabase.co/functions/v1/google-calendar-sync-processor',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);
```

### Synchronisation Incrémentale (Cron Job)

Synchroniser depuis Google Calendar :

```bash
# Toutes les 15 minutes
SELECT cron.schedule(
  'sync-google-calendar-incremental',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://votre-projet.supabase.co/functions/v1/google-calendar-sync-incremental',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## 🧪 Tests

### Test 1 : Créer un événement dans l'app

1. Créez un événement dans votre app
2. Vérifiez qu'il apparaît dans Google Calendar
3. Vérifiez que `events.google_event_id` est rempli
4. Vérifiez que `events.synced_with_google = true`

### Test 2 : Modifier un événement dans l'app

1. Modifiez un événement existant
2. Vérifiez que la modification apparaît dans Google Calendar
3. Vérifiez que `events.last_synced_at` est mis à jour

### Test 3 : Supprimer un événement dans l'app

1. Supprimez un événement
2. Vérifiez qu'il est supprimé dans Google Calendar

### Test 4 : Créer un événement dans Google Calendar

1. Créez un événement directement dans Google Calendar
2. Attendez la synchronisation (max 15 minutes)
3. Vérifiez qu'il apparaît dans votre app
4. Vérifiez que `events.updated_source = 'google'`

### Test 5 : Modifier un événement dans Google Calendar

1. Modifiez un événement dans Google Calendar
2. Attendez la synchronisation
3. Vérifiez que la modification apparaît dans l'app
4. Vérifiez que l'événement n'est **pas** renvoyé à Google (anti-loop)

### Test 6 : Supprimer un événement dans Google Calendar

1. Supprimez un événement dans Google Calendar
2. Attendez la synchronisation
3. Vérifiez qu'il est supprimé dans l'app

---

## 🔍 Monitoring

### Vérifier la Queue

```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM public.google_calendar_sync_queue
GROUP BY status;
```

### Vérifier les Erreurs

```sql
SELECT 
  e.id,
  e.title,
  e.google_sync_error,
  q.error_message,
  q.retry_count
FROM public.events e
LEFT JOIN public.google_calendar_sync_queue q ON q.event_id = e.id
WHERE e.google_sync_error IS NOT NULL
   OR q.status = 'failed'
ORDER BY e.updated_at DESC
LIMIT 20;
```

### Vérifier les Webhooks

```sql
SELECT 
  company_id,
  calendar_id,
  channel_id,
  enabled,
  expiration_timestamp,
  CASE 
    WHEN expiration_timestamp < EXTRACT(EPOCH FROM now())::BIGINT * 1000 
    THEN 'Expired' 
    ELSE 'Active' 
  END as status
FROM public.google_calendar_webhooks
ORDER BY expiration_timestamp DESC;
```

---

## ⚠️ Limitations et Bonnes Pratiques

### Quotas Google Calendar API

- **Quota par défaut** : 1,000,000 requêtes/jour
- **Rate limit** : 600 requêtes/seconde/utilisateur
- **Watch API** : Maximum 1 webhook par calendrier
- **Expiration webhook** : Maximum 7 jours (renouvellement automatique recommandé)

### Bonnes Pratiques

1. **Traiter la queue régulièrement** : Toutes les 5 minutes minimum
2. **Renouveler les webhooks** : Avant expiration (jour 6)
3. **Gérer les erreurs** : Logs et alertes sur les échecs
4. **Monitorer les quotas** : Vérifier l'utilisation dans Google Cloud Console
5. **Sync incrémentale** : Toujours utiliser `syncToken` pour éviter de re-télécharger tout

### Gestion des Erreurs

- **Token expiré** : Rafraîchissement automatique
- **SyncToken invalide** : Reset et re-sync complète
- **Webhook expiré** : Désactivation automatique
- **Rate limit** : Retry avec backoff exponentiel (dans la queue)

---

## 🐛 Dépannage

### Les événements ne se synchronisent pas

1. Vérifiez que la connexion Google Calendar est active :
   ```sql
   SELECT * FROM google_calendar_connections 
   WHERE company_id = 'votre-company-id' AND enabled = true;
   ```

2. Vérifiez la queue :
   ```sql
   SELECT * FROM google_calendar_sync_queue 
   WHERE status = 'pending' OR status = 'failed';
   ```

3. Vérifiez les logs de l'Edge Function dans Supabase Dashboard

### Les webhooks ne fonctionnent pas

1. Vérifiez que le webhook est actif :
   ```sql
   SELECT * FROM google_calendar_webhooks 
   WHERE company_id = 'votre-company-id' AND enabled = true;
   ```

2. Vérifiez que `WEBHOOK_BASE_URL` est correctement configuré
3. Vérifiez que l'URL est accessible en HTTPS
4. Vérifiez les logs de `google-calendar-webhook`

### Erreur "SyncToken invalid"

C'est normal si le `syncToken` expire. La fonction réinitialise automatiquement et fait une sync complète.

---

## 📝 Variables d'Environnement Résumé

| Variable | Description | Exemple |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Client ID OAuth Google | `123456789-abc...` |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth | `GOCSPX-abc...` |
| `GOOGLE_REDIRECT_URI` | URI de redirection OAuth | `https://xxx.supabase.co/auth/v1/callback` |
| `WEBHOOK_BASE_URL` | URL publique du projet (HTTPS) | `https://xxx.supabase.co` |

---

## ✅ Checklist de Déploiement

- [ ] SQL exécuté (`GOOGLE-CALENDAR-BIDIRECTIONAL-SYNC.sql`)
- [ ] Edge Functions déployées (4 fonctions)
- [ ] Variables d'environnement configurées
- [ ] Google Calendar API activée
- [ ] OAuth credentials créés
- [ ] Webhooks initialisés (via `google-calendar-watch`)
- [ ] Cron jobs configurés (queue processor + incremental sync)
- [ ] Tests effectués (création, modification, suppression des 2 côtés)
- [ ] Monitoring configuré (logs, alertes)

---

## 🎉 Résultat Final

Après configuration complète :

- ✅ Les événements créés dans l'app apparaissent automatiquement dans Google Calendar
- ✅ Les modifications dans l'app se reflètent dans Google Calendar
- ✅ Les suppressions dans l'app suppriment les événements Google
- ✅ Les événements créés/modifiés/supprimés dans Google Calendar apparaissent dans l'app
- ✅ Aucune boucle infinie (anti-loop fonctionnel)
- ✅ Synchronisation efficace (syncToken incrémentale)
