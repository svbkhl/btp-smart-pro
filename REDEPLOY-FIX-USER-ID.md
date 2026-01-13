# 🚀 Redéployer la correction user_id

## ⚠️ Problème corrigé

L'erreur `null value in column "user_id" violates not-null constraint` était due au fait que le code utilisait `owner_user_id` mais la table `google_calendar_connections` a une colonne `user_id` qui est **NOT NULL**.

## ✅ Correction appliquée

J'ai ajouté `user_id: user.id` dans `connectionData` pour que les deux colonnes soient remplies :
- `user_id` : NOT NULL (requis par la table)
- `owner_user_id` : Optionnel (pour référence)

---

## 📋 Redéployer l'Edge Function

### 1. Ouvrir la fonction

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
2. **Trouvez** `google-calendar-oauth-entreprise-pkce`
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

Après le redéploiement :

1. **Testez** la connexion Google Calendar
2. **L'erreur 500** devrait disparaître
3. **La connexion** devrait être sauvegardée correctement

---

## 📊 Structure de la table

La table `google_calendar_connections` a :
- `user_id` : UUID NOT NULL (requis)
- `owner_user_id` : UUID nullable (optionnel, pour référence)
- `company_id` : UUID NOT NULL (requis)

Les deux colonnes sont maintenant remplies avec la même valeur (`user.id`).
