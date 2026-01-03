# 🔧 Résoudre l'erreur 401 Unauthorized

## ⚠️ Problème

L'Edge Function retourne **401 Unauthorized** même après avoir configuré `SERVICE_ROLE_KEY`.

---

## ✅ Solutions à vérifier

### 1. Vérifier les logs Supabase

1. **Dashboard** → **Edge Functions** → **send-invitation** → **Logs**
2. **Cherchez** le log : `🔑 ENV:`

**Si vous voyez** :
```json
{
  "keyLoaded": false,
  "keyLength": 0
}
```

→ **Problème** : La clé `SERVICE_ROLE_KEY` n'est pas configurée correctement

**Solution** :
- Vérifiez que `SERVICE_ROLE_KEY` est bien dans **Edge Functions** → **Settings** → **Environment variables**
- Redéployez la function après avoir ajouté la clé

---

### 2. Vérifier que l'utilisateur est connecté

L'erreur 401 peut aussi venir du fait que l'utilisateur n'est pas authentifié.

**Vérification** :
- Ouvrez la console du navigateur (F12)
- Regardez le log : `🔐 User session:`
- Si vous voyez `null` ou `undefined` → L'utilisateur n'est pas connecté

**Solution** :
- Reconnectez-vous à l'application
- Vérifiez que la session est active

---

### 3. Vérifier les variables d'environnement du frontend

Assurez-vous que ces variables sont définies dans votre `.env` :

```env
VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ... (clé anon)
```

**Vérification** :
- Ouvrez la console du navigateur
- Tapez : `import.meta.env.VITE_SUPABASE_URL`
- Vous devriez voir l'URL

---

### 4. Rendre l'Edge Function publique (si nécessaire)

Si l'Edge Function doit être accessible sans authentification :

1. **Dashboard** → **Edge Functions** → **send-invitation** → **Settings**
2. **Section** : **Authentication**
3. **Option** : **Public** (pas "Requires authentication")

**Note** : Normalement, l'Edge Function devrait fonctionner avec authentification si l'utilisateur est connecté.

---

### 5. Vérifier que SERVICE_ROLE_KEY est la bonne clé

**Important** : La clé doit être la clé **`service_role`** (pas `anon`).

**Où la trouver** :
1. **Dashboard** → **Settings** → **API** → **Project API keys**
2. **Cherchez** : La ligne avec **`service_role`** et **"full access, secret"**
3. **Copiez** cette clé complète

**Vérification** :
- La clé doit commencer par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...`
- La clé doit faire environ 200+ caractères
- **PAS** la clé `anon` public

---

## 🔍 Diagnostic étape par étape

### Étape 1 : Vérifier les logs Supabase

1. Testez l'invitation
2. Allez dans **Edge Functions** → **send-invitation** → **Logs**
3. **Cherchez** : `🔑 ENV:`

**Résultat attendu** :
```json
{
  "url": "https://renmjmqlmafqjzldmsgs.supabase.co",
  "keyLoaded": true,
  "keyLength": 200+,
  "keyPrefix": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Si `keyLoaded: false`** :
→ La clé n'est pas configurée → Vérifiez l'étape 5

---

### Étape 2 : Vérifier la console du navigateur

1. Ouvrez la console (F12)
2. Testez l'invitation
3. **Regardez** les logs :
   - `📤 Sending invitation request - Body:`
   - `🔐 User session:`
   - `📥 Response received:`

**Si `User session: null`** :
→ L'utilisateur n'est pas connecté → Reconnectez-vous

---

### Étape 3 : Vérifier les variables d'environnement

Dans la console du navigateur, tapez :
```javascript
console.log({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...'
});
```

**Résultat attendu** :
```javascript
{
  url: "https://renmjmqlmafqjzldmsgs.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIs..."
}
```

**Si `undefined`** :
→ Les variables d'environnement ne sont pas définies → Vérifiez votre `.env`

---

## 🎯 Solution rapide

Si vous avez configuré `SERVICE_ROLE_KEY` mais que ça ne fonctionne toujours pas :

1. **Vérifiez les logs Supabase** → Cherchez `🔑 ENV:`
2. **Si `keyLoaded: false`** :
   - Allez dans **Edge Functions** → **send-invitation** → **Settings** → **Environment variables**
   - Vérifiez que `SERVICE_ROLE_KEY` existe
   - Vérifiez qu'il n'y a pas d'espace avant/après
   - **Redéployez** la function
3. **Si `keyLoaded: true` mais toujours 401** :
   - Vérifiez que l'utilisateur est connecté
   - Vérifiez les logs pour voir l'erreur exacte

---

## 📞 Si ça ne fonctionne toujours pas

Partagez :
1. Le log `🔑 ENV:` depuis Supabase
2. Le log `🔐 User session:` depuis la console du navigateur
3. Le message d'erreur exact

Et je pourrai vous aider à diagnostiquer le problème exact.







