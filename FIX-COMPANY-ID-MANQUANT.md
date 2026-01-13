# ✅ Correction : Erreur "Company ID manquant"

## 🔍 Problème Identifié

**Erreur** :
```
❌ Erreur lors de l'échange du code: Error: Company ID manquant
```

**Cause** : Le `currentCompanyId` n'était pas disponible au moment de l'échange du code OAuth, même s'il était présent dans le `state` OAuth.

---

## ✅ Corrections Appliquées

### 1. Frontend : `src/pages/Settings.tsx`

**Changements** :
- ✅ Décodage du `state` OAuth pour récupérer `company_id`
- ✅ Utilisation du `company_id` du state si `currentCompanyId` n'est pas disponible
- ✅ Passage explicite du `companyId` à la fonction d'échange
- ✅ Message d'erreur amélioré si `company_id` est toujours manquant

**Code ajouté** :
```typescript
// Décoder le state pour récupérer company_id si disponible
let companyIdFromState: string | null = null;
if (googleCalendarState) {
  try {
    const decodedState = JSON.parse(atob(googleCalendarState));
    companyIdFromState = decodedState.company_id || null;
  } catch (e) {
    console.warn("⚠️ Could not decode state:", e);
  }
}

// Utiliser company_id du state si currentCompanyId n'est pas disponible
const effectiveCompanyId = currentCompanyId || companyIdFromState;
```

---

### 2. Hook : `src/hooks/useGoogleCalendar.ts`

**Changements** :
- ✅ Accepte maintenant un paramètre `companyId` optionnel
- ✅ Décodage du `state` pour récupérer `company_id` si non fourni
- ✅ Passage explicite du `company_id` à l'Edge Function

**Code modifié** :
```typescript
mutationFn: async ({ code, state, companyId }: { code: string; state: string; companyId?: string }) => {
  // Utiliser companyId fourni, ou currentCompanyId, ou essayer de décoder depuis state
  let effectiveCompanyId = companyId || currentCompanyId;
  
  // Si toujours pas de company_id, essayer de le décoder depuis le state
  if (!effectiveCompanyId && state) {
    try {
      const decodedState = JSON.parse(atob(state));
      effectiveCompanyId = decodedState.company_id || null;
    } catch (e) {
      console.warn("⚠️ Could not decode state for company_id:", e);
    }
  }
  
  // Passer explicitement le company_id à l'Edge Function
  const { data, error } = await supabase.functions.invoke("google-calendar-oauth-entreprise-pkce", {
    body: { 
      action: "exchange_code", 
      code,
      code_verifier: codeVerifier || undefined,
      state,
      company_id: effectiveCompanyId, // ✅ Passer explicitement
    },
  });
}
```

---

### 3. Edge Function : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`

**Changements** :
- ✅ Accepte `company_id` dans le body de la requête
- ✅ Utilise `company_id` du body si fourni, sinon celui du state, sinon celui de la session
- ✅ Remplace toutes les références à `companyId` par `finalCompanyId` dans la section `exchange_code`

**Code modifié** :
```typescript
if (action === "exchange_code") {
  const { code, code_verifier, state, company_id: companyIdFromBody } = await req.json();
  
  // Récupérer company_id depuis le body, le state, ou la session
  let effectiveCompanyId = companyId; // Session par défaut
  
  if (companyIdFromBody) {
    effectiveCompanyId = companyIdFromBody;
  } else if (stateData?.company_id) {
    effectiveCompanyId = stateData.company_id;
  }
  
  const finalCompanyId = effectiveCompanyId;
  
  // Utiliser finalCompanyId partout dans la fonction
}
```

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
git add src/pages/Settings.tsx src/hooks/useGoogleCalendar.ts
git commit -m "fix: récupération company_id depuis state OAuth pour Google Calendar"
git push origin main
```

**Vercel déploiera automatiquement** 🚀

---

## ✅ Vérification

### Test de la Connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Autorisez** sur Google
4. **Résultat attendu** :
   - ✅ Plus d'erreur "Company ID manquant"
   - ✅ Connexion Google Calendar réussie
   - ✅ Toast de succès affiché

---

## 📋 Checklist

- [x] Décodage du `state` OAuth dans `Settings.tsx`
- [x] Utilisation du `company_id` du state si `currentCompanyId` manquant
- [x] Passage explicite du `company_id` à `useExchangeGoogleCode`
- [x] Décodage du `state` dans `useExchangeGoogleCode` comme fallback
- [x] Passage du `company_id` à l'Edge Function
- [x] Acceptation du `company_id` dans l'Edge Function
- [x] Utilisation de `finalCompanyId` dans toute la section `exchange_code`
- [ ] Edge Function redéployée
- [ ] Frontend déployé sur Vercel
- [ ] Test de connexion réussi

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur "Company ID manquant"
- ✅ Le `company_id` est récupéré depuis le `state` OAuth si nécessaire
- ✅ La connexion Google Calendar fonctionne même si `currentCompanyId` n'est pas encore chargé
- ✅ Message d'erreur clair si le `company_id` est vraiment manquant

---

**Le problème est maintenant corrigé ! Redéployez l'Edge Function et le frontend pour que les changements soient actifs.** 🚀
