# 🗑️ Supprimer le compte utilisateur

## 📋 Instructions pour supprimer `sabbg.du73100@gmail.com`

### Étape 1 : Nettoyer les données publiques (OBLIGATOIRE)

1. **Ouvrir Supabase Dashboard** → SQL Editor
2. **Exécuter le script** : `supabase/SUPPRIMER-UTILISATEUR.sql`
   - Ce script supprime toutes les données associées à l'utilisateur dans les tables publiques
   - Il affichera un résumé de ce qui a été supprimé

### Étape 2 : Supprimer l'utilisateur Auth

Vous avez **2 options** :

#### Option A : Via Supabase Dashboard (RECOMMANDÉ)

1. **Ouvrir Supabase Dashboard** → Authentication → Users
2. **Rechercher** : `sabbg.du73100@gmail.com`
3. **Cliquer sur** l'utilisateur
4. **Cliquer sur** "Delete user" (en bas de la page)
5. **Confirmer** la suppression

#### Option B : Via Edge Function

1. **Déployer l'Edge Function** (si pas déjà déployée) :
   ```bash
   cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
   supabase functions deploy delete-user
   ```

2. **Appeler l'Edge Function** :
   ```bash
   curl -X POST \
     'https://YOUR_PROJECT.supabase.co/functions/v1/delete-user' \
     -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"email": "sabbg.du73100@gmail.com"}'
   ```

   Ou depuis le Dashboard Supabase → Edge Functions → delete-user → Invoke

---

## ✅ Vérification

Après suppression, vérifiez que :

1. ✅ L'utilisateur n'apparaît plus dans Authentication → Users
2. ✅ Aucune donnée dans `company_users` pour cet email
3. ✅ Aucune donnée dans `invitations` pour cet email
4. ✅ Aucune donnée dans `employees` pour cet email

---

## 🔄 Recommencer

Une fois le compte supprimé, vous pouvez :

1. **Créer une nouvelle entreprise** (si nécessaire)
2. **Inviter à nouveau** l'utilisateur `sabbg.du73100@gmail.com`
3. **L'utilisateur recevra un email** avec un lien vers `/accept-invitation`
4. **L'utilisateur pourra choisir son mot de passe** lors de la création du compte

---

## ⚠️ Important

- ⚠️ La suppression est **irréversible**
- ⚠️ Toutes les données associées seront supprimées
- ⚠️ Les projets, clients, factures, etc. liés à cet utilisateur seront supprimés
- ⚠️ Si l'utilisateur était propriétaire d'une entreprise, l'entreprise ne sera **PAS** supprimée (seulement le lien `company_users`)
