# 🔧 Correction Erreur 400 sur exchange_code

## 🔍 Problème Identifié

**Erreur** :
```
POST https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce 400 (Bad Request)
❌ [useExchangeGoogleCode] Erreur: FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Cause** : L'Edge Function `google-calendar-oauth-entreprise-pkce` exigeait un `code_verifier` (PKCE), mais `google-calendar-oauth` (utilisé pour générer l'URL) ne génère pas de `code_verifier` car elle n'utilise pas PKCE.

---

## ✅ Corrections Appliquées

### 1. Edge Function : `google-calendar-oauth-entreprise-pkce/index.ts`

**Changements** :
- ✅ `code_verifier` rendu **optionnel**
- ✅ Tentative de récupération du `code_verifier` depuis le `state` si absent
- ✅ Échange sans PKCE si `code_verifier` n'est pas disponible
- ✅ Logs de debugging ajoutés pour diagnostiquer les problèmes

**Code modifié** :
```typescript
// code_verifier est optionnel si PKCE n'a pas été utilisé initialement
let finalCodeVerifier = code_verifier;
if (!finalCodeVerifier && stateData?.code_verifier) {
  finalCodeVerifier = stateData.code_verifier;
}

// Échange avec ou sans PKCE selon disponibilité
const tokenParams: Record<string, string> = {
  client_id: GOOGLE_CLIENT_ID,
  client_secret: GOOGLE_CLIENT_SECRET,
  code: code,
  grant_type: "authorization_code",
  redirect_uri: GOOGLE_REDIRECT_URI,
};

// Ajouter code_verifier seulement s'il est disponible (PKCE)
if (finalCodeVerifier) {
  tokenParams.code_verifier = finalCodeVerifier;
}
```

---

### 2. Frontend : `src/hooks/useGoogleCalendar.ts`

**Changements** :
- ✅ Logs de debugging ajoutés pour voir les paramètres envoyés
- ✅ `code_verifier` peut être `undefined` si non disponible

---

## 🚀 Déploiement

### 1. Redéployer l'Edge Function

```bash
supabase functions deploy google-calendar-oauth-entreprise-pkce
```

**Ou via Dashboard Supabase** :
1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. Trouvez `google-calendar-oauth-entreprise-pkce`
3. Cliquez sur "Redeploy" ou "Edit" puis "Deploy"

### 2. Déployer le Frontend

```bash
git add src/hooks/useGoogleCalendar.ts supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts
git commit -m "fix: rendre code_verifier optionnel dans exchange_code Google Calendar"
git push origin main
```

---

## ✅ Vérification

### 1. Vérifier les Logs Supabase

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce`
3. **Lancez une connexion** Google Calendar
4. **Vérifiez les logs** :
   ```
   🔍 [exchange_code] Paramètres reçus:
     - code: present
     - code_verifier: missing (ou present)
     - state: present
     - company_id: present
   ```

### 2. Tester la Connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Autorisez** sur Google
4. **Résultat attendu** :
   - ✅ Plus d'erreur 400
   - ✅ Connexion Google Calendar réussie
   - ✅ Toast de succès affiché

---

## 📋 Checklist

- [x] `code_verifier` rendu optionnel dans l'Edge Function
- [x] Récupération du `code_verifier` depuis le `state` si absent
- [x] Échange sans PKCE si `code_verifier` non disponible
- [x] Logs de debugging ajoutés
- [x] Logs ajoutés dans le frontend
- [ ] Edge Function redéployée
- [ ] Frontend déployé sur Vercel
- [ ] Test de connexion réussi

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur 400 "Bad Request"
- ✅ L'échange fonctionne avec ou sans PKCE
- ✅ La connexion Google Calendar fonctionne correctement
- ✅ Logs détaillés pour diagnostiquer les problèmes futurs

---

**Redéployez l'Edge Function et le frontend pour que les corrections soient actives !** 🚀
