# ✅ Correction 400 + OAuth Pro - Google Calendar

## 🎯 Objectif

Corriger l'erreur 400 sur `google-calendar-oauth` et implémenter un flow OAuth propre et production-ready.

---

## ✅ Corrections Appliquées

### 1. Simplification de `google-calendar-oauth`

La fonction a été **complètement simplifiée** pour :
- ✅ Générer uniquement l'URL OAuth
- ✅ Vérifier strictement les variables d'environnement
- ✅ Retourner des erreurs explicites avec logs

**Code final** : `supabase/functions/google-calendar-oauth/index.ts`

---

### 2. Vérifications Strictes

La fonction vérifie maintenant :
- ✅ `GOOGLE_CLIENT_ID` existe
- ✅ `GOOGLE_REDIRECT_URI` existe
- ✅ Logs explicites en cas d'erreur (`console.error`)

---

### 3. CORS Déjà OK

Le CORS est déjà configuré correctement :
- ✅ Headers CORS complets
- ✅ Gestion des requêtes OPTIONS (preflight)
- ✅ Support de tous les origines nécessaires

---

## 📋 Variables d'Environnement Requises

### ⚠️ OBLIGATOIRE dans Supabase

Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions**

### Variables à Configurer

1. **`GOOGLE_CLIENT_ID`**
   - Format : `xxxxx.apps.googleusercontent.com`
   - Où trouver : Google Cloud Console → Credentials

2. **`GOOGLE_CLIENT_SECRET`**
   - Format : Chaîne aléatoire
   - Où trouver : Google Cloud Console → Credentials → Votre OAuth Client

3. **`GOOGLE_REDIRECT_URI`** ⚠️ CRITIQUE
   - **DOIT ÊTRE EXACTEMENT** :
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
     ```
   - ⚠️ La moindre différence = erreur 400

---

## 🔧 Configuration

### Via Dashboard Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. **Section** : "Edge Functions Secrets"
3. **Ajoutez** les 3 variables :
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

### Via CLI

```bash
supabase secrets set GOOGLE_CLIENT_ID="votre-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="votre-client-secret"
supabase secrets set GOOGLE_REDIRECT_URI="https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback"
```

---

## 🚀 Redéployer la Fonction

### Via Dashboard

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Trouvez **`google-calendar-oauth`**
3. Cliquez sur les **3 points** → **"Redeploy"**

### Via CLI

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

---

## 📝 Frontend - Utilisation Correcte

Le frontend doit appeler la fonction ainsi :

```typescript
const { data, error } = await supabase.functions.invoke("google-calendar-oauth");

if (error) throw error;

window.location.href = data.url;
```

**❌ À ÉVITER** :
- ❌ Pas de fetch manuel
- ❌ Pas de headers custom
- ❌ Pas de body inutile

---

## ✅ Après Redéploiement

1. **Testez la connexion Google Calendar** dans l'app
2. **Vérifiez les logs** de l'Edge Function :
   - ✅ Si vous voyez l'URL OAuth générée → Tout est OK
   - ❌ Si vous voyez `"❌ Missing Google env vars"` → Variables non configurées
3. **L'erreur 400 ne devrait plus apparaître** ✅

---

## 🔗 URLs à Configurer dans Google Cloud Console

Dans **Google Cloud Console → Credentials → OAuth 2.0 Client ID** :

### Authorized redirect URIs

Ajoutez **EXACTEMENT** :

```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

⚠️ **La moindre différence = erreur 400**

---

## 🧪 Test Complet

1. ✅ Variables d'environnement configurées
2. ✅ Edge Function redéployée
3. ✅ URL ajoutée dans Google Cloud Console
4. ✅ Test de connexion dans l'app
5. ✅ Vérification des logs

---

## 📚 Documentation

- **Variables d'environnement** : `VARIABLES-ENV-GOOGLE-CALENDAR.md`
- **Code de la fonction** : `supabase/functions/google-calendar-oauth/index.ts`

