# 🎯 GUIDE COMPLET : Connexion Google + Google Calendar

## 📋 OBJECTIF

Configurer pour que :
1. ✅ **Les utilisateurs se connectent avec Google** (juste email + mot de passe Google)
2. ✅ **Les utilisateurs connectent leur Google Calendar** pour synchroniser les événements
3. ✅ **Le calendrier fonctionne exactement comme Google Calendar**

---

## 🚀 ÉTAPE 2 : GOOGLE CLOUD CONSOLE (10 minutes)

### 📍 Étape 2.1 : Créer un Projet Google Cloud

1. **Ouvre** : https://console.cloud.google.com
2. **Connecte-toi** avec ton compte Google
3. **En haut à gauche**, clique sur le sélecteur de projet (à côté de "Google Cloud")
4. **Clique sur** "New Project"
5. **Nom du projet** : `BTP Smart Pro`
6. **Clique sur** "Create"
7. **Attends** 10-20 secondes
8. **Sélectionne le projet** dans le sélecteur en haut

**✅ Vérification** : Tu devrais voir "BTP Smart Pro" en haut à gauche

---

### 📍 Étape 2.2 : Activer Google Calendar API

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "Library" (Bibliothèque)
3. **Dans la barre de recherche**, tape : `Google Calendar API`
4. **Clique sur** "Google Calendar API" dans les résultats
5. **Clique sur** le bouton bleu **"Enable"** (Activer)
6. **Attends** quelques secondes

**✅ Vérification** : Tu devrais voir "API enabled" avec une coche verte

---

### 📍 Étape 2.3 : Configurer l'Écran de Consentement OAuth

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "OAuth consent screen" (Écran de consentement OAuth)
3. **Sélectionne** "External" (pour permettre à tous les utilisateurs)
4. **Clique sur** "Create"

#### Remplir les Informations :

**App information** :
- **App name** : `BTP Smart Pro`
- **User support email** : Ton email
- **App logo** : (optionnel, skip)
- **Application home page** : `https://renmjmqlmafqjzldmsgs.supabase.co`
- **Application privacy policy link** : (optionnel)
- **Application terms of service link** : (optionnel)

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

### 📍 Étape 2.4 : Créer OAuth Client ID (pour CONNEXION Google)

**C'est pour que les utilisateurs se connectent avec leur compte Google**

1. **Dans le menu de gauche**, clique sur **"APIs & Services"**
2. **Clique sur** "Credentials"
3. **En haut**, clique sur **"Create Credentials"** → **"OAuth client ID"**

#### Configuration :

**Application type** : Sélectionne **"Web application"**

**Name** : `BTP Smart Pro Sign-In`

**Authorized JavaScript origins** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co
```

**Authorized redirect URIs** : Clique sur "Add URI" et ajoute :
```
https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
```

**Clique sur** "Create"

**⚠️ POPUP IMPORTANTE** : Une popup s'ouvre avec :
- **Client ID** : `123456789-abc...` → **COPIE-LE IMMÉDIATEMENT** (pour Supabase Authentication)
- **Client Secret** : `GOCSPX-abc...` → **COPIE-LE IMMÉDIATEMENT** (pour Supabase Authentication)

**✅ Note ces valeurs** : Tu en auras besoin pour Supabase → Authentication → Providers → Google

---

### 📍 Étape 2.5 : Créer OAuth Client ID (pour GOOGLE CALENDAR)

**C'est pour accéder au calendrier Google de l'utilisateur**

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

**⚠️ POPUP IMPORTANTE** : Une popup s'ouvre avec :
- **Client ID** : `987654321-xyz...` → **COPIE-LE IMMÉDIATEMENT** (pour Supabase Edge Functions)
- **Client Secret** : `GOCSPX-xyz...` → **COPIE-LE IMMÉDIATEMENT** (pour Supabase Edge Functions)

**✅ Note ces valeurs** : Tu en auras besoin pour Supabase → Edge Functions → Secrets

---

## 🔐 ÉTAPE 3 : SECRETS SUPABASE (3 minutes)

### 📍 Étape 3.1 : Configurer Google Provider (pour CONNEXION)

**C'est pour que les utilisateurs se connectent avec Google (email + mot de passe Google)**

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/auth/providers
2. **Trouve** "Google" dans la liste
3. **Clique sur** "Google" pour ouvrir les paramètres
4. **Active** le toggle "Enable Google provider" (en haut à droite)
5. **Colle** :
   - **Client ID (for OAuth)** : Le Client ID de l'étape 2.4 (celui pour Sign-In)
   - **Client Secret (for OAuth)** : Le Client Secret de l'étape 2.4 (celui pour Sign-In)
6. **Clique sur** "Save"

**✅ Vérification** : Le toggle Google devrait être vert (activé)

**🎉 Résultat** : Les utilisateurs peuvent maintenant se connecter avec Google !

---

### 📍 Étape 3.2 : Ajouter les Secrets Edge Functions (pour CALENDAR)

**C'est pour synchroniser les événements avec Google Calendar**

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. **Clique sur** "Secrets" (ou "Environment Variables")

#### Ajouter 3 secrets :

**Secret 1 : GOOGLE_CLIENT_ID**
- **Clique sur** "Add new secret"
- **Name** : `GOOGLE_CLIENT_ID`
- **Value** : Colle le **Client ID** de l'étape 2.5 (celui pour Calendar)
- **Clique sur** "Save"

**Secret 2 : GOOGLE_CLIENT_SECRET**
- **Clique sur** "Add new secret"
- **Name** : `GOOGLE_CLIENT_SECRET`
- **Value** : Colle le **Client Secret** de l'étape 2.5 (celui pour Calendar)
- **Clique sur** "Save"

**Secret 3 : GOOGLE_REDIRECT_URI**
- **Clique sur** "Add new secret"
- **Name** : `GOOGLE_REDIRECT_URI`
- **Value** : 
  ```
  https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
  ```
- **Clique sur** "Save"

**✅ Vérification** : Tu devrais voir 3 secrets dans la liste :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

---

## 🧪 TESTER

### Test 1 : Connexion avec Google (email + mot de passe Google)

1. **Ouvre l'app** : http://localhost:4000
2. **Va sur** la page de connexion (`/auth`)
3. **Clique sur** "Se connecter avec Google" (ou "Continuer avec Google")
4. **Sélectionne ton compte Google**
5. **Autorise l'application**
6. **Vérifie** que tu es connecté automatiquement

**✅ Résultat attendu** : Tu es connecté avec ton compte Google, pas besoin de créer un compte !

---

### Test 2 : Connexion Google Calendar

1. **Dans l'app**, va dans **"Paramètres"** → **"Intégrations"**
2. **Clique sur** "Connecter Google Calendar"
3. **Autorise l'accès** au calendrier dans la popup Google
4. **Vérifie** que la connexion est enregistrée (badge "Connecté")

**✅ Résultat attendu** : Badge "Connecté" visible avec ton email Google

---

### Test 3 : Synchronisation des Événements

1. **Crée un événement** dans le calendrier de l'app
   - Titre : "Test synchronisation"
   - Date : Aujourd'hui
   - Heure : Dans 1 heure
2. **Ouvre** Google Calendar (https://calendar.google.com)
3. **Vérifie** que l'événement apparaît dans ton calendrier Google

**✅ Résultat attendu** : L'événement est synchronisé automatiquement sur Google Calendar

---

### Test 4 : Modification d'Événement

1. **Modifie l'événement** dans l'app (change le titre ou l'heure)
2. **Rafraîchis** Google Calendar
3. **Vérifie** que la modification est synchronisée

**✅ Résultat attendu** : La modification apparaît sur Google Calendar

---

### Test 5 : Suppression d'Événement

1. **Supprime l'événement** dans l'app
2. **Rafraîchis** Google Calendar
3. **Vérifie** que l'événement est supprimé

**✅ Résultat attendu** : L'événement disparaît de Google Calendar

---

## 📊 RÉCAPITULATIF DES CREDENTIALS

### Pour Google Sign-In (Connexion utilisateur) :
- **Où** : Supabase → Authentication → Providers → Google
- **Client ID** : De l'étape 2.4
- **Client Secret** : De l'étape 2.4
- **Redirect URI** : `/auth/v1/callback`

### Pour Google Calendar (Synchronisation) :
- **Où** : Supabase → Edge Functions → Secrets
- **GOOGLE_CLIENT_ID** : De l'étape 2.5
- **GOOGLE_CLIENT_SECRET** : De l'étape 2.5
- **GOOGLE_REDIRECT_URI** : `/functions/v1/google-calendar-oauth/callback`

---

## ⚠️ IMPORTANT : Pourquoi 2 OAuth Clients ?

### OAuth Client 1 (Sign-In) :
- **But** : Permettre aux utilisateurs de se connecter avec Google
- **Scopes** : `userinfo.email`, `userinfo.profile`, `openid`
- **Configuré dans** : Supabase → Authentication → Providers → Google
- **Résultat** : Les utilisateurs peuvent se connecter avec juste leur email + mot de passe Google

### OAuth Client 2 (Calendar) :
- **But** : Accéder au Google Calendar de l'utilisateur
- **Scopes** : `calendar`, `calendar.events`
- **Configuré dans** : Supabase → Edge Functions → Secrets
- **Résultat** : Les événements sont synchronisés avec Google Calendar

**C'est normal d'avoir 2 clients différents** : ils ont des permissions différentes !

---

## 🎉 C'EST TERMINÉ !

**Résultat** :
- ✅ Les utilisateurs peuvent se connecter avec Google (email + mot de passe Google)
- ✅ Les utilisateurs peuvent connecter leur Google Calendar
- ✅ Les événements sont synchronisés automatiquement (création, modification, suppression)
- ✅ Le calendrier fonctionne exactement comme Google Calendar

**Prochaine étape** : Déployer les Edge Functions (voir `EXECUTER-GOOGLE-CALENDAR-MAINTENANT.md`)

---

## 🐛 DÉPANNAGE

### Erreur : "redirect_uri_mismatch"

**Solution** : Vérifie que le Redirect URI dans Google Cloud Console correspond **exactement** à celui dans Supabase (pas d'espace, pas de slash en trop).

### Erreur : "invalid_client"

**Solution** : Vérifie que les Client ID et Client Secret sont corrects dans Supabase.

### La connexion Google ne fonctionne pas

**Solution** : 
1. Vérifie que le Google Provider est activé dans Supabase → Authentication → Providers
2. Vérifie que les credentials sont corrects
3. Vérifie que l'écran de consentement OAuth est configuré dans Google Cloud Console

### Les événements ne se synchronisent pas

**Solution** :
1. Vérifie que Google Calendar est connecté dans Settings > Intégrations
2. Vérifie que les secrets Edge Functions sont corrects
3. Vérifie les logs dans la console du navigateur (F12)
4. Vérifie les logs des Edge Functions dans Supabase Dashboard

---

## 📝 NOTES IMPORTANTES

- **Connexion Google** : Les utilisateurs peuvent se connecter avec juste leur email + mot de passe Google (pas besoin de créer un compte)
- **Google Calendar** : Chaque utilisateur connecte SON Google Calendar personnel
- **Synchronisation** : Les événements sont synchronisés automatiquement dans les deux sens (App → Google)
- **Isolation** : Chaque utilisateur voit uniquement ses propres événements (multi-tenant)

---

**🔥 Suis ces étapes dans l'ordre et tout fonctionnera parfaitement ! 🔥**
