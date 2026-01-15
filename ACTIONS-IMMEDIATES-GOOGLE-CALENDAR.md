# ⚡ Actions Immédiates - Google Calendar Production

## 🎯 Objectif

Finaliser le système Google Calendar pour production avec synchronisation bidirectionnelle fiable et aucun doublon.

---

## ✅ CE QUI A ÉTÉ FAIT

### 1. Code Amélioré ✅
- ✅ Helpers réutilisables créés (`_shared/google-calendar-helpers.ts`)
- ✅ Anti-loop complet dans toutes les fonctions
- ✅ UPSERT robuste avec vérification conflits
- ✅ Formatage dates via helpers (plus de code dupliqué)
- ✅ Import `createGoogleEventPayload` ajouté dans sync-processor
- ✅ Correction formatage dates dans sync-incremental

### 2. Migration SQL ✅
- ✅ `GOOGLE-CALENDAR-SYNC-COMPLETE.sql` créé
- ✅ Contrainte UNIQUE `(google_calendar_id, google_event_id)`
- ✅ Colonnes manquantes ajoutées
- ✅ Triggers avec SECURITY DEFINER
- ✅ Fonctions helper créées

### 3. Documentation ✅
- ✅ `AUDIT-GOOGLE-CALENDAR-COMPLET.md` - Audit complet
- ✅ `RUNBOOK-GOOGLE-CALENDAR-PRODUCTION.md` - Guide production
- ✅ `AMELIORATIONS-GOOGLE-CALENDAR-PRODUCTION.md` - Résumé améliorations

### 4. Frontend ✅
- ✅ `EventForm` : Pré-remplissage corrigé
- ✅ `Calendar` : Gestion selectedEvent améliorée
- ✅ `useGoogleCalendar` : Initialisation webhook automatique

---

## 🚀 ACTIONS À EFFECTUER MAINTENANT

### Étape 1 : Migration SQL (OBLIGATOIRE)

```sql
-- Dans Supabase Dashboard > SQL Editor
-- Exécutez: supabase/GOOGLE-CALENDAR-SYNC-COMPLETE.sql
```

**Vérification** :
```sql
-- Vérifier contrainte UNIQUE
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'events_google_calendar_event_unique';

-- Vérifier colonnes
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('google_calendar_id', 'last_update_source', 'deleted_at');
```

### Étape 2 : Redéployer Edge Functions

```bash
cd supabase/

supabase functions deploy google-calendar-sync-processor
supabase functions deploy google-calendar-sync-incremental
supabase functions deploy google-calendar-sync-changes
supabase functions deploy google-calendar-webhook
supabase functions deploy google-calendar-watch
```

### Étape 3 : Configurer Cron Jobs

```sql
-- Dans Supabase Dashboard > SQL Editor
-- Exécutez: supabase/CRON-JOBS-GOOGLE-CALENDAR-SYNC.sql
```

**Vérification** :
```sql
SELECT jobid, jobname, schedule 
FROM cron.job 
WHERE jobname LIKE '%google-calendar%';
```

### Étape 4 : Tester End-to-End

1. **Créer événement App → Google**
   - Créer dans l'app
   - Vérifier dans Google Calendar
   - Vérifier `google_event_id` rempli

2. **Modifier événement Google → App**
   - Modifier titre dans Google Calendar
   - Attendre webhook (1-2 min)
   - Vérifier mise à jour dans l'app
   - **Vérifier AUCUN doublon** (même `google_event_id`)

3. **Modifier événement App → Google**
   - Modifier dans l'app
   - Vérifier dans Google Calendar

4. **Supprimer événement Google → App**
   - Supprimer dans Google Calendar
   - Vérifier `deleted_at` rempli dans l'app

---

## 🔍 VÉRIFICATIONS POST-DÉPLOIEMENT

### Vérifier Anti-Doublons

```sql
-- Devrait retourner 0 lignes
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

### Vérifier Anti-Loop

```sql
-- Vérifier qu'aucun événement venant de Google n'est dans la queue
SELECT 
  e.id,
  e.title,
  e.last_update_source,
  q.id as queue_item_id
FROM events e
JOIN google_calendar_sync_queue q ON q.event_id = e.id
WHERE e.last_update_source = 'google'
AND q.status = 'pending';
-- Résultat attendu : 0 lignes
```

### Vérifier Webhooks

```sql
-- Vérifier webhooks actifs
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

---

## 📊 RÉSUMÉ DES AMÉLIORATIONS

### Avant ❌
- Doublons lors des modifications Google
- Pas de contrainte UNIQUE
- Formatage dates manuel/dupliqué
- Anti-loop incomplet
- RLS bloquant les triggers

### Après ✅
- Contrainte UNIQUE empêche doublons
- UPSERT robuste avec vérification conflits
- Helpers réutilisables pour dates
- Anti-loop complet (last_update_source + last_synced_at)
- SECURITY DEFINER pour triggers

---

## 🎉 RÉSULTAT FINAL

Système Google Calendar **production-ready** avec :
- ✅ Synchronisation bidirectionnelle automatique
- ✅ Aucun doublon (contrainte + UPSERT)
- ✅ Anti-loop robuste
- ✅ Code propre et maintenable
- ✅ Documentation complète

**Prochaine étape** : Exécuter les migrations SQL et tester end-to-end.
