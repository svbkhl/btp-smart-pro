# 📋 INSTRUCTIONS - CONFIGURATION DU RÔLE ADMIN

## ✅ Script SQL créé

Le script `supabase/FIX-RLS-CREATE-COMPANIES.sql` a été créé avec :
- ✅ Enum `app_role` avec les valeurs `admin` et `member`
- ✅ Table `user_roles` avec PRIMARY KEY sur `user_id`
- ✅ Policies RLS correctes pour `user_roles` et `companies`
- ✅ Fonction `set_user_admin()` pour ajouter le rôle admin

## 🔧 Étapes pour configurer votre rôle admin

### Option 1 : Via SQL Editor (Recommandé)

1. **Exécuter le script principal** :
   - Ouvrir Supabase Dashboard → SQL Editor
   - Copier le contenu de `supabase/FIX-RLS-CREATE-COMPANIES.sql`
   - Exécuter le script

2. **Ajouter votre rôle admin** :
   - Dans le SQL Editor, exécuter :
   ```sql
   SELECT public.set_user_admin(auth.uid());
   ```
   - Ou avec votre UID directement :
   ```sql
   SELECT public.set_user_admin('VOTRE_USER_ID_ICI');
   ```

### Option 2 : Via le code frontend

1. **Ouvrir la console du navigateur** (F12)
2. **Exécuter** :
   ```javascript
   import { setupAdminRole } from '@/utils/setupAdminRole';
   await setupAdminRole();
   ```

### Option 3 : Via l'interface Supabase

1. Aller dans Supabase Dashboard → Table Editor → `user_roles`
2. Cliquer sur "Insert row"
3. Remplir :
   - `user_id` : Votre UID (trouvable dans Auth → Users)
   - `role` : `admin`
4. Sauvegarder

## 🔍 Vérifier votre UID

Pour trouver votre UID :
1. Ouvrir la console du navigateur (F12)
2. Exécuter :
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Votre UID:', user.id);
   ```

## ✅ Vérification

Après avoir configuré votre rôle admin, vérifiez que tout fonctionne :

1. **Vérifier le rôle** :
   ```javascript
   const { data } = await supabase
     .from('user_roles')
     .select('role')
     .eq('user_id', user.id)
     .single();
   console.log('Votre rôle:', data.role); // Devrait être 'admin'
   ```

2. **Tester la création d'entreprise** :
   - Aller dans l'interface Admin → Companies
   - Cliquer sur "Créer"
   - Remplir le formulaire
   - Vérifier qu'il n'y a pas d'erreur 403

## 🐛 Si ça ne fonctionne pas

1. **Vérifier que la table existe** :
   - Dashboard → Table Editor → Vérifier que `user_roles` existe

2. **Vérifier les policies RLS** :
   - Dashboard → Authentication → Policies
   - Vérifier que les policies pour `user_roles` sont actives

3. **Vérifier l'exposition de la table** :
   - Dashboard → API → Tables
   - Vérifier que `user_roles` est listée et exposée

4. **Vérifier les logs** :
   - Dashboard → Logs → Postgres Logs
   - Chercher les erreurs liées à `user_roles`













