# 🚨 FIX GOOGLE OAUTH - ACTION IMMÉDIATE

## ❌ ERREUR ACTUELLE
```
Error 401: invalid_client
The OAuth client was not found.
```

## 🎯 CAUSE
Le **Client ID Google** n'est pas configuré (ou incorrect) dans Supabase.

---

## ✅ SOLUTION EN 3 ÉTAPES (10 MINUTES)

### 📍 ÉTAPE 1 : CRÉER LES IDENTIFIANTS GOOGLE (5 min)

#### 1.1 Ouvrir Google Cloud Console
🔗 **Ouvrez cette URL** : https://console.cloud.google.com/apis/credentials

#### 1.2 Sélectionner/Créer un Projet
- Si vous avez déjà un projet, **sélectionnez-le**
- Sinon, cliquez sur **"Create Project"** :
  - Nom : `BTP Smart Pro`
  - Cliquez sur **"Create"**

#### 1.3 Créer l'OAuth Client ID
1. Cliquez sur **"+ CREATE CREDENTIALS"** (en haut)
2. Sélectionnez **"OAuth client ID"**

#### 1.4 Configurer le Consent Screen (si demandé)
Si c'est la première fois :
1. **User Type** : Sélectionnez **"External"**
2. Cliquez sur **"Create"**
3. Remplissez :
   - **App name** : `BTP Smart Pro`
   - **User support email** : Votre email
   - **Developer contact** : Votre email
4. Cliquez sur **"Save and Continue"** × 3
5. Cliquez sur **"Back to Dashboard"**

#### 1.5 Créer le Client
1. Retournez dans **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type** : **"Web application"**
4. **Name** : `BTP Smart Pro Web`
5. **Authorized redirect URIs** : Cliquez sur **"+ ADD URI"** et ajoutez :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
6. Cliquez sur **"Create"**

#### 1.6 Copier les Identifiants
Une popup s'affiche avec :
- **Client ID** : `123456789-xxxxx.apps.googleusercontent.com`
- **Client Secret** : `GOCSPX-xxxxxxxxxxxxx`

**🔴 GARDEZ CETTE PAGE OUVERTE** (ou téléchargez le JSON)

---

### 📍 ÉTAPE 2 : CONFIGURER SUPABASE (2 min)

#### 2.1 Ouvrir Supabase Dashboard
🔗 **Ouvrez cette URL** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/providers

#### 2.2 Configurer Google Provider
1. Dans la liste, cliquez sur **"Google"**
2. **Activez** le toggle "Enable Sign in with Google"
3. **Collez** :
   - **Client ID** : Votre Client ID Google (copié à l'étape 1.6)
   - **Client Secret** : Votre Client Secret Google (copié à l'étape 1.6)
4. Cliquez sur **"Save"** en bas

**✅ Vous devriez voir** : "Settings saved"

---

### 📍 ÉTAPE 3 : EXÉCUTER LE SCRIPT SQL (2 min)

#### 3.1 Ouvrir SQL Editor
🔗 **Ouvrez cette URL** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

#### 3.2 Copier le Script
Copiez **TOUT** le contenu du fichier :
```
supabase/CONFIGURE-GOOGLE-OAUTH.sql
```

#### 3.3 Exécuter
1. **Collez** le script dans SQL Editor
2. Cliquez sur **"Run"** (ou Ctrl+Enter)
3. **Attendez** le message : `✅ Trigger créé avec succès !`

---

## 🧪 TEST

### Tester la Connexion
1. **Ouvrez** : https://www.btpsmartpro.com/auth
2. Cliquez sur **"Continuer avec Google"**
3. **Sélectionnez votre compte Google**
4. ✅ **Vous devriez être redirigé** vers l'application

---

## 🐛 SI ÇA NE MARCHE TOUJOURS PAS

### Erreur : "redirect_uri_mismatch"
**Solution** : Vérifiez que dans Google Cloud Console, l'URI est **EXACTEMENT** :
```
https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
```
(Pas d'espace, pas de `/` en trop, pas de différence de casse)

### Erreur : "invalid_client" persiste
**Solution** :
1. Vérifiez que le Client ID commence par un chiffre et finit par `.apps.googleusercontent.com`
2. Vérifiez que le Client Secret commence par `GOCSPX-`
3. Vérifiez qu'il n'y a pas d'espaces avant/après dans Supabase
4. Essayez de **désactiver puis réactiver** le provider Google dans Supabase

### Le bouton Google n'apparaît pas
**Solution** :
1. Videz le cache du navigateur (Ctrl+Shift+Delete)
2. Rechargez la page (Ctrl+R)
3. Vérifiez la console du navigateur (F12) pour des erreurs

---

## 📋 CHECKLIST

- [ ] Projet créé dans Google Cloud Console
- [ ] OAuth Client ID créé
- [ ] Redirect URI configuré : `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
- [ ] Client ID et Secret copiés
- [ ] Google Provider activé dans Supabase
- [ ] Client ID et Secret collés dans Supabase
- [ ] Script SQL exécuté
- [ ] Test : bouton "Continuer avec Google" cliquable
- [ ] Test : connexion réussie

---

## 🎉 C'EST PRÊT !

Une fois ces 3 étapes terminées, l'erreur **"OAuth client was not found"** disparaîtra et la connexion Google fonctionnera parfaitement !
