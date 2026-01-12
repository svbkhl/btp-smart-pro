# 🚀 Guide de Redéploiement Rapide - Edge Function Google Calendar

## ⚡ Méthode Rapide (2 minutes)

### Option 1 : Via Dashboard Supabase (Recommandé)

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce` dans la liste
3. **Cliquez sur** "Edit" (ou les 3 points → "Edit")
4. **Ouvrez** le fichier : `supabase/functions/google-calendar-oauth-entreprise-pkce/index.ts`
5. **Sélectionnez TOUT** (Cmd+A)
6. **Copiez** (Cmd+C)
7. **Dans l'éditeur Supabase** :
   - Sélectionnez tout (Cmd+A)
   - Supprimez (Backspace)
   - Collez (Cmd+V)
8. **Cliquez sur** "Deploy"
9. **Attendez** le message "Function deployed successfully"

**✅ C'est fait !**

---

### Option 2 : Via Script Automatique

Si vous avez la CLI Supabase configurée :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
./REDEPLOY-EDGE-FUNCTION.sh
```

**Prérequis** :
- Supabase CLI installé : `npm install -g supabase`
- Connecté : `supabase login`
- Projet lié : `supabase link --project-ref renmjmqlmafqjzldmsgs`

---

### Option 3 : Via CLI Manuelle

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy google-calendar-oauth-entreprise-pkce
```

---

## ✅ Vérification Après Déploiement

1. **Testez** la connexion Google Calendar
2. **Vérifiez les logs** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
3. **Cherchez** les nouveaux logs avec `🔍 [Request]` et `🔍 [exchange_code]`

---

## 🐛 Si le Déploiement Échoue

### Erreur : "Access token not provided"
**Solution** : `supabase login`

### Erreur : "Project not linked"
**Solution** : `supabase link --project-ref renmjmqlmafqjzldmsgs`

### Erreur : "Function not found"
**Solution** : Vérifiez que le dossier `supabase/functions/google-calendar-oauth-entreprise-pkce/` existe

---

## 📝 Note

Je ne peux pas redéployer directement car cela nécessite votre authentification Supabase. Utilisez l'**Option 1 (Dashboard)** qui est la plus simple et la plus rapide.
