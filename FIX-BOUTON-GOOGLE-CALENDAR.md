# 🔧 Fix: Bouton Google Calendar manquant

## 🎯 Problème

Le bouton "Connecter Google Calendar" n'apparaît pas dans les paramètres, même si vous êtes propriétaire de l'entreprise.

## 🔍 Cause

Le hook `usePermissions` vérifie si l'utilisateur a le rôle `owner` ou `admin` dans la table `company_users` avec un `role_id` qui pointe vers la table `roles` avec un `slug` de `'owner'` ou `'admin'`.

Si l'utilisateur n'a pas de `role_id` dans `company_users`, ou si le rôle n'est pas `owner`/`admin`, le bouton ne s'affiche pas.

---

## ✅ Solution

### 1️⃣ Modifier le script SQL avec votre email

1. **Ouvrez le fichier** : `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`
2. **Trouvez la ligne** : `user_email TEXT := 'sabri.khalfallah6@gmail.com';`
3. **Remplacez** `'sabri.khalfallah6@gmail.com'` par **votre email** (celui avec lequel vous vous connectez)
4. **Sauvegardez** le fichier

### 2️⃣ Exécuter le script SQL

1. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvrez le fichier** : `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`
3. **Vérifiez** que l'email est correct (ligne ~20)
4. **Copiez-collez** tout le contenu dans l'éditeur SQL
5. **Cliquez sur** "Run" ou "Exécuter"

**✅ Résultat attendu** :
```
✅ Utilisateur trouvé par email (votre@email.com): [UUID]
✅ Entreprise trouvée: [UUID]
✅ Rôle OWNER trouvé: [UUID]
✅ role_id assigné (OWNER) dans company_users
✅ SUCCÈS ! Vous pouvez maintenant connecter Google Calendar
```

---

### 3️⃣ Vérifier dans l'application

1. **Rafraîchissez** la page des paramètres (F5)
2. **Allez sur** : https://www.btpsmartpro.com/settings?tab=integrations
3. **Le bouton** "Connecter Google Calendar" devrait maintenant être visible

---

## 🔍 Alternative : Utiliser votre UUID directement

Si vous connaissez votre UUID utilisateur, vous pouvez aussi :

1. **Trouver votre UUID** :
   ```sql
   SELECT id, email 
   FROM auth.users 
   WHERE email = 'votre@email.com';
   ```

2. **Modifier le script** pour utiliser directement l'UUID :
   ```sql
   -- Décommentez cette ligne et mettez votre UUID
   user_id_param UUID := 'VOTRE-UUID-ICI';
   
   -- Commentez la ligne user_email
   -- user_email TEXT := 'sabri.khalfallah6@gmail.com';
   ```

---

## 🔍 Vérification manuelle (optionnel)

Si le script ne fonctionne pas, vérifiez manuellement :

```sql
-- 1. Trouver votre user_id par email
SELECT id, email 
FROM auth.users 
WHERE email = 'votre@email.com';

-- 2. Vérifier votre entreprise (remplacez USER_ID par votre UUID)
SELECT company_id 
FROM public.company_users 
WHERE user_id = 'USER_ID'
LIMIT 1;

-- 3. Vérifier votre rôle (remplacez USER_ID par votre UUID)
SELECT 
  cu.user_id,
  cu.company_id,
  r.slug AS role_slug,
  r.name AS role_name
FROM public.company_users cu
JOIN public.roles r ON r.id = cu.role_id
WHERE cu.user_id = 'USER_ID';
```

**Résultat attendu** : `role_slug` doit être `'owner'` ou `'admin'`

---

## 📝 Modifications apportées au code

### 1. `src/hooks/useGoogleCalendarRoles.ts`
- ✅ `useCanConnectGoogleCalendar()` accepte maintenant `isOwner || isAdmin`
- ✅ `useCanManageGoogleCalendarSettings()` accepte maintenant `isOwner || isAdmin`

### 2. `src/components/GoogleCalendarConnection.tsx`
- ✅ Utilise `canConnect` au lieu de `isOwner` pour afficher le bouton
- ✅ Messages mis à jour pour mentionner "propriétaire ou administrateur"

### 3. `supabase/FIX-USER-ROLE-FOR-GOOGLE-CALENDAR.sql`
- ✅ Fonctionne maintenant sans session utilisateur (utilise l'email)
- ✅ Peut être exécuté depuis le SQL Editor de Supabase

---

## 🚀 Après le fix

1. ✅ Le bouton "Connecter Google Calendar" apparaît
2. ✅ Vous pouvez cliquer dessus pour lancer la connexion OAuth
3. ✅ Le flow OAuth fonctionne normalement

---

## ❓ Si ça ne fonctionne toujours pas

1. **Vérifiez que l'email dans le script est correct**
2. **Vérifiez les logs** dans la console du navigateur (F12)
3. **Vérifiez les logs Supabase** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/logs/edge-functions
4. **Exécutez le script SQL** à nouveau avec le bon email
5. **Vérifiez que vous êtes bien connecté** avec le bon compte utilisateur dans l'app
