# 🗑️ Instructions : Supprimer l'utilisateur sabbg.du73100@gmail.com

## 📋 Méthode : Via SQL (Recommandé)

### Étape 1 : Exécuter le Script SQL

1. **Ouvrez le Dashboard Supabase** : https://supabase.com/dashboard
2. **Allez dans** : SQL Editor → New Query
3. **Ouvrez le fichier** : `supabase/SUPPRIMER-USER-SABBG-GMAIL.sql`
4. **Copiez-collez** tout le contenu dans l'éditeur SQL
5. **Exécutez** le script (Run ou Cmd+Enter)

### Ce que fait le script

Le script supprime automatiquement :
- ✅ Les rôles dans `user_roles`
- ✅ Les données dans `company_users`
- ✅ Les données dans `employees`
- ✅ Les données dans `user_settings`
- ✅ Les invitations dans `invitations`
- ✅ Les identités dans `auth.identities`
- ✅ L'utilisateur dans `auth.users`

### Vérification

Après exécution, le script affiche :
- Un message de confirmation si l'utilisateur a été trouvé et supprimé
- Un message d'erreur si l'utilisateur n'existe pas
- Des requêtes de vérification pour confirmer que tout a été supprimé

## ✅ Après suppression

Une fois l'utilisateur supprimé, vous pourrez :
- ✅ Envoyer une nouvelle invitation à `sabbg.du73100@gmail.com`
- ✅ Créer un nouveau compte avec cet email
- ✅ Le système d'invitation fonctionnera normalement

## 📝 Notes

- Le script SQL supprime automatiquement toutes les données liées
- L'utilisateur dans `auth.users` et `auth.identities` est supprimé en une seule opération
- Les requêtes de vérification à la fin du script confirment que tout a été supprimé





