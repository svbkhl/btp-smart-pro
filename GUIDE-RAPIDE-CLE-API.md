# 🚀 Guide Rapide : Trouver la Clé API pour les Cron Jobs

## 🎯 En 3 Étapes Simples

---

## 📍 Étape 1 : Ouvrir Supabase Dashboard

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Connectez-vous** si nécessaire

---

## 📍 Étape 2 : Aller dans Settings → API

1. **Dans le menu de gauche**, cliquez sur **Settings** (⚙️)
2. **Dans le sous-menu**, cliquez sur **API**

**Vous verrez maintenant** :
- Project API keys
- Project URL
- etc.

---

## 📍 Étape 3 : Copier la Clé service_role

1. **Trouvez** la section **"Project API keys"**
2. **Cherchez** la ligne avec :
   - **Name** : `service_role`
   - **Key type** : `secret`
3. **Cliquez sur** l'icône 👁️ (œil) pour révéler la clé
4. **Cliquez sur** l'icône 📋 (copier) pour copier la clé

**⚠️ IMPORTANT** : C'est cette clé que vous devez utiliser dans le script SQL !

---

## 🔧 Utiliser la Clé dans le Script

1. **Ouvrez** : `supabase/CONFIGURE-CRON-JOBS-FINAL.sql`
2. **Cherchez** : `YOUR_SERVICE_ROLE_KEY` (2 fois dans le script)
3. **Remplacez** chaque occurrence par la clé que vous venez de copier

**Exemple** :

```sql
-- Avant
'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'

-- Après (avec votre vraie clé)
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbm1qbXFsbG1hZnFqemxkbXNncyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3Mjk4NzY1NDAsImV4cCI6MjA0NTQ1MjU0MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

---

## ✅ Vérification

### Dans SQL Editor, exécutez :

```sql
SELECT 
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('smart-notifications-hourly', 'process-email-queue');
```

**Résultat attendu** : 2 lignes avec `active = true`

---

## 🆘 Si vous ne trouvez pas la clé

### Option 1 : Vérifier que vous êtes au bon endroit

- ✅ **Settings** (⚙️) → **API**
- ❌ Pas dans "Edge Functions" → "Secrets"
- ❌ Pas dans "Database" → "Extensions"

### Option 2 : Vérifier les permissions

- Vous devez être **propriétaire** ou **admin** du projet Supabase
- Si vous n'avez pas accès, demandez au propriétaire du projet

---

## 📚 Liens Utiles

- **Dashboard Supabase** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
- **Settings → API** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/api
- **Guide complet** : `TROUVER-CLE-API-CRON.md`

---

## ✅ Résumé Visuel

```
Supabase Dashboard
    ↓
Settings (⚙️)
    ↓
API
    ↓
Project API keys
    ↓
service_role (secret) ← COPIEZ CECI
    ↓
Utilisez dans CONFIGURE-CRON-JOBS-FINAL.sql
```

---

**C'est tout !** 🚀

