# 🚀 Déployer l'Edge Function Google Calendar - Instructions

## ✅ Commit Créé

Le commit avec les corrections a été créé :
```
fix: correction erreur 400 Google Calendar OAuth - code_verifier optionnel et récupération company_id depuis state
```

---

## 🔧 Déploiement Edge Function (À Faire Maintenant)

### Option 1 : Via Dashboard Supabase (Recommandé - 2 minutes)

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
3. **Cliquez sur** "Edit" (ou les 3 points → "Edit")
4. **Ouvrez le fichier** : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
5. **Sélectionnez TOUT** le contenu (Cmd+A)
6. **Copiez** (Cmd+C)
7. **Collez dans l'éditeur Supabase** (Cmd+V)
8. **Cliquez sur** "Deploy" ou "Save & Deploy"

**✅ Résultat attendu** : Message "Function deployed successfully"

---

### Option 2 : Via CLI Supabase (Si configuré)

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# Se connecter à Supabase (si pas déjà fait)
supabase login

# Lier le projet (si pas déjà fait)
supabase link --project-ref renmjmqlmafqjzldmsgs

# Déployer la fonction
supabase functions deploy google-calendar-oauth-entreprise-pkce
```

---

## ✅ Vérification Après Déploiement

### 1. Vérifier dans les Logs

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
2. **Sélectionnez** `google-calendar-oauth-entreprise-pkce`
3. **Lancez une connexion** Google Calendar
4. **Vérifiez les logs** :
   ```
   🔍 [exchange_code] Paramètres reçus:
     - code: present
     - code_verifier: missing (ou present)
     - state: present
     - company_id (body): [valeur]
   ```

### 2. Tester la Connexion

1. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
2. **Cliquez sur** "Connecter Google Calendar"
3. **Autorisez** sur Google
4. **Résultat attendu** :
   - ✅ Plus d'erreur 400
   - ✅ Connexion réussie
   - ✅ Toast de succès

---

## 📋 Checklist

- [x] Code corrigé dans l'Edge Function
- [x] Code corrigé dans le frontend
- [x] Commit créé
- [ ] Edge Function redéployée (À FAIRE MAINTENANT)
- [ ] Logs vérifiés
- [ ] Test de connexion réussi

---

**Suivez l'Option 1 (Dashboard) pour redéployer l'Edge Function maintenant !** 🚀
