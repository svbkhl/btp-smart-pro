# 🔍 Comment Trouver "Test users" dans Google Cloud Console

## 🎯 Si Vous Ne Voyez Pas "Test users"

Plusieurs raisons possibles. Voici comment les résoudre :

---

## ✅ Solution 1 : Vérifier le Mode de Publication

### Étape 1 : Vérifier le Statut de Publication

1. **Allez sur** : https://console.cloud.google.com/apis/credentials/consent
2. **Faites défiler** jusqu'à la section **"Publishing status"** (Statut de publication)
3. **Regardez le statut** :
   - 🟡 **"Testing"** → Vous devriez voir "Test users" (voir Solution 2)
   - 🟢 **"In production"** → Pas besoin de test users (l'application est publique)
   - 🔴 **"Not published"** → Vous devez d'abord configurer l'écran de consentement (voir Solution 3)

---

## ✅ Solution 2 : Si le Statut est "Testing" mais Pas de "Test users"

### Vérifier que Vous Êtes sur la Bonne Page

1. **URL exacte** : https://console.cloud.google.com/apis/credentials/consent
2. **Vérifiez** que vous voyez :
   - "OAuth consent screen" en haut
   - "Publishing status" quelque part sur la page
   - "Scopes" (les permissions)

### Si Vous Ne Voyez Pas "Test users" :

1. **Faites défiler** jusqu'en bas de la page
2. **Cherchez** une section avec :
   - "User type" (Type d'utilisateur)
   - "App domain" (Domaine de l'application)
   - **"Test users"** devrait être juste après

### Alternative : Utiliser la Recherche dans la Page

1. **Appuyez sur** `Cmd+F` (Mac) ou `Ctrl+F` (Windows)
2. **Tapez** : `test users` ou `testusers`
3. **La section devrait être mise en surbrillance**

---

## ✅ Solution 3 : Si le Statut est "Not published" - Configurer l'Écran de Consentement

Si vous voyez "Not published" ou si l'écran de consentement n'est pas configuré :

### Étape 1 : Configurer l'Écran de Consentement

1. **Sur la page** : https://console.cloud.google.com/apis/credentials/consent
2. **Remplissez les champs obligatoires** :

   **User type** :
   - Sélectionnez **"External"** (pour permettre à tous les utilisateurs Google de se connecter)
   - Cliquez sur **"CREATE"**

   **App information** :
   - **App name** : `BTP Smart Pro` (ou votre nom)
   - **User support email** : `sabri.khalfallah6@gmail.com`
   - **App logo** : (optionnel, vous pouvez ignorer)
   - **App domain** : `btpsmartpro.com`
   - **Application home page** : `https://www.btpsmartpro.com`
   - **Privacy policy link** : `https://www.btpsmartpro.com/privacy` (ou créez une page)
   - **Terms of service link** : `https://www.btpsmartpro.com/terms` (ou créez une page)
   - **Authorized domains** : `btpsmartpro.com`

   **Developer contact information** :
   - **Email addresses** : `sabri.khalfallah6@gmail.com`

3. **Cliquez sur "SAVE AND CONTINUE"**

### Étape 2 : Configurer les Scopes

1. **Sur la page suivante**, vous verrez "Scopes"
2. **Vérifiez** que ces scopes sont présents :
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
3. **Si ce n'est pas le cas**, ajoutez-les :
   - Cliquez sur "ADD OR REMOVE SCOPES"
   - Cherchez "Google Calendar API"
   - Cochez les scopes nécessaires
   - Cliquez sur "UPDATE"
4. **Cliquez sur "SAVE AND CONTINUE"**

### Étape 3 : Ajouter des Utilisateurs de Test

1. **Sur la page suivante**, vous devriez maintenant voir **"Test users"**
2. **Cliquez sur "ADD USERS"**
3. **Ajoutez** : `sabri.khalfallah6@gmail.com`
4. **Cliquez sur "ADD"**
5. **Cliquez sur "SAVE AND CONTINUE"**

### Étape 4 : Résumé

1. **Vérifiez** toutes les informations
2. **Cliquez sur "BACK TO DASHBOARD"**

---

## ✅ Solution 4 : Si Vous Êtes sur la Mauvaise Page

### Vérifier l'URL

L'URL doit être exactement :
```
https://console.cloud.google.com/apis/credentials/consent
```

**Pas** :
- ❌ `https://console.cloud.google.com/apis/credentials` (page des credentials)
- ❌ `https://console.cloud.google.com/apis` (page des APIs)

### Navigation Manuelle

1. **Allez sur** : https://console.cloud.google.com
2. **Sélectionnez votre projet** (en haut)
3. **Menu hamburger** (☰) en haut à gauche
4. **APIs & Services** → **OAuth consent screen**

---

## ✅ Solution 5 : Si L'Application est Déjà en Production

Si le statut est **"In production"** :

- ✅ **Pas besoin d'utilisateurs de test** !
- ✅ **Tous les utilisateurs Google** peuvent se connecter
- ✅ **L'application est publique**

**Si vous voyez toujours l'erreur** :
- Vérifiez que vous utilisez le bon OAuth Client ID
- Vérifiez que l'URI de redirection est correcte

---

## 🔍 Vérification Rapide

### Checklist

- [ ] URL correcte : `https://console.cloud.google.com/apis/credentials/consent`
- [ ] Bon projet sélectionné (en haut de la page)
- [ ] Statut de publication visible
- [ ] Écran de consentement configuré (si "Not published")

---

## 📸 À Quoi Ça Ressemble

### Section "Test users" (si visible) :

```
┌─────────────────────────────────┐
│ Test users                      │
│                                 │
│ These users can access your app │
│ while it's in testing mode.     │
│                                 │
│ [ADD USERS]                     │
│                                 │
│ (Liste vide ou avec des emails) │
└─────────────────────────────────┘
```

### Si Vous Ne Voyez Pas Cette Section :

1. Vérifiez le "Publishing status"
2. Si "Not published", configurez d'abord l'écran de consentement
3. Si "In production", vous n'avez pas besoin de test users

---

## 🚨 Si Rien Ne Fonctionne

**Dites-moi** :
1. Quel est le **"Publishing status"** que vous voyez ?
2. Voyez-vous **"OAuth consent screen"** en haut de la page ?
3. Voyez-vous une section **"Scopes"** ?
4. Quelle est l'**URL exacte** de la page où vous êtes ?

---

**Avec ces informations, je pourrai vous guider plus précisément !** 🎯
