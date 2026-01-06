# 🎯 GUIDE ÉTAPE PAR ÉTAPE : Google Cloud Console + Secrets Supabase

## 📋 OBJECTIF

Configurer Google Cloud Console et les secrets Supabase pour que :
1. ✅ Les utilisateurs puissent se connecter avec Google (email + mot de passe Google)
2. ✅ Les utilisateurs puissent connecter leur Google Calendar pour synchroniser les événements

---

## 🚀 ÉTAPE 2 : GOOGLE CLOUD CONSOLE (10 minutes)

### 📍 Étape 2.1 : Créer un Projet Google Cloud

1. **Ouvre** : https://console.cloud.google.com
2. **Connecte-toi** avec ton compte Google
3. **En haut à gauche**, clique sur le sélecteur de projet (à côté de "Google Cloud")
4. **Clique sur** "New Project"
5. **Nom du projet** : `BTP Smart Pro` (ou ton choix)
6. **Clique sur** "Create"
7. **Attends** 10-20 secondes que le projet soit créé
8. **Sélectionne le projet** dans le sélecteur en haut

**✅ Vérification** : Tu devrais voir "BTP Smart Pro" en haut à gauche

---

### 📍 Étape 2.2 : Activer Google Calendar API

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "Library" (Bibliothèque)
3. **Dans la barre de recherche en haut**, tape : `Google Calendar API`
4. **Clique sur** "Google Calendar API" dans les résultats
5. **Clique sur** le bouton bleu **"Enable"** (Activer)
6. **Attends** quelques secondes

**✅ Vérification** : Tu devrais voir "API enabled" avec une coche verte

---

### 📍 Étape 2.3 : Configurer l'Écran de Consentement OAuth

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "OAuth consent screen" (Écran de consentement OAuth)
3. **Sélectionne** "External" (pour permettre à tous les utilisateurs de se connecter)
4. **Clique sur** "Create"

#### Remplir les Informations :

**App information** :
- **App name** : `BTP Smart Pro`
- **User support email** : Ton email
- **App logo** : (optionnel, tu peux skip)
- **App domain** : (optionnel, tu peux skip)
- **Application home page** : `https://renmjmqlmafqjzldmsgs.supabase.co`
- **Application privacy policy link** : (optionnel)
- **Application terms of service link** : (optionnel)
- **Authorized domains** : (optionnel)

**Clique sur** "Save and Continue"

**Scopes** :
- **Clique sur** "Add or Remove Scopes"
- **Coche** :
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`
- **Clique sur** "Update"
- **Clique sur** "Save and Continue"

**Test users** :
- **Clique sur** "Add Users"
- **Ajoute ton email** (et ceux des testeurs)
- **Clique sur** "Add"
- **Clique sur** "Save and Continue"

**Summary** :
- **Vérifie** que tout est correct
- **Clique sur** "Back to Dashboard"

**✅ Vérification** : Tu devrais voir "OAuth consent screen configured"

---

### 📍 Étape 2.4 : Créer OAuth Client ID (pour Google Sign-In)

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "Credentials"
3. **En haut**, clique sur **"Create Credentials"** → **"OAuth client ID"**

#### Configuration :

**Application type** : Sélectionne **"Web application"**

**Name** : `BTP Smart Pro Web`

**Authorized JavaScript origins** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co
```

**Authorized redirect URIs** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
```

**Clique sur** "Create"

**⚠️ IMPORTANT** : Une popup s'ouvre avec :
- **Client ID** : `123456789-abc...` → **COPIE-LE IMMÉDIATEMENT**
- **Client Secret** : `GOCSPX-abc...` → **COPIE-LE IMMÉDIATEMENT**

**✅ Note ces valeurs** : Tu en auras besoin pour Supabase

---

### 📍 Étape 2.5 : Créer OAuth Client ID (pour Google Calendar)

1. **Toujours dans** "Credentials"
2. **Clique sur** "Create Credentials" → "OAuth client ID"

#### Configuration :

**Application type** : Sélectionne **"Web application"**

**Name** : `BTP Smart Pro Calendar`

**Authorized JavaScript origins** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co
```

**Authorized redirect URIs** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
```

**Clique sur** "Create"

**⚠️ IMPORTANT** : Une popup s'ouvre avec :
- **Client ID** : `987654321-xyz...` → **COPIE-LE IMMÉDIATEMENT**
- **Client Secret** : `GOCSPX-xyz...` → **COPIE-LE IMMÉDIATEMENT**

**✅ Note ces valeurs** : Tu en auras besoin pour les secrets Supabase

---

## 🔐 ÉTAPE 3 : SECRETS SUPABASE (3 minutes)

### 📍 Étape 3.1 : Ouvrir Supabase Dashboard

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Clique sur** "Settings" (⚙️ en bas à gauche)
3. **Clique sur** "Edge Functions" dans le menu
4. **Clique sur** "Secrets" (ou "Environment Variables")

---

### 📍 Étape 3.2 : Ajouter les Secrets Google Calendar

**Clique sur** "Add new secret" pour chaque variable :

#### Secret 1 : GOOGLE_CLIENT_ID
- **Name** : `GOOGLE_CLIENT_ID`
- **Value** : Colle le **Client ID** de l'étape 2.5 (celui pour Calendar)
- **Clique sur** "Save"

#### Secret 2 : GOOGLE_CLIENT_SECRET
- **Name** : `GOOGLE_CLIENT_SECRET`
- **Value** : Colle le **Client Secret** de l'étape 2.5 (celui pour Calendar)
- **Clique sur** "Save"

#### Secret 3 : GOOGLE_REDIRECT_URI
- **Name** : `GOOGLE_REDIRECT_URI`
- **Value** : 
  ```
  https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
  ```
- **Clique sur** "Save"

**✅ Vérification** : Tu devrais voir 3 secrets dans la liste

---

### 📍 Étape 3.3 : Configurer Google Provider dans Supabase (pour connexion automatique)

1. **Dans Supabase Dashboard**, va dans **"Authentication"** → **"Providers"**
2. **Trouve** "Google" dans la liste
3. **Active** le toggle "Enable Google provider"
4. **Colle** :
   - **Client ID (for OAuth)** : Le Client ID de l'étape 2.4 (celui pour Sign-In)
   - **Client Secret (for OAuth)** : Le Client Secret de l'étape 2.4 (celui pour Sign-In)
5. **Clique sur** "Save"

**✅ Vérification** : Le toggle Google devrait être vert (activé)

---

## 🧪 TESTER

### Test 1 : Connexion avec Google (email + mot de passe)

1. **Ouvre l'app** : http://localhost:4000
2. **Va sur** la page de connexion
3. **Clique sur** "Se connecter avec Google"
4. **Sélectionne ton compte Google**
5. **Autorise l'application**
6. **Vérifie** que tu es connecté

**✅ Résultat attendu** : Tu es connecté automatiquement avec ton compte Google

---

### Test 2 : Connexion Google Calendar

1. **Dans l'app**, va dans **"Paramètres"** → **"Intégrations"**
2. **Clique sur** "Connecter Google Calendar"
3. **Autorise l'accès** au calendrier dans la popup Google
4. **Vérifie** que la connexion est enregistrée

**✅ Résultat attendu** : Badge "Connecté" visible

---

### Test 3 : Synchronisation des Événements

1. **Crée un événement** dans le calendrier de l'app
2. **Ouvre** Google Calendar (https://calendar.google.com)
3. **Vérifie** que l'événement apparaît

**✅ Résultat attendu** : L'événement est synchronisé automatiquement

---

## 📊 RÉCAPITULATIF DES CREDENTIALS

### Pour Google Sign-In (Connexion utilisateur) :
- **Client ID** : Utilisé dans Supabase → Authentication → Providers → Google
- **Client Secret** : Utilisé dans Supabase → Authentication → Providers → Google

### Pour Google Calendar (Synchronisation) :
- **Client ID** : Utilisé dans Supabase → Edge Functions → Secrets → `GOOGLE_CLIENT_ID`
- **Client Secret** : Utilisé dans Supabase → Edge Functions → Secrets → `GOOGLE_CLIENT_SECRET`
- **Redirect URI** : Utilisé dans Supabase → Edge Functions → Secrets → `GOOGLE_REDIRECT_URI`

---

## ⚠️ IMPORTANT

### Pourquoi 2 OAuth Clients différents ?

1. **OAuth Client 1 (Sign-In)** :
   - Permet aux utilisateurs de se connecter avec Google (email + mot de passe Google)
   - Configuré dans Supabase → Authentication → Providers
   - Redirect URI : `/auth/v1/callback`

2. **OAuth Client 2 (Calendar)** :
   - Permet d'accéder au Google Calendar de l'utilisateur
   - Configuré dans Supabase → Edge Functions → Secrets
   - Redirect URI : `/functions/v1/google-calendar-oauth/callback`

**C'est normal d'avoir 2 clients différents** : ils ont des scopes différents (connexion vs calendrier).

---

## 🎉 C'EST TERMINÉ !

**Résultat** :
- ✅ Les utilisateurs peuvent se connecter avec Google (email + mot de passe Google)
- ✅ Les utilisateurs peuvent connecter leur Google Calendar
- ✅ Les événements sont synchronisés automatiquement

**Prochaine étape** : Déployer les Edge Functions (voir `EXECUTER-GOOGLE-CALENDAR-MAINTENANT.md`)

---

## 🐛 DÉPANNAGE

### Erreur : "redirect_uri_mismatch"

**Solution** : Vérifie que le Redirect URI dans Google Cloud Console correspond exactement à celui dans Supabase.

### Erreur : "invalid_client"

**Solution** : Vérifie que les Client ID et Client Secret sont corrects dans Supabase.

### La connexion Google ne fonctionne pas

**Solution** : Vérifie que le Google Provider est activé dans Supabase → Authentication → Providers.

---

**🔥 Suis ces étapes dans l'ordre et tout fonctionnera ! 🔥**
