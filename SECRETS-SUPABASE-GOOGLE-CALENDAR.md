# 🔐 Secrets Supabase à Configurer pour Google Calendar

## 📋 Liste des 3 Secrets Requis

Vous devez configurer **3 secrets** dans Supabase pour que l'intégration Google Calendar fonctionne :

1. **GOOGLE_CLIENT_ID** - Votre Client ID OAuth de Google Cloud Console
2. **GOOGLE_CLIENT_SECRET** - Votre Client Secret OAuth de Google Cloud Console
3. **GOOGLE_REDIRECT_URI** - L'URL de redirection OAuth

---

## 🚀 Méthode 1 : Via le Dashboard Supabase (Recommandé)

### Étape 1 : Accéder aux Secrets

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. Faites défiler jusqu'à la section **"Secrets"**

### Étape 2 : Ajouter les Secrets

#### Secret 1 : GOOGLE_CLIENT_ID

1. Cliquez sur **"Add new secret"** ou **"New secret"**
2. **Name** : `GOOGLE_CLIENT_ID`
3. **Value** : Votre Client ID (exemple : `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
4. Cliquez sur **"Save"** ou **"Add"**

#### Secret 2 : GOOGLE_CLIENT_SECRET

1. Cliquez sur **"Add new secret"** ou **"New secret"**
2. **Name** : `GOOGLE_CLIENT_SECRET`
3. **Value** : Votre Client Secret (exemple : `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
4. Cliquez sur **"Save"** ou **"Add"**

#### Secret 3 : GOOGLE_REDIRECT_URI

1. Cliquez sur **"Add new secret"** ou **"New secret"**
2. **Name** : `GOOGLE_REDIRECT_URI`
3. **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback`
4. Cliquez sur **"Save"** ou **"Add"`

**⚠️ IMPORTANT** : Cette URI doit pointer vers `google-calendar-callback` (la fonction qui reçoit le callback OAuth de Google)

---

## 💻 Méthode 2 : Via CLI Supabase

Si vous préférez utiliser la ligne de commande :

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet
supabase link --project-ref renmjmqlmafqjzldmsgs

# Ajouter les secrets
supabase secrets set GOOGLE_CLIENT_ID="VOTRE_CLIENT_ID_ICI"
supabase secrets set GOOGLE_CLIENT_SECRET="VOTRE_CLIENT_SECRET_ICI"
supabase secrets set GOOGLE_REDIRECT_URI="https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback"
```

**Remplacez** :
- `VOTRE_CLIENT_ID_ICI` par votre vrai Client ID
- `VOTRE_CLIENT_SECRET_ICI` par votre vrai Client Secret

---

## 📝 Où Trouver GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET ?

### Étape 1 : Google Cloud Console

1. Allez sur : https://console.cloud.google.com/
2. Sélectionnez votre projet (ou créez-en un)
3. Allez dans **APIs & Services** → **Credentials**
4. Si vous n'avez pas encore de Client OAuth :
   - Cliquez sur **"Create Credentials"** → **"OAuth client ID"**
   - **Application type** : **Web application**
   - **Name** : `BTP Smart Pro - Google Calendar`
   - **Authorized redirect URIs** : 
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
     ```
   - Cliquez sur **"Create"**
5. **Copiez le Client ID** (exemple : `123456789-abc...`)
6. **Copiez le Client Secret** (exemple : `GOCSPX-abc...`)

### Étape 2 : Activer Google Calendar API

1. Dans Google Cloud Console, allez dans **APIs & Services** → **Library**
2. Recherchez **"Google Calendar API"**
3. Cliquez dessus et cliquez sur **"Enable"**

---

## ✅ Vérification des Secrets

### Vérifier via Dashboard

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. Section **"Secrets"**
3. Vous devriez voir les 3 secrets :
   - ✅ `GOOGLE_CLIENT_ID` (masqué)
   - ✅ `GOOGLE_CLIENT_SECRET` (masqué)
   - ✅ `GOOGLE_REDIRECT_URI` (visible)

### Vérifier via CLI

```bash
supabase secrets list
```

Vous devriez voir les 3 secrets listés.

---

## 🔄 Redéployer les Edge Functions

**Important** : Après avoir ajouté/modifié les secrets, vous devez redéployer les Edge Functions :

### Via Dashboard

1. Allez dans **Edge Functions**
2. Trouvez `google-calendar-oauth-entreprise-pkce`
3. Cliquez sur **"Redeploy"** ou **"Deploy"**

### Via CLI

```bash
supabase functions deploy google-calendar-oauth-entreprise-pkce
supabase functions deploy google-calendar-sync-entreprise
```

---

## ⚠️ Notes Importantes

1. **Ne partagez JAMAIS** vos secrets publiquement
2. **GOOGLE_CLIENT_SECRET** est sensible - gardez-le secret
3. L'URL de redirection doit être **exactement** la même dans :
   - Google Cloud Console (Authorized redirect URIs)
   - Supabase Secret (GOOGLE_REDIRECT_URI)
4. Utilisez toujours `https://` (pas `http://`)
5. Pas de trailing slash (`/`) à la fin de l'URL

---

## 🧪 Test de la Configuration

Une fois les secrets configurés :

1. Allez dans votre application
2. **Paramètres** → **Intégrations** → **Google Calendar**
3. Cliquez sur **"Connecter Google Calendar"**
4. Vous devriez être redirigé vers Google OAuth
5. Autorisez l'accès
6. Vous serez redirigé vers l'app avec la connexion établie

Si une erreur apparaît, vérifiez :
- ✅ Les 3 secrets sont bien configurés
- ✅ Les Edge Functions sont redéployées
- ✅ L'URL de redirection est identique partout
- ✅ Google Calendar API est activée dans Google Cloud Console

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs des Edge Functions dans Supabase Dashboard
2. Vérifiez la console du navigateur pour les erreurs
3. Vérifiez que tous les secrets sont correctement configurés

