# 🔧 Instructions : Supprimer un Utilisateur Bloqué

## ⚠️ Problème

L'erreur **"Database error saving new user"** vient d'un utilisateur fantôme ou corrompu dans `auth.users` ou `auth.identities` qui bloque la création d'une nouvelle invitation.

---

## ✅ Solution : Vérifier et Supprimer

### Étape 1 : Ouvrir Supabase SQL Editor

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Cliquez sur** : **SQL Editor** (💬 dans le menu de gauche)
3. **Cliquez sur** : **New query**

### Étape 2 : Vérifier si l'utilisateur existe

1. **Copiez-colle** cette requête dans l'éditeur SQL :

```sql
SELECT 
  id, 
  email, 
  created_at, 
  last_sign_in_at,
  email_confirmed_at,
  deleted_at
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';
```

2. **Cliquez sur** : **Run**
3. **Regardez** les résultats :
   - **Si vous voyez une ligne** → L'utilisateur existe, il faut le supprimer
   - **Si aucun résultat** → Passez à l'étape 3

### Étape 3 : Vérifier les identités

1. **Copiez-colle** cette requête :

```sql
SELECT 
  id,
  user_id,
  identity_data->>'email' as email,
  provider,
  created_at
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );
```

2. **Cliquez sur** : **Run**
3. **Regardez** les résultats :
   - **Si vous voyez des lignes** → Il faut les supprimer
   - **Si aucun résultat** → Passez à l'étape 4

### Étape 4 : Supprimer (si nécessaire)

⚠️ **ATTENTION** : Exécutez seulement si vous avez vu des résultats aux étapes 2 ou 3.

**IMPORTANT** : L'ordre est crucial → **identities d'abord, puis users**

1. **Supprimer les identités d'abord** :

```sql
DELETE FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );
```

2. **Cliquez sur** : **Run**

3. **Supprimer l'utilisateur ensuite** :

```sql
DELETE FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';
```

4. **Cliquez sur** : **Run**

### Étape 5 : Vérifier la suppression

1. **Copiez-colle** cette requête :

```sql
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com'

UNION ALL

SELECT 
  'auth.identities' as table_name,
  COUNT(*) as count
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com';
```

2. **Cliquez sur** : **Run**

3. **Résultat attendu** :
   - Les deux `count` doivent être à **0**
   - Si c'est le cas → ✅ Vous pouvez réinviter

---

## 🧪 Test Après Suppression

1. **Testez l'invitation** depuis l'application
2. **Vérifiez les logs** Supabase → Edge Functions → send-invitation → Logs

**Résultat attendu** :
```
✅ Invitation sent successfully to: sabbg.du73100@gmail.com
```

Plus d'erreur 500 !

---

## 📋 Script Complet

Si vous préférez exécuter tout en une fois, utilisez le fichier :
- `supabase/VERIFIER-ET-SUPPRIMER-USER-BLOQUE.sql`

Ce script fait tout automatiquement :
1. Vérifie si l'utilisateur existe
2. Vérifie les identités
3. Supprime si nécessaire
4. Vérifie la suppression

---

## 🚨 Si ça ne fonctionne toujours pas

1. **Vérifiez** que les deux compteurs sont à 0 après suppression
2. **Attendez** quelques secondes (cache Supabase)
3. **Réessayez** l'invitation
4. **Vérifiez les logs** Supabase pour voir la nouvelle erreur

---

## ✅ Checklist

- [ ] Requête de vérification `auth.users` exécutée
- [ ] Requête de vérification `auth.identities` exécutée
- [ ] Suppression des identités effectuée (si nécessaire)
- [ ] Suppression de l'utilisateur effectuée (si nécessaire)
- [ ] Vérification finale : les deux compteurs sont à 0
- [ ] Test d'invitation effectué
- [ ] Plus d'erreur 500







