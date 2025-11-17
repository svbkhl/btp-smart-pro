# 🔍 Comment Trouver la Clé API pour les Cron Jobs

## 🎯 Chemin Exact dans Supabase Dashboard

```
Supabase Dashboard
  └── Settings (⚙️) 
      └── API
          └── Project API keys
              └── service_role (secret) ← VOUS AVEZ BESOIN DE CECI
```

---

## 📋 Instructions Pas à Pas

### 1. Ouvrir Supabase Dashboard

- **URL** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
- **Connectez-vous** si nécessaire

### 2. Cliquer sur Settings

- **Dans le menu de gauche**, cherchez l'icône ⚙️ (Settings)
- **Cliquez dessus**

### 3. Cliquer sur API

- **Dans le sous-menu de Settings**, cherchez **API**
- **Cliquez dessus**

### 4. Trouver la Clé service_role

Vous verrez une section **"Project API keys"** avec 2 clés :

| Name | Key type | Description |
|------|----------|-------------|
| `anon` | `public` | Clé publique (pas celle-ci) |
| `service_role` | `secret` | ⚠️ **C'EST CETTE CLÉ QU'IL VOUS FAUT !** |

### 5. Copier la Clé

1. **Cliquez sur l'icône 👁️** (œil) à côté de `service_role` pour révéler la clé
2. **Cliquez sur l'icône 📋** (copier) pour copier la clé
3. **Collez-la** dans un endroit temporaire

**La clé ressemble à ceci** :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 Utiliser la Clé dans le Script SQL

### Étape 1 : Ouvrir le Script

- **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`

### Étape 2 : Trouver les Occurrences

- **Cherchez** : `YOUR_SERVICE_ROLE_KEY` (apparaît **2 fois** dans le script)

### Étape 3 : Remplacer

**Ligne 1** (pour smart-notifications) :
```sql
-- Avant
'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'

-- Après (remplacez par votre vraie clé)
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

**Ligne 2** (pour process-email-queue) :
```sql
-- Avant
'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'

-- Après (remplacez par votre vraie clé)
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

### Étape 4 : Exécuter le Script

1. **Allez dans** SQL Editor
2. **Copiez TOUT le script** (Cmd+A, Cmd+C)
3. **Collez dans SQL Editor** (Cmd+V)
4. **Cliquez sur "Run"** (Cmd+Enter)

---

## ✅ Vérification

### Vérifier que les Cron Jobs sont Créés

Dans SQL Editor, exécutez :

```sql
SELECT 
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** :
```
jobname                        | schedule    | active
-------------------------------|-------------|-------
smart-notifications-hourly     | 0 * * * *   | true
process-email-queue            | */5 * * * * | true
```

---

## 🆘 Problèmes Courants

### Je ne vois pas "Settings → API"

**Solution** : 
- Vérifiez que vous êtes connecté
- Vérifiez que vous avez les permissions d'administration sur le projet

### Je ne vois pas la clé service_role

**Solution** :
- La clé `service_role` devrait toujours être visible dans Settings → API
- Si elle n'apparaît pas, vous n'avez peut-être pas les permissions nécessaires

### Erreur "permission denied" lors de l'exécution du script

**Solution** :
- Vérifiez que vous utilisez la bonne clé `service_role`
- Vérifiez que vous êtes connecté avec un compte administrateur

---

## 📚 Ressources

- **Guide rapide** : `GUIDE-RAPIDE-CLE-API.md`
- **Guide détaillé** : `TROUVER-CLE-API-CRON.md`
- **Script SQL** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
- **Dashboard Supabase** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/api

---

## ✅ Résumé en 3 Points

1. **Où** : Settings (⚙️) → API → Project API keys → `service_role` (secret)
2. **Copier** : Cliquez sur 👁️ puis 📋 pour copier la clé
3. **Utiliser** : Remplacez `YOUR_SERVICE_ROLE_KEY` dans le script SQL (2 fois)

**C'est tout !** 🚀

