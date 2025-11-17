# 🚀 Déploiement Automatique - Système de Notifications

## ⚡ Installation en 4 Étapes Simples

### 📋 Étape 1 : Créer les Tables et Fonctions (2 minutes)

1. **Ouvrez Supabase Dashboard** → https://supabase.com/dashboard
2. **Sélectionnez votre projet** : `renmjmqlmafqjzldmsgs`
3. **Allez dans SQL Editor** (menu de gauche)
4. **Cliquez sur "New query"**
5. **Ouvrez le fichier** : `supabase/AUTOMATED-NOTIFICATIONS-COMPLETE.sql`
   - ⚠️ **IMPORTANT** : Utilisez `AUTOMATED-NOTIFICATIONS-COMPLETE.sql` (pas l'ancien)
   - Ce script crée TOUTES les tables nécessaires avant de les modifier
6. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
7. **Collez dans SQL Editor** (Cmd+V)
8. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Vérifiez** : Vous devriez voir :
- `Tables créées: 8`
- `Fonctions créées: 10`

---

### 📋 Étape 2 : Déployer la Edge Function (1 minute)

**Option A : Via Supabase CLI (Recommandé)**

```bash
# Dans le terminal, à la racine du projet
supabase functions deploy smart-notifications
```

**Option B : Via Supabase Dashboard**

1. **Allez dans Edge Functions** (menu de gauche)
2. **Cliquez sur "Create a new function"**
3. **Nommez-la** : `smart-notifications`
4. **Ouvrez le fichier** : `supabase/functions/smart-notifications/index.ts`
5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
6. **Collez dans l'éditeur**
7. **Cliquez sur "Deploy"**

---

### 📋 Étape 3 : Configurer les Variables d'Environnement (2 minutes)

1. **Allez dans Settings → Edge Functions → Secrets**
2. **Ajoutez les secrets suivants** :

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
CRON_SECRET=your-secret-key-here-12345
```

**Pour obtenir RESEND_API_KEY** :
- Créez un compte sur https://resend.com
- Obtenez votre clé API dans le dashboard
- Collez-la dans les secrets

**Pour CRON_SECRET** :
- Créez une clé secrète aléatoire (ex: `my-secret-key-2024`)
- Utilisez-la pour sécuriser les appels cron

---

### 📋 Étape 4 : Configurer les Cron Jobs (3 minutes)

1. **Allez dans SQL Editor**
2. **Ouvrez le fichier** : `supabase/CONFIGURE-CRON-JOBS.sql`
3. **Copiez le contenu** (Cmd+A, Cmd+C)
4. **AVANT de coller**, trouvez vos valeurs :
   - **Votre PROJECT_REF** : `renmjmqlmafqjzldmsgs` (déjà dans votre config)
   - **Votre SERVICE_ROLE_KEY** : 
     - Allez dans Settings → API
     - Copiez la clé "service_role" (secret)
5. **Dans le script SQL**, remplacez :
   - `YOUR_PROJECT_REF` → `renmjmqlmafqjzldmsgs`
   - `YOUR_SERVICE_ROLE_KEY` → Votre clé service_role
6. **Collez dans SQL Editor** (Cmd+V)
7. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Vérifiez** : Vous devriez voir "2 rows" (2 cron jobs créés).

---

## ✅ Vérification

### Vérifier que tout fonctionne

1. **Testez manuellement la fonction** :

```bash
curl -X POST https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/smart-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

2. **Vérifiez les tables** :

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

-- Vérifier les cron jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

---

## 🎯 C'est Fait !

Le système est maintenant configuré et fonctionne automatiquement :

- ✅ **Toutes les heures** : Vérifie les conditions et envoie des notifications
- ✅ **Toutes les 5 minutes** : Traite la queue d'emails
- ✅ **Notifications in-app** : Apparaissent dans l'application
- ✅ **Emails automatiques** : Envoyés via Resend (si configuré)

---

## 🆘 Si Vous Avez des Erreurs

### Erreur : "extension pg_cron does not exist"

**Solution** : L'extension est activée automatiquement dans le script. Si l'erreur persiste, exécutez :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Erreur : "function does not exist"

**Solution** : Vérifiez que vous avez bien exécuté `AUTOMATED-NOTIFICATIONS-SYSTEM.sql` en entier.

### Erreur : "permission denied"

**Solution** : Vérifiez que vous utilisez la clé `service_role` (pas `anon` ou `authenticated`).

---

**Tout est prêt ! Le système fonctionne automatiquement.** 🚀

