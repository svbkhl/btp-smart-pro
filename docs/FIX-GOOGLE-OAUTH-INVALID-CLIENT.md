# Fix Google OAuth "invalid_client" Error

## 🔴 Erreur
```
Erreur 401 : invalid_client
Détails de la requête : flowName=GeneralOAuthLite
```

## 🎯 Cause
Google ne reconnaît pas votre Client ID/Secret ou les Redirect URIs ne sont pas configurés correctement.

## 📝 ÉTAPE 1 : Vérifier Google Cloud Console

### 1.1 Accéder aux Credentials
1. Allez sur https://console.cloud.google.com/apis/credentials
2. Sélectionnez votre projet
3. Trouvez votre **OAuth 2.0 Client ID**
4. Cliquez dessus pour voir les détails

### 1.2 Vérifier les Authorized Redirect URIs
**CRITIQUE :** Vous devez avoir EXACTEMENT ces 2 URIs :

```
https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
https://<votre-projet>.supabase.co/auth/v1/callback
```

**Comment trouver votre URL Supabase :**
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- L'URL est dans "Project URL" (ex: https://xxx.supabase.co)

**⚠️ ATTENTION :**
- Les URIs doivent commencer par `https://` (pas `http://`)
- Pas d'espace avant ou après
- Pas de slash `/` à la fin après `callback`
- Les URIs sont sensibles à la casse

### 1.3 Copier les Credentials
Une fois dans les détails de votre OAuth Client :
1. **Copiez le Client ID** (format: `123456789-abc...xyz.apps.googleusercontent.com`)
2. **Copiez le Client Secret** (format: `GOCSPX-...`)

## 📝 ÉTAPE 2 : Configurer Supabase Dashboard

### 2.1 Accéder à la configuration Auth
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet : **renmjmqlmafqjzldmsgs**
3. Dans le menu de gauche : **Authentication** → **Providers**
4. Trouvez **Google** dans la liste

### 2.2 Activer et configurer Google Provider
1. **Activez** le toggle "Enable Sign in with Google"
2. **Collez** votre **Client ID** (celui copié de Google Cloud Console)
3. **Collez** votre **Client Secret** (celui copié de Google Cloud Console)
4. Vérifiez que **Redirect URL** affiche :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
5. Cliquez sur **Save**

## 📝 ÉTAPE 3 : Vérifier la configuration dans votre code

### 3.1 Vérifier les variables d'environnement
Ouvrez `.env.local` ou `.env` et vérifiez :

```env
VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_ANON_KEY=<votre-clé-anon>
```

### 3.2 Vérifier le code de connexion Google
Le code devrait ressembler à :

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

## 🧪 ÉTAPE 4 : Tester

### 4.1 Vider le cache
1. Fermez complètement votre navigateur
2. Rouvrez-le
3. Allez sur `http://localhost:4000`

### 4.2 Tester la connexion Google
1. Cliquez sur "Se connecter avec Google"
2. Sélectionnez votre compte Google
3. Acceptez les permissions

### Résultats possibles

✅ **Succès** : Vous êtes redirigé vers l'application connecté

❌ **Échec** : "invalid_client" → Passez à l'étape 5

## 🔧 ÉTAPE 5 : Diagnostic avancé (si problème persiste)

### 5.1 Vérifier que les IDs correspondent
Dans Google Cloud Console :
- Client ID : vérifiez que vous utilisez le vôtre (Console Google Cloud → APIs & Services → Credentials)
- Client Secret : vérifiez qu'il correspond (jamais à commiter dans le dépôt)

Dans Supabase Dashboard (Authentication → Providers → Google) :
- Doit afficher les **MÊMES** Client ID et Secret (masqué avec des `***`)

### 5.2 Recréer un OAuth Client (solution de dernier recours)
Si rien ne fonctionne après avoir tout vérifié :

1. Dans Google Cloud Console :
   - Cliquez sur votre OAuth Client
   - Cliquez sur "Delete" en haut à droite
   - Confirmez la suppression

2. Créez un nouveau OAuth Client :
   - Cliquez sur "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type : **Web application**
   - Name : `BTP Smart Pro - Supabase Auth`
   - Authorized redirect URIs :
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
     ```
   - Cliquez sur "CREATE"
   - **Copiez** le nouveau Client ID et Client Secret

3. Mettez à jour dans Supabase Dashboard
   - Authentication → Providers → Google
   - Collez le nouveau Client ID
   - Collez le nouveau Client Secret
   - Save

4. Testez à nouveau

## ⚠️ Erreurs communes

### Erreur : "redirect_uri_mismatch"
**Cause :** L'URI de redirection ne correspond pas

**Solution :**
1. Vérifiez que dans Google Cloud Console, l'URI est EXACTEMENT :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
2. Pas d'espace, pas de typo, pas de slash à la fin

### Erreur : "access_denied"
**Cause :** L'utilisateur a refusé les permissions OU le client OAuth n'est pas approuvé

**Solution :**
1. Acceptez toutes les permissions demandées
2. Vérifiez que l'écran de consentement OAuth est configuré dans Google Cloud Console

### Erreur : "invalid_request"
**Cause :** Paramètres OAuth manquants ou incorrects

**Solution :**
1. Vérifiez que le provider est bien activé dans Supabase
2. Vérifiez les variables d'environnement

## 📊 Checklist finale

Avant de contacter le support, vérifiez :

- [ ] Google Cloud Console : OAuth Client créé
- [ ] Google Cloud Console : Redirect URI = `https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback`
- [ ] Google Cloud Console : Client ID et Secret copiés
- [ ] Supabase Dashboard : Google Provider activé
- [ ] Supabase Dashboard : Client ID collé (même que Google)
- [ ] Supabase Dashboard : Client Secret collé (même que Google)
- [ ] Supabase Dashboard : Sauvegardé avec le bouton "Save"
- [ ] Variables d'environnement : VITE_SUPABASE_URL correct
- [ ] Cache vidé : Navigateur fermé et rouvert
- [ ] Test : Clic sur "Se connecter avec Google"

## 💡 Note importante

**Si vous utilisez plusieurs environnements** (dev, staging, prod), vous devez :
- Créer un OAuth Client séparé pour chaque environnement
- Ajouter les redirect URIs pour chaque environnement
- Configurer chaque environnement avec ses propres credentials

---

**Date :** 2026-02-04  
**Status :** En attente de validation
**Projet Supabase :** renmjmqlmafqjzldmsgs
