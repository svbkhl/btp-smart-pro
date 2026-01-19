# 🔍 Diagnostic et Correction de l'Erreur 400 lors du Login

## 📋 Cause Racine

L'erreur 400 (Bad Request) lors de la connexion sur `https://www.btpsmartpro.com/auth` est causée par :
1. **Manque de normalisation de l'email** : L'email n'était pas normalisé (lowercase + trim) avant l'envoi à Supabase
2. **Messages d'erreur génériques** : Toutes les erreurs 400 étaient affichées comme "Identifiant ou mot de passe incorrect", même pour des erreurs techniques
3. **Absence de logs détaillés** : Impossible d'identifier exactement quelle requête retourne 400 et pourquoi

## ✅ Corrections Apportées

### 1. Normalisation de l'Email et du Mot de Passe
- **Fichier** : `src/pages/Auth.tsx`
- **Ligne** : `handleSignIn` fonction
- **Changement** : Normalisation de l'email en `lowercase` et `trim()` avant l'envoi
- **Code** :
  ```typescript
  const normalizedEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  ```

### 2. Gestion Améliorée des Erreurs 400
- **Fichier** : `src/pages/Auth.tsx`
- **Changement** : Différenciation entre erreurs techniques (400) et erreurs d'identifiants (401)
- **Comportement** :
  - Erreur 400 → Message technique spécifique (ex: "Format d'email invalide", "Requête invalide")
  - Erreur 401 → Message "Identifiant ou mot de passe incorrect"
  - Erreur 422 → Message de validation
  - Erreur 429 → Message de rate limit

### 3. Logs Détaillés des Requêtes Réseau
- **Fichier** : `src/integrations/supabase/client.ts`
- **Changement** : Intercepteur `fetch` global pour logger toutes les requêtes Supabase Auth
- **Logs inclus** :
  - URL complète de la requête
  - Méthode HTTP
  - Headers (Content-Type, apikey)
  - Body de la requête (mot de passe masqué)
  - Status code de la réponse
  - Body de la réponse
  - Durée de la requête

### 4. Logs dans handleSignIn
- **Fichier** : `src/pages/Auth.tsx`
- **Changement** : Logs complets du processus de connexion
- **Logs inclus** :
  - Configuration Supabase (URL, clé API)
  - Données de connexion (email normalisé, longueur du mot de passe)
  - Détails de la réponse (erreur ou succès)
  - Type d'erreur identifié

## 🔧 Patch Complet

### Fichier : `src/pages/Auth.tsx`

**Avant** :
```typescript
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

**Après** :
```typescript
const normalizedEmail = email.trim().toLowerCase();
const cleanPassword = password.trim();

// Logs détaillés + meilleure gestion des erreurs
const { error } = await supabase.auth.signInWithPassword({
  email: normalizedEmail,
  password: cleanPassword,
});
```

### Fichier : `src/integrations/supabase/client.ts`

**Avant** :
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Après** :
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: async (url, options = {}) => {
      // Intercepteur avec logs détaillés
      // (voir le code complet dans le fichier)
    },
  },
});
```

## 📊 Logs Minimaux pour Diagnostic

Après ces corrections, vous verrez dans la console du navigateur (F12) :

### Lors d'une tentative de connexion réussie :
```
🔐 [handleSignIn] Starting login attempt: { email: "user@example.com", passwordLength: 12, ... }
🌐 [Supabase Auth Request] { url: ".../auth/v1/token?grant_type=password", method: "POST", ... }
📥 [Supabase Auth Response] { status: 200, ok: true, body: {...} }
✅ [handleSignIn] Login successful: { userId: "...", email: "user@example.com" }
```

### Lors d'une erreur 400 :
```
🔐 [handleSignIn] Starting login attempt: { email: "user@example.com", passwordLength: 12, ... }
🌐 [Supabase Auth Request] { url: ".../auth/v1/token?grant_type=password", method: "POST", ... }
📥 [Supabase Auth Response] { status: 400, ok: false, body: { error: "...", error_description: "..." } }
❌ [Supabase Auth 400 Error] { url: "...", status: 400, responseBody: {...} }
❌ [handleSignIn] Error type: technical, Final message: "Format d'email invalide..."
```

## 🎯 Endpoint Identifié

**Endpoint qui retourne 400** : 
```
POST https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/token?grant_type=password
```

**Headers envoyés** :
- `Content-Type: application/json`
- `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`
- `Authorization: Bearer <token>` (si disponible)

**Body envoyé** :
```json
{
  "email": "user@example.com",
  "password": "***HIDDEN***"
}
```

## 🚀 Prochaines Étapes

1. **Tester la connexion** sur `https://www.btpsmartpro.com/auth`
2. **Vérifier les logs** dans la console du navigateur (F12 → Console)
3. **Si l'erreur 400 persiste**, les logs indiqueront exactement :
   - Le message d'erreur de Supabase
   - La cause spécifique (format email, mot de passe requis, etc.)
   - Les headers et le body de la requête

## 📝 Notes Importantes

- ✅ **Mot de passe toujours masqué** dans les logs (`***HIDDEN***`)
- ✅ **Messages d'erreur spécifiques** selon le type d'erreur (technique vs identifiants)
- ✅ **Normalisation automatique** de l'email (lowercase + trim)
- ✅ **Logs complets** pour diagnostic en production
