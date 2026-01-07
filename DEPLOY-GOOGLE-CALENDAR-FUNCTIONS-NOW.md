# 🚀 Déployer les Fonctions Google Calendar

## ⚠️ Problème

Les fonctions suivantes existent dans le code mais **n'ont pas été déployées** sur Supabase :
- `google-calendar-callback`
- `google-calendar-oauth-entreprise-pkce`
- `google-calendar-sync-entreprise`

---

## ✅ Solution : Script de Déploiement

J'ai créé un script pour déployer automatiquement les 3 fonctions.

---

## 🚀 Méthode 1 : Script Automatique (Recommandé)

### 1. Rendre le script exécutable

```bash
chmod +x deploy-google-calendar-functions.sh
```

### 2. Exécuter le script

```bash
./deploy-google-calendar-functions.sh
```

Le script va :
- ✅ Vérifier que Supabase CLI est installé
- ✅ Vérifier que vous êtes connecté
- ✅ Déployer les 3 fonctions une par une
- ✅ Afficher un résumé

---

## 🚀 Méthode 2 : Déploiement Manuel

### 1. Se connecter à Supabase (si pas déjà fait)

```bash
supabase login
```

### 2. Lier le projet (si pas déjà fait)

```bash
supabase link --project-ref renmjmqlmafqjzldmsgs
```

### 3. Déployer chaque fonction

```bash
# Fonction 1: Callback
supabase functions deploy google-calendar-callback --no-verify-jwt

# Fonction 2: OAuth PKCE
supabase functions deploy google-calendar-oauth-entreprise-pkce --no-verify-jwt

# Fonction 3: Sync
supabase functions deploy google-calendar-sync-entreprise --no-verify-jwt
```

---

## 🚀 Méthode 3 : Via Dashboard Supabase

### 1. Aller sur le Dashboard

https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

### 2. Pour chaque fonction

1. Cliquez sur **"Deploy a new function"** ou **"Redeploy"**
2. Sélectionnez la fonction dans la liste
3. Cliquez sur **"Deploy"**

**Fonctions à déployer** :
- `google-calendar-callback`
- `google-calendar-oauth-entreprise-pkce`
- `google-calendar-sync-entreprise`

---

## ✅ Vérification

Après déploiement, vérifiez dans le Dashboard :

https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

Vous devriez voir les 3 fonctions avec le statut **"Active"** ✅

---

## 📋 Utilisation des Fonctions

### `google-calendar-callback`
- **Appelée par** : Google OAuth (redirection automatique)
- **Quand** : Après autorisation Google
- **Action** : Redirige vers `/settings/integrations/google?status=success`

### `google-calendar-oauth-entreprise-pkce`
- **Appelée par** : `useExchangeGoogleCode()` hook
- **Quand** : Pour échanger le code OAuth contre des tokens
- **Action** : Sauvegarde les tokens dans la base de données

### `google-calendar-sync-entreprise`
- **Appelée par** : `useSyncEventWithGoogle()` hook
- **Quand** : Pour synchroniser un événement avec Google Calendar
- **Action** : Crée/met à jour/supprime un événement dans Google Calendar

---

## 🔍 Vérifier les Logs

Après déploiement, testez et vérifiez les logs :

1. **Dashboard** → **Functions** → Cliquez sur une fonction → **Logs**
2. Ou via CLI :
   ```bash
   supabase functions logs google-calendar-callback
   ```

---

## ⚠️ Erreurs Possibles

### "Function not found"
→ La fonction n'est pas déployée. Déployez-la d'abord.

### "Missing authorization header"
→ Normal pour `google-calendar-callback` (appelée par Google).

### "Missing Google env vars"
→ Configurez les secrets dans Supabase Dashboard :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

---

## 📝 Résumé

1. ✅ Exécutez le script de déploiement
2. ✅ Vérifiez dans le Dashboard que les 3 fonctions sont actives
3. ✅ Testez la connexion Google Calendar
4. ✅ Vérifiez les logs si problème

---

## 🎉 Après Déploiement

Les fonctions seront disponibles et appelables depuis le frontend ! 🚀
