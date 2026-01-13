# ⏰ Exécuter les Cron Jobs Google Calendar

## 🚀 Instructions Rapides

### Étape 1 : Vérifier que pg_cron est activé

```sql
-- Dans Supabase Dashboard > SQL Editor
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Si le résultat est vide, activez pg_cron :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Étape 2 : Exécuter le script des cron jobs

```sql
-- Dans Supabase Dashboard > SQL Editor
-- Copiez-collez TOUT le contenu de: supabase/CRON-JOBS-GOOGLE-CALENDAR-SYNC.sql
-- Cliquez sur "Run"
```

### Étape 3 : Vérifier que les cron jobs sont créés

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  command
FROM cron.job 
WHERE jobname LIKE '%google-calendar%'
ORDER BY jobname;
```

Vous devriez voir 5 cron jobs :
- ✅ `process-google-calendar-sync-queue` (toutes les 5 min)
- ✅ `sync-google-calendar-incremental` (toutes les 15 min)
- ✅ `cleanup-google-calendar-sync-queue` (quotidien 2h)
- ✅ `renew-google-calendar-webhooks` (quotidien 3h)
- ✅ `cleanup-expired-google-webhooks` (quotidien 4h)

### Étape 4 : Vérifier l'exécution des cron jobs

```sql
-- Voir l'historique d'exécution
SELECT 
  j.jobname,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname LIKE '%google-calendar%'
ORDER BY jr.start_time DESC
LIMIT 20;
```

---

## ✅ Checklist

- [ ] pg_cron activé
- [ ] Script CRON-JOBS-GOOGLE-CALENDAR-SYNC.sql exécuté
- [ ] 5 cron jobs créés et visibles
- [ ] Historique d'exécution visible (attendre quelques minutes)

---

## 🔧 Configuration Requise

Les cron jobs utilisent `net.http_post` pour appeler les Edge Functions. Assurez-vous que :

1. **Variables d'environnement Supabase** sont configurées :
   - `app.supabase_url` (ou utiliser directement l'URL)
   - `app.service_role_key` (ou utiliser directement la clé)

2. **Edge Functions** sont déployées :
   - `google-calendar-sync-processor`
   - `google-calendar-sync-incremental`
   - `google-calendar-watch`

---

## 📝 Note

Si les cron jobs ne s'exécutent pas, vérifiez :
- Que pg_cron est bien activé
- Que les variables d'environnement sont configurées
- Que les Edge Functions sont déployées et accessibles
- Les logs dans Supabase Dashboard > Edge Functions > Logs
