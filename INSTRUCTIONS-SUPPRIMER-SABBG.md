# 🗑️ Instructions : Supprimer l'utilisateur sabbg.du73100.com

## 📋 Méthode 1 : Via SQL (Recommandé)

### Étape 1 : Exécuter le Script SQL

1. **Ouvrez le Dashboard Supabase** : https://supabase.com/dashboard
2. **Allez dans** : SQL Editor → New Query
3. **Ouvrez le fichier** : `supabase/SUPPRIMER-USER-SABBG.sql`
4. **Copiez-collez** tout le contenu dans l'éditeur SQL
5. **Exécutez** le script (Run ou Cmd+Enter)

### Étape 2 : Supprimer l'utilisateur de auth.users

Le script SQL supprime toutes les données liées, mais l'utilisateur dans `auth.users` doit être supprimé manuellement :

**Option A : Via le Dashboard Supabase**
1. Allez dans : **Authentication** → **Users**
2. Cherchez l'utilisateur avec l'email contenant `sabbg.du73100.com`
3. Cliquez sur les **3 points (⋯)** à droite
4. Sélectionnez **"Delete user"**
5. Confirmez la suppression

**Option B : Via SQL (si vous avez les privilèges)**
```sql
DELETE FROM auth.users WHERE email ILIKE '%sabbg.du73100.com%';
```

---

## 📋 Méthode 2 : Via Edge Function (Automatique)

Si vous avez une Edge Function pour supprimer des utilisateurs, vous pouvez l'utiliser :

```bash
curl -X POST \
  'https://VOTRE_PROJECT_ID.supabase.co/functions/v1/manage-employees' \
  -H 'Authorization: Bearer VOTRE_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "delete",
    "email": "sabbg.du73100.com"
  }'
```

---

## ✅ Vérification

Après la suppression, vérifiez que :

1. **L'utilisateur n'existe plus dans auth.users** :
   ```sql
   SELECT * FROM auth.users WHERE email ILIKE '%sabbg.du73100.com%';
   -- Doit retourner 0 lignes
   ```

2. **Aucune donnée liée ne reste** :
   ```sql
   SELECT COUNT(*) FROM public.user_roles 
   WHERE user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%sabbg.du73100.com%');
   -- Doit retourner 0
   ```

---

## 📝 Notes

- Le script SQL supprime automatiquement :
  - Les rôles dans `user_roles`
  - Les données dans `company_users`
  - Les données dans `employees`
  - Les données dans `user_settings`
  - Les invitations dans `invitations`

- L'utilisateur dans `auth.users` doit être supprimé manuellement pour des raisons de sécurité.





