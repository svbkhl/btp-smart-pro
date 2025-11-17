# ⚡ Faire Tout en 4 Étapes - Guide Ultra Simple

## 🎯 Objectif

Configurer le système automatisé de notifications en **4 étapes simples**.

---

## 📋 ÉTAPE 1 : Créer les Tables (2 minutes)

### Actions

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Cliquez sur** : SQL Editor (menu de gauche)
3. **Cliquez sur** : "New query"
4. **Ouvrez le fichier** : `supabase/AUTOMATED-NOTIFICATIONS-COMPLETE.sql`
   - ⚠️ **IMPORTANT** : Utilisez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` (pas l'ancien)
   - Ce script crée TOUTES les tables nécessaires avant de les modifier
5. **Sélectionnez TOUT** (Cmd+A)
6. **Copiez** (Cmd+C)
7. **Collez dans SQL Editor** (Cmd+V)
8. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat** : Vous devriez voir :
- `Tables créées: 8`
- `Fonctions créées: 10`

---

## 📋 ÉTAPE 2 : Déployer la Fonction (2 minutes)

### Option A : Via Supabase Dashboard (Recommandé)

1. **Allez dans** : Edge Functions (menu de gauche)
2. **Cliquez sur** : "Create a new function"
3. **Nommez-la** : `smart-notifications`
4. **Ouvrez le fichier** : `supabase/functions/smart-notifications/index.ts`
5. **Sélectionnez TOUT** (Cmd+A)
6. **Copiez** (Cmd+C)
7. **Collez dans l'éditeur Supabase**
8. **Cliquez sur "Deploy"**

**✅ Résultat** : La fonction est déployée.

### Option B : Via Terminal (Si Supabase CLI installé)

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main
supabase functions deploy smart-notifications
```

---

## 📋 ÉTAPE 3 : Configurer les Secrets (2 minutes)

### Actions

1. **Allez dans** : Settings → Edge Functions → Secrets
2. **Cliquez sur** : "Add new secret"
3. **Ajoutez** :

**Secret 1** :
- **Name** : `RESEND_API_KEY`
- **Value** : `re_xxxxxxxxxxxxx` (votre clé Resend, optionnel)

**Secret 2** :
- **Name** : `CRON_SECRET`
- **Value** : `mon-secret-12345` (n'importe quelle chaîne secrète)

4. **Cliquez sur "Save"** pour chaque secret

**✅ Résultat** : Les secrets sont configurés.

**Note** : Si vous n'avez pas de clé Resend, vous pouvez la créer plus tard. Les emails seront mis en queue et pourront être envoyés plus tard.

---

## 📋 ÉTAPE 4 : Configurer les Cron Jobs (3 minutes)

### Actions

1. **Allez dans** : SQL Editor
2. **Cliquez sur** : "New query"
3. **Ouvrez le fichier** : `CONFIGURE-CRON-JOBS-FINAL.sql`
4. **Trouvez votre SERVICE_ROLE_KEY** :
   - Allez dans Settings → API
   - Copiez la clé "service_role" (secret, longue chaîne)
5. **Dans le script SQL**, remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé (2 fois dans le script)
6. **Sélectionnez TOUT** (Cmd+A)
7. **Copiez** (Cmd+C)
8. **Collez dans SQL Editor** (Cmd+V)
9. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat** : Vous devriez voir 2 lignes (2 cron jobs créés).

---

## ✅ Vérification Finale

### Test Rapide

Dans SQL Editor, exécutez :

```sql
-- Vérifier les tables
SELECT 'Tables' as type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payments', 'notification_log')

UNION ALL

-- Vérifier les fonctions
SELECT 'Functions', COUNT(*)
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'check_%'

UNION ALL

-- Vérifier les cron jobs
SELECT 'Cron Jobs', COUNT(*)
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** :
- Tables: 2
- Functions: 7
- Cron Jobs: 2

---

## 🎉 C'est Fait !

Le système fonctionne maintenant automatiquement :

- ✅ **Toutes les heures** : Vérifie les conditions et envoie des notifications
- ✅ **Toutes les 5 minutes** : Traite la queue d'emails
- ✅ **Notifications in-app** : Apparaissent dans l'application
- ✅ **Emails automatiques** : Envoyés via Resend (si configuré)

---

## 🧪 Tester le Système

### Test Manuel

Dans SQL Editor, créez un devis de test :

```sql
-- Créer un devis de test (remplacez YOUR_USER_ID)
INSERT INTO public.ai_quotes (
  user_id,
  client_name,
  status,
  created_at
) VALUES (
  'YOUR_USER_ID'::UUID,
  'Client Test',
  'draft',
  NOW() - INTERVAL '4 days'  -- 4 jours pour déclencher la notification
);
```

**Attendez 1 heure** ou **testez manuellement** :

```bash
curl -X POST https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Vérifiez** :
- Une notification devrait apparaître dans l'application
- Un email devrait être mis en queue (dans `email_queue`)

---

## 🆘 Aide

### Les cron jobs ne s'exécutent pas

1. Vérifiez que `pg_cron` est activé : `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Vérifiez que `pg_net` est activé : `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
3. Vérifiez les logs : Supabase Dashboard → Logs → Postgres Logs

### Les notifications ne sont pas créées

1. Vérifiez que les données existent (devis, projets, etc.)
2. Vérifiez que les conditions sont remplies (dates, statuts)
3. Testez manuellement la fonction (voir ci-dessus)

### Les emails ne sont pas envoyés

1. Vérifiez que `RESEND_API_KEY` est configuré
2. Vérifiez que `process-email-queue` fonctionne
3. Vérifiez les logs dans `email_queue`

---

## 📚 Documentation Complète

- **Guide complet** : `GUIDE-COMPLET-NOTIFICATIONS.md`
- **Déploiement détaillé** : `DEPLOY-SMART-NOTIFICATIONS.md`
- **Intégration frontend** : `INTEGRATION-FRONTEND.md`

---

**Tout est prêt ! Le système fonctionne automatiquement.** 🚀

