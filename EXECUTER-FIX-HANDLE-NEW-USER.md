# 🔧 Corriger handle_new_user() - Solution à l'erreur 500

## ⚠️ Problème Identifié

L'erreur **"Database error saving new user"** vient du trigger `handle_new_user()` qui essaie d'insérer `'salarie'` dans `user_roles`, mais l'enum `app_role` n'accepte que `'admin'` ou `'member'`.

---

## ✅ Solution : Exécuter le Script SQL

### Étape 1 : Ouvrir Supabase SQL Editor

1. **Ouvrez** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Cliquez sur** : **SQL Editor** (💬 dans le menu de gauche)
3. **Cliquez sur** : **New query**

### Étape 2 : Copier le Script

1. **Ouvrez le fichier** : `supabase/FIX-HANDLE-NEW-USER-TRIGGER.sql`
2. **Sélectionnez TOUT** (Cmd+A ou Ctrl+A)
3. **Copiez** (Cmd+C ou Ctrl+C)

### Étape 3 : Exécuter

1. **Collez** dans l'éditeur SQL de Supabase
2. **Cliquez sur** : **Run** (ou Cmd+Enter / Ctrl+Enter)
3. **Attendez** quelques secondes

### Étape 4 : Vérifier

Vous devriez voir dans les résultats :
- ✅ La fonction `handle_new_user` a été créée/remplacée
- ✅ Le trigger `on_auth_user_created` a été créé

---

## 🧪 Test

Après avoir exécuté le script :

1. **Testez l'invitation** depuis l'application
2. **Vérifiez** que l'invitation fonctionne
3. **Vérifiez les logs** Supabase → Edge Functions → send-invitation → Logs

**Résultat attendu** :
```
✅ Invitation sent successfully to: test@example.com
```

Plus d'erreur 500 !

---

## 📋 Ce que fait le Script

1. **Vérifie** que l'enum `app_role` existe avec les valeurs `'admin'` et `'member'`
2. **Corrige** la fonction `handle_new_user()` pour utiliser `'member'` au lieu de `'salarie'`
3. **Gère** les deux cas : enum ou TEXT avec CHECK
4. **Ajoute** une gestion d'erreur pour ne pas bloquer la création d'utilisateur
5. **Recrée** le trigger `on_auth_user_created`

---

## 🚨 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs** Supabase après avoir testé
2. **Partagez** le nouveau message d'erreur
3. **Vérifiez** que la table `user_roles` existe et a la bonne structure

---

## ✅ Checklist

- [ ] Script SQL copié dans Supabase
- [ ] Script exécuté avec succès
- [ ] Test d'invitation effectué
- [ ] Plus d'erreur 500
- [ ] Invitation envoyée avec succès







