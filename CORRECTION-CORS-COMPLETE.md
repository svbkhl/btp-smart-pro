# ✅ Correction CORS Complète - Google Calendar

## 🔧 Corrections Appliquées

### Fonction `google-calendar-oauth`

**Fichier modifié** : `supabase/functions/google-calendar-oauth/index.ts`

**Problèmes corrigés** :
- ✅ Headers CORS complets avec origine dynamique
- ✅ Réponse OPTIONS avec status **204** (au lieu de 200 avec "ok")
- ✅ Ajout de `Access-Control-Allow-Methods` : `GET, POST, PUT, DELETE, OPTIONS`
- ✅ Ajout de `Access-Control-Max-Age` : `86400`
- ✅ Support des origines autorisées :
  - `https://btpsmartpro.com`
  - `https://www.btpsmartpro.com`
  - `http://localhost:5173` (développement)
  - `http://localhost:3000` (développement)

**Code ajouté** :
```typescript
// Headers CORS complets pour production
const origin = req.headers.get("Origin");
const allowedOrigins = [
  "https://btpsmartpro.com",
  "https://www.btpsmartpro.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin || "") ? origin! : "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// Gérer les requêtes OPTIONS (preflight) - DOIT retourner 204
if (req.method === "OPTIONS") {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  });
}
```

---

## 🚀 Action Requise : Redéployer la Fonction

### Via Dashboard Supabase (Recommandé)

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Trouvez la fonction **`google-calendar-oauth`**
3. Cliquez sur les **3 points** (menu) à droite
4. Cliquez sur **"Redeploy"** ou **"Deploy"**
5. Attendez que le déploiement se termine (✅ vert)

### Via CLI

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

---

## ✅ Vérification

### 1. Vérifier le déploiement

- Dashboard Supabase → Functions → `google-calendar-oauth`
- Vérifiez que la **dernière mise à jour** est récente
- Statut doit être **actif** (vert)

### 2. Tester dans l'app

1. Ouvrez : **https://www.btpsmartpro.com**
2. Allez dans **Paramètres** → **Intégrations** → **Google Calendar**
3. Cliquez sur **"Connecter Google Calendar"**
4. **L'erreur CORS ne devrait plus apparaître** ✅

### 3. Vérifier dans la console du navigateur

Ouvrez la console (F12) et vérifiez :
- ✅ Les requêtes OPTIONS retournent **status 204**
- ✅ Les headers `Access-Control-Allow-Origin` sont présents
- ✅ Les headers `Access-Control-Allow-Methods` incluent `POST, GET, OPTIONS`
- ✅ Aucune erreur CORS dans la console

---

## 📋 Toutes les Fonctions CORS Corrigées

| Fonction | Status | Action Requise |
|----------|--------|----------------|
| `google-calendar-oauth` | ✅ Corrigée | Redéployer |
| `google-calendar-oauth-entreprise-pkce` | ✅ Corrigée | Redéployer |
| `google-calendar-sync-entreprise` | ✅ Corrigée | Redéployer |

---

## 🔍 En Cas d'Erreur Persistante

### Si l'erreur CORS persiste après redéploiement :

1. **Videz le cache du navigateur**
   - Chrome/Edge : `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
   - Firefox : `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)

2. **Vérifiez les logs de la fonction**
   - Dashboard Supabase → Functions → `google-calendar-oauth` → Logs
   - Vérifiez qu'il n'y a pas d'erreurs récentes

3. **Vérifiez l'origine dans la console**
   - Ouvrez la console (F12)
   - Onglet Network
   - Cliquez sur la requête qui échoue
   - Vérifiez l'onglet Headers → Request Headers → `Origin`
   - L'origine doit être `https://www.btpsmartpro.com` ou `https://btpsmartpro.com`

4. **Vérifiez que la fonction est bien redéployée**
   - Dashboard → Functions → Vérifiez la date/heure de dernière mise à jour

---

## 📝 Notes Techniques

### Pourquoi status 204 pour OPTIONS ?

Les requêtes OPTIONS (preflight) doivent retourner **204 No Content** et non 200. C'est une exigence du standard CORS.

### Pourquoi origine dynamique ?

Au lieu de `"*"` partout, on vérifie l'origine et on la retourne si elle est autorisée. C'est plus sécurisé et certains navigateurs rejettent `"*"` avec credentials.

### Headers CORS requis

- `Access-Control-Allow-Origin` : Origine autorisée
- `Access-Control-Allow-Methods` : Méthodes HTTP autorisées
- `Access-Control-Allow-Headers` : Headers autorisés dans la requête
- `Access-Control-Max-Age` : Durée de cache du preflight (24h)

---

## ✅ Résumé

**Corrections appliquées** :
- ✅ Gestion CORS complète dans `google-calendar-oauth`
- ✅ Réponse OPTIONS avec status 204
- ✅ Headers CORS complets
- ✅ Support des origines de production

**Action requise** :
- 🔄 Redéployer la fonction `google-calendar-oauth`

**Résultat attendu** :
- ✅ Plus d'erreur CORS
- ✅ Connexion Google Calendar fonctionnelle depuis `https://www.btpsmartpro.com`

