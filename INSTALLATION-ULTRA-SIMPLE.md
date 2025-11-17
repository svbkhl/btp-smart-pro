# ⚡ Installation Ultra Simple - 4 Étapes

## 🎯 Objectif

Configurer le système automatisé de notifications en **moins de 10 minutes**.

---

## 📋 Étape 1 : Créer les Tables (2 min)

1. **Supabase Dashboard** → SQL Editor → New query
2. **Ouvrez** : `supabase/AUTOMATED-NOTIFICATIONS-SYSTEM.sql`
3. **Copiez TOUT** (Cmd+A, Cmd+C)
4. **Collez** (Cmd+V) → **Run** (Cmd+Enter)

**✅ Résultat** : Tables et fonctions créées

---

## 📋 Étape 2 : Déployer la Fonction (1 min)

**Dans le terminal** :

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main
supabase functions deploy smart-notifications
```

**✅ Résultat** : Fonction déployée

---

## 📋 Étape 3 : Configurer les Secrets (2 min)

1. **Supabase Dashboard** → Settings → Edge Functions → Secrets
2. **Ajoutez** :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=mon-secret-12345
```

**✅ Résultat** : Secrets configurés

---

## 📋 Étape 4 : Configurer les Cron Jobs (3 min)

1. **Supabase Dashboard** → SQL Editor → New query
2. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS.sql`
3. **Remplacez** dans le script :
   - `YOUR_PROJECT_REF` → `renmjmqlmafqjzldmsgs`
   - `YOUR_SERVICE_ROLE_KEY` → Votre clé (Settings → API → service_role)
4. **Copiez** → **Collez** → **Run**

**✅ Résultat** : Cron jobs configurés

---

## ✅ C'est Fait !

Le système fonctionne automatiquement :
- ✅ Vérifie les conditions toutes les heures
- ✅ Envoie des notifications in-app
- ✅ Envoie des emails automatiques

---

## 🧪 Test Rapide

**Dans SQL Editor**, exécutez :

```sql
-- Vérifier que tout est créé
SELECT 'Tables' as type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'notification_log')
UNION ALL
SELECT 'Functions', COUNT(*)
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'check_%'
UNION ALL
SELECT 'Cron Jobs', COUNT(*)
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** :
- Tables: 2
- Functions: 7
- Cron Jobs: 2

---

**Tout est prêt !** 🚀

