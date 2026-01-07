# 🔧 Correction Erreur 400 - google-calendar-oauth

## 🔍 Problème

La fonction `google-calendar-oauth` retourne une erreur **400 (Bad Request)** car :
- Elle attend les paramètres dans les **query params** de l'URL
- Le frontend envoie les paramètres dans le **body** (JSON)

---

## ✅ Corrections Appliquées

### 1. Lecture du Body

La fonction accepte maintenant les paramètres depuis :
- ✅ **Body JSON** (priorité) - comme le frontend l'envoie
- ✅ **Query params** (fallback) - pour compatibilité

### 2. Récupération du company_id

Si `company_id` n'est pas fourni, la fonction :
- ✅ Essaie de le récupérer depuis `company_users` automatiquement
- ✅ Utilise le `company_id` de l'utilisateur connecté

### 3. Actions Corrigées

Toutes les actions acceptent maintenant le body :
- ✅ `get_auth_url` - Lit `action` et `company_id` depuis le body
- ✅ `exchange_code` - Lit `code` et `company_id` depuis le body
- ✅ `refresh_token` - Lit `connection_id` depuis le body
- ✅ `disconnect` - Lit `connection_id` depuis le body

---

## 🚀 Action Requise : Redéployer

### Via Dashboard

1. Allez sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions**
2. Trouvez **`google-calendar-oauth`**
3. Cliquez sur les **3 points** → **"Redeploy"**

### Via CLI

```bash
supabase functions deploy google-calendar-oauth --no-verify-jwt
```

---

## ✅ Après Redéploiement

1. **Testez la connexion Google Calendar** dans l'app
2. **Vérifiez les logs** - vous devriez voir des entrées maintenant
3. **L'erreur 400 ne devrait plus apparaître** ✅

---

## 📝 Code Modifié

La fonction lit maintenant le body comme ceci :

```typescript
// Récupérer l'action depuis le body ou les query params (compatibilité)
const url = new URL(req.url);
let bodyData: any = {};

// Essayer de lire le body si la méthode est POST/PUT
if (req.method === "POST" || req.method === "PUT") {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const clonedReq = req.clone();
      const bodyText = await clonedReq.text();
      if (bodyText && bodyText.trim()) {
        bodyData = JSON.parse(bodyText);
      }
    }
  } catch (e) {
    // Body vide ou invalide, utiliser query params
  }
}

const action = bodyData.action || url.searchParams.get("action");
```

---

## 🧪 Test

Après redéploiement :

1. Ouvrez l'app : **https://www.btpsmartpro.com**
2. Allez dans **Paramètres** → **Intégrations** → **Google Calendar**
3. Cliquez sur **"Connecter Google Calendar"**
4. **L'erreur 400 ne devrait plus apparaître** ✅
5. **Vous devriez être redirigé vers Google OAuth** ✅

