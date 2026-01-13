# 🚀 Redéployer les 2 Edge Functions Google Calendar

## ⚠️ IMPORTANT : Il faut redéployer 2 fonctions !

Le problème vient du fait que `google-calendar-oauth` ne demandait pas les scopes `userinfo`, donc Google ne les accordait pas. J'ai corrigé cela.

---

## 📋 Fonction 1 : google-calendar-oauth

### 1. Ouvrir la fonction

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth` dans la liste
3. **Cliquez sur** "Edit"

### 2. Copier le code

1. **Ouvrez** le fichier : `supabase/functions/google-calendar-oauth/index.ts`
2. **Sélectionnez TOUT** (Cmd+A)
3. **Copiez** (Cmd+C)

### 3. Coller et déployer

1. **Dans l'éditeur Supabase**, sélectionnez tout (Cmd+A)
2. **Supprimez** (Backspace)
3. **Collez** (Cmd+V)
4. **Cliquez sur** "Deploy"

---

## 📋 Fonction 2 : google-calendar-oauth-entreprise-pkce

### 1. Ouvrir la fonction

1. **Toujours dans** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce` dans la liste
3. **Cliquez sur** "Edit"

### 2. Copier le code

1. **Ouvrez** le fichier : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
2. **Sélectionnez TOUT** (Cmd+A)
3. **Copiez** (Cmd+C)

### 3. Coller et déployer

1. **Dans l'éditeur Supabase**, sélectionnez tout (Cmd+A)
2. **Supprimez** (Backspace)
3. **Collez** (Cmd+V)
4. **Cliquez sur** "Deploy"

---

## ✅ Vérification

Après avoir redéployé les 2 fonctions :

1. **Testez** la connexion Google Calendar
2. **Autorisez** sur Google (vous devriez voir les permissions userinfo demandées)
3. **Vérifiez les logs** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions

Les nouveaux logs devraient montrer :
- `✅ [exchange_code] Tokens reçus de Google:` avec les scopes incluant `userinfo`
- `✅ [exchange_code] User info reçue:` au lieu de l'erreur 401

---

## 🎯 Pourquoi 2 fonctions ?

- **`google-calendar-oauth`** : Génère l'URL OAuth initiale (demande les permissions)
- **`google-calendar-oauth-entreprise-pkce`** : Échange le code contre des tokens (utilise les permissions)

Les deux doivent être synchronisées sur les scopes demandés !

---

## 💡 Après le redéploiement

Si vous avez déjà autorisé Google Calendar sans les scopes userinfo, vous devrez peut-être :
1. **Révoquer l'accès** dans Google Account Settings
2. **Relancer** la connexion pour que Google demande les nouvelles permissions

Ou simplement **relancer la connexion** - Google devrait demander les nouvelles permissions.
