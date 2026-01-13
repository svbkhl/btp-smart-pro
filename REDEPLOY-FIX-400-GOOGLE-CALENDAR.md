# 🚀 Redéployer la Correction Erreur 400

## ✅ Corrections Appliquées

### 1. Edge Function : `google-calendar-oauth-entreprise-pkce`

**Changements** :
- ✅ `code_verifier` rendu **optionnel** (peut être absent si PKCE n'a pas été utilisé)
- ✅ Récupération du `code_verifier` depuis le `state` si absent
- ✅ Échange sans PKCE si `code_verifier` non disponible
- ✅ Logs de debugging ajoutés
- ✅ Gestion améliorée du `company_id` depuis le `state` ou le body

### 2. Frontend : `src/hooks/useGoogleCalendar.ts`

**Changements** :
- ✅ Logs de debugging ajoutés
- ✅ Passage explicite du `company_id` à l'Edge Function

---

## 🚀 Déploiement Requis

### Étape 1 : Redéployer l'Edge Function (OBLIGATOIRE)

**Option A : Via CLI Supabase**

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy google-calendar-oauth-entreprise-pkce
```

**Option B : Via Dashboard Supabase**

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit" ou "Redeploy"
4. **Si Edit** : Ouvrez le fichier `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
5. **Copiez-collez** tout le contenu dans l'éditeur Supabase
6. **Cliquez sur** "Deploy" ou "Save & Deploy"

---

### Étape 2 : Vérifier les Logs Après Redéploiement

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce`
3. **Lancez une connexion** Google Calendar depuis l'app
4. **Vérifiez les logs** :
   ```
   🔍 [exchange_code] Paramètres reçus:
     - code: present
     - code_verifier: missing (ou present)
     - state: present
     - company_id (body): [valeur] ou not provided
     - company_id (session): [valeur] ou not available
   ```

---

### Étape 3 : Tester la Connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Autorisez** sur Google
4. **Résultat attendu** :
   - ✅ Plus d'erreur 400
   - ✅ Connexion Google Calendar réussie
   - ✅ Toast de succès affiché

---

## 🔍 Diagnostic des Erreurs

### Si l'erreur 400 persiste :

1. **Vérifiez les logs Supabase** pour voir le message d'erreur exact
2. **Vérifiez** que l'Edge Function a bien été redéployée
3. **Vérifiez** que les paramètres sont bien passés (voir logs)

### Messages d'erreur possibles :

- `"code is required"` → Le code OAuth n'est pas passé
- `"Company ID manquant"` → Le `company_id` n'est pas disponible
- `"Invalid state: user_id mismatch"` → Le `user_id` dans le state ne correspond pas
- `"Invalid state format"` → Le `state` ne peut pas être décodé

---

## 📋 Checklist

- [x] Code corrigé dans l'Edge Function
- [x] Code corrigé dans le frontend
- [ ] Edge Function redéployée
- [ ] Logs vérifiés après redéploiement
- [ ] Test de connexion réussi

---

## 🎯 Résultat Attendu

- ✅ Plus d'erreur 400 "Bad Request"
- ✅ L'échange fonctionne avec ou sans PKCE
- ✅ Le `company_id` est récupéré correctement
- ✅ La connexion Google Calendar fonctionne

---

**Redéployez l'Edge Function maintenant pour que les corrections soient actives !** 🚀
