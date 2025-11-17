# 🔑 Comment Trouver la Clé API pour les Cron Jobs

## 🎯 Ce que vous devez trouver

Pour configurer les cron jobs, vous avez besoin de la **SERVICE_ROLE_KEY** (clé de service).

---

## 📋 Étape 1 : Trouver la SERVICE_ROLE_KEY

### Dans Supabase Dashboard

1. **Allez dans** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Cliquez sur** : **Settings** (⚙️ dans le menu de gauche)
3. **Cliquez sur** : **API** (dans le sous-menu)
4. **Trouvez** : La section **"Project API keys"**

Vous verrez 2 clés :
- **`anon` `public`** : Clé publique (commence par `eyJ...`)
- **`service_role` `secret`** : ⚠️ **C'EST CETTE CLÉ QU'IL VOUS FAUT !**

### ⚠️ Important

- La clé `service_role` est **SECRÈTE** et commence généralement par `eyJ...`
- **NE PARTAGEZ JAMAIS** cette clé publiquement
- Cette clé donne accès complet à votre base de données (bypass RLS)

---

## 📋 Étape 2 : Copier la Clé

1. **Cliquez sur** : L'icône 👁️ (œil) à côté de `service_role` pour révéler la clé
2. **Cliquez sur** : L'icône 📋 (copier) pour copier la clé
3. **Collez-la** dans un endroit temporaire (vous en aurez besoin pour l'étape suivante)

**Exemple de clé** :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📋 Étape 3 : Utiliser la Clé dans le Script SQL

1. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
2. **Trouvez** : `YOUR_SERVICE_ROLE_KEY` (apparaît 2 fois dans le script)
3. **Remplacez** : Chaque occurrence de `YOUR_SERVICE_ROLE_KEY` par votre clé copiée

**Exemple** :

**Avant** :
```sql
'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
```

**Après** :
```sql
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

---

## 📋 Étape 4 : Exécuter le Script

1. **Allez dans** : SQL Editor
2. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
3. **Vérifiez** que vous avez remplacé `YOUR_SERVICE_ROLE_KEY` (2 fois)
4. **Copiez TOUT le script** (Cmd+A, Cmd+C)
5. **Collez dans SQL Editor** (Cmd+V)
6. **Cliquez sur "Run"** (Cmd+Enter)

**✅ Résultat attendu** : 2 lignes (les 2 cron jobs créés)

---

## 🔍 Vérifier que les Cron Jobs sont Configurés

Dans SQL Editor, exécutez :

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** :
- 2 lignes (une pour chaque cron job)
- `active = true` pour les deux

---

## 🆘 Problèmes Courants

### Erreur : "extension pg_cron does not exist"

**Solution** : Le script active automatiquement l'extension. Si l'erreur persiste, exécutez manuellement :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Erreur : "permission denied"

**Solution** : Vérifiez que vous êtes connecté avec un compte ayant les permissions d'administration sur Supabase.

### Les cron jobs ne s'exécutent pas

**Solution** : Vérifiez que :
1. Les Edge Functions sont déployées (`smart-notifications`, `process-email-queue`)
2. Les secrets sont configurés (`RESEND_API_KEY`, `CRON_SECRET`)
3. Les cron jobs sont actifs (`active = true`)

---

## 📚 Ressources

- **Guide complet** : `FAIRE-TOUT-EN-4-ÉTAPES.md`
- **Script SQL** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
- **Documentation Supabase** : https://supabase.com/docs/guides/database/extensions/pg_cron

---

## ✅ Résumé

1. **Settings → API** dans Supabase Dashboard
2. **Copiez** la clé `service_role` (secret)
3. **Remplacez** `YOUR_SERVICE_ROLE_KEY` dans le script SQL (2 fois)
4. **Exécutez** le script dans SQL Editor

**C'est tout !** 🚀

