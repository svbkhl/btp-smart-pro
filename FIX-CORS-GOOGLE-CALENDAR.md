# 🔧 Correction CORS - Google Calendar

## ✅ Corrections Appliquées

### 1. Fonction `google-calendar-oauth-entreprise-pkce`

**Problème** :
- Headers CORS incomplets
- Réponse OPTIONS avec status 200 au lieu de 204
- Manque `Access-Control-Allow-Methods`

**Correction** :
- ✅ Headers CORS complets avec origine dynamique
- ✅ Réponse OPTIONS avec status 204 (No Content)
- ✅ Ajout de `Access-Control-Allow-Methods`
- ✅ Support des origines autorisées (btpsmartpro.com, localhost)

### 2. Fonction `google-calendar-sync-entreprise`

**Problème** : Même problème CORS

**Correction** : Même correction appliquée

### 3. Hook `useGoogleCalendar.ts`

**Problème** : Appelait `google-calendar-oauth-entreprise` au lieu de `google-calendar-oauth-entreprise-pkce`

**Correction** : ✅ Nom de fonction corrigé

---

## 🚀 Prochaines Étapes

### 1. Redéployer les Edge Functions

Les fonctions ont été corrigées, vous devez les redéployer :

**Via Dashboard** :
1. https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. Redéployer `google-calendar-oauth-entreprise-pkce`
3. Redéployer `google-calendar-sync-entreprise`

**Via CLI** :
```bash
supabase functions deploy google-calendar-oauth-entreprise-pkce --no-verify-jwt
supabase functions deploy google-calendar-sync-entreprise --no-verify-jwt
```

### 2. Rebuild le Frontend

Si vous utilisez Vercel ou un autre déploiement :
- Redéployez le frontend pour que les changements dans `useGoogleCalendar.ts` soient pris en compte

### 3. Tester

1. Ouvrez l'app : https://www.btpsmartpro.com
2. Allez dans **Paramètres** → **Intégrations** → **Google Calendar**
3. Cliquez sur **"Connecter Google Calendar"**
4. L'erreur CORS ne devrait plus apparaître

---

## 🔍 Vérification

### Vérifier que les fonctions sont redéployées

1. Dashboard Supabase → Functions
2. Vérifiez la **dernière mise à jour** (doit être récente)
3. Vérifiez les **logs** pour détecter d'éventuelles erreurs

### Vérifier les headers CORS

Dans la console du navigateur (F12), vérifiez que :
- ✅ Les requêtes OPTIONS retournent status 204
- ✅ Les headers `Access-Control-Allow-Origin` sont présents
- ✅ Les headers `Access-Control-Allow-Methods` incluent POST, GET, OPTIONS

---

## 📝 Origines Autorisées

Les origines suivantes sont autorisées :
- `https://btpsmartpro.com`
- `https://www.btpsmartpro.com`
- `http://localhost:5173` (développement Vite)
- `http://localhost:3000` (développement autre)

Pour ajouter d'autres origines, modifiez le tableau `allowedOrigins` dans les fonctions.

---

## ⚠️ Si l'Erreur Persiste

1. **Vérifiez que les fonctions sont bien redéployées**
2. **Videz le cache du navigateur** (Ctrl+Shift+R ou Cmd+Shift+R)
3. **Vérifiez les logs des Edge Functions** dans Supabase Dashboard
4. **Vérifiez la console du navigateur** pour d'autres erreurs

