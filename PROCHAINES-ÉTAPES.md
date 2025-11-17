# 🚀 Prochaines Étapes - Système de Notifications

## ✅ Étape 1 : Terminée !

Vous avez exécuté `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` avec succès.

---

## 📋 Étape 2 : Déployer la Edge Function (2 minutes)

### Via Supabase Dashboard

1. **Allez dans** : Supabase Dashboard → Edge Functions
2. **Cliquez sur** : "Create a new function"
3. **Nommez-la** : `smart-notifications`
4. **Ouvrez le fichier** : `supabase/functions/smart-notifications/index.ts`
5. **Sélectionnez TOUT** (Cmd+A, Cmd+C)
6. **Collez dans l'éditeur Supabase** (Cmd+V)
7. **Cliquez sur "Deploy"**

**✅ Résultat** : La fonction est déployée.

---

## 📋 Étape 3 : Configurer les Secrets (2 minutes)

### Actions

1. **Allez dans** : Settings → Edge Functions → Secrets
   - **Chemin** : Settings (⚙️) → Edge Functions → Secrets
2. **Cliquez sur** : "Add new secret" (ou "Add secret")

**Secret 1** : `RESEND_API_KEY` (Optionnel)
- **Name** : `RESEND_API_KEY`
- **Value** : Votre clé Resend (optionnel pour l'instant)
- Si vous n'avez pas de clé Resend, vous pouvez la créer plus tard sur https://resend.com
- **Cliquez sur "Save"**

**Secret 2** : `CRON_SECRET` (Recommandé)
- **Name** : `CRON_SECRET`
- **Value** : `mon-secret-12345` (ou n'importe quelle chaîne secrète que vous voulez)
- **Cliquez sur "Save"**

**✅ Résultat** : Les secrets sont configurés.

**📄 Guide détaillé** : Consultez `CONFIGURER-CRON-SECRET.md` pour plus d'informations.

---

## 📋 Étape 4 : Configurer les Cron Jobs (3 minutes)

### Option A : Utiliser CRON_SECRET (Recommandé)

1. **Allez dans** : SQL Editor
2. **Cliquez sur** : "New query"
3. **Ouvrez le fichier** : `supabase/CONFIGURE-CRON-JOBS-AVEC-CRON-SECRET.sql`
4. **Dans le script SQL**, remplacez `YOUR_CRON_SECRET` par votre `CRON_SECRET` (2 fois dans le script)
   - ⚠️ **IMPORTANT** : Utilisez la même valeur que celle configurée dans Settings → Edge Functions → Secrets
   - Exemple : Si vous avez configuré `CRON_SECRET = 'mon-secret-12345'`, remplacez par `'mon-secret-12345'`
5. **Sélectionnez TOUT** (Cmd+A, Cmd+C)
6. **Collez dans SQL Editor** (Cmd+V)
7. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat** : Vous devriez voir 2 lignes (2 cron jobs créés).

### Option B : Utiliser SERVICE_ROLE_KEY (Plus Simple)

1. **Allez dans** : SQL Editor
2. **Cliquez sur** : "New query"
3. **Ouvrez le fichier** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
4. **Trouvez votre SERVICE_ROLE_KEY** :
   - Allez dans Settings → API
   - Copiez la clé "service_role" (secret, longue chaîne commençant par `eyJ...`)
5. **Dans le script SQL**, remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé (2 fois dans le script)
6. **Sélectionnez TOUT** (Cmd+A, Cmd+C)
7. **Collez dans SQL Editor** (Cmd+V)
8. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat** : Vous devriez voir 2 lignes (2 cron jobs créés).

**📄 Guide détaillé** : Consultez `CONFIGURER-CRON-SECRET.md` pour plus d'informations.

---

## ✅ Vérification Finale

### Test Rapide

Dans SQL Editor, exécutez :

```sql
-- Vérifier les cron jobs
SELECT jobname, schedule, active
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** : 2 lignes (les 2 cron jobs)

---

## 🎯 Résumé

- ✅ **Étape 1** : Tables et fonctions SQL créées
- ⏳ **Étape 2** : Déployer `smart-notifications` (Edge Function)
- ⏳ **Étape 3** : Configurer les secrets (RESEND_API_KEY, CRON_SECRET)
- ⏳ **Étape 4** : Configurer les cron jobs

**Vous êtes à 25% du déploiement complet !** 🚀

---

## 🆘 Besoin d'aide ?

- **Guide complet** : `FAIRE-TOUT-EN-4-ÉTAPES.md`
- **Commandes exactes** : `COMMANDES-EXACTES-À-COPIER.md`
