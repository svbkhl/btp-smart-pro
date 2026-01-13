# 🔍 Vérifier que GOOGLE_REDIRECT_URI est identique partout

## ⚠️ IMPORTANT

Le `redirect_uri` doit être **EXACTEMENT identique** dans :
1. **Supabase Secrets** : `GOOGLE_REDIRECT_URI`
2. **Google Cloud Console** : Authorized redirect URIs
3. **Edge Function** : Utilise `GOOGLE_REDIRECT_URI` depuis les secrets

---

## 📋 Étape 1 : Vérifier Supabase Secrets

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/secrets
2. **Trouvez** `GOOGLE_REDIRECT_URI`
3. **Copiez** la valeur exacte

**Format attendu** :
```
https://www.btpsmartpro.com/settings?tab=integrations
```

OU (si vous utilisez un callback Edge Function) :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

---

## 📋 Étape 2 : Vérifier Google Cloud Console

1. **Allez sur** : https://console.cloud.google.com/apis/credentials
2. **Trouvez** votre OAuth 2.0 Client ID
3. **Cliquez** pour éditer
4. **Vérifiez** "Authorized redirect URIs"
5. **Assurez-vous** que l'URI est **EXACTEMENT identique** à celui dans Supabase Secrets

**⚠️ IMPORTANT** :
- Pas d'espaces avant/après
- Même protocole (https)
- Même domaine
- Même chemin
- Même casse (majuscules/minuscules)

---

## 📋 Étape 3 : Vérifier l'Edge Function

L'Edge Function `google-calendar-oauth-entreprise-pkce` utilise :
```typescript
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || "";
```

Elle utilise cette valeur pour :
1. **Générer l'URL OAuth** : `authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI)`
2. **Échanger le code** : `redirect_uri: GOOGLE_REDIRECT_URI`

---

## ✅ Checklist

- [ ] `GOOGLE_REDIRECT_URI` dans Supabase Secrets est défini
- [ ] L'URI dans Google Cloud Console est **identique** (caractère par caractère)
- [ ] Pas d'espaces ou caractères invisibles
- [ ] Même protocole (https)
- [ ] L'URI est accessible (pas de 404)

---

## 🔧 Si l'URI est différent

1. **Décidez** de l'URI à utiliser (recommandé : frontend avec query params)
2. **Mettez à jour** Supabase Secrets
3. **Mettez à jour** Google Cloud Console
4. **Redéployez** l'Edge Function (si nécessaire)

---

## 📝 Format recommandé

Pour un callback frontend :
```
https://www.btpsmartpro.com/settings?tab=integrations&google_calendar_status=success&code=...
```

Pour un callback Edge Function :
```
https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-callback
```

**Le frontend actuel attend** le callback sur `/settings?tab=integrations` avec les paramètres OAuth.
