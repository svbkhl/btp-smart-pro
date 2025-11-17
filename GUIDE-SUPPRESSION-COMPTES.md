# 🗑️ Guide : Supprimer Tous les Comptes

## ⚠️ ATTENTION
Ce guide supprime **TOUS** les comptes utilisateurs. Utilisez-le uniquement si vous voulez repartir de zéro.

---

## 📋 Méthode 1 : Via SQL (Recommandé)

### Étape 1 : Exécuter le Script SQL

1. **Ouvrez le Dashboard Supabase** : https://supabase.com/dashboard
2. **Allez dans** : SQL Editor → New Query
3. **Copiez-collez** le contenu du fichier `supabase/SUPPRIMER-TOUS-LES-COMPTES.sql`
4. **Exécutez** le script (Run)

### Étape 2 : Supprimer les Utilisateurs depuis le Dashboard

1. **Allez dans** : Authentication → Users
2. **Pour chaque utilisateur** :
   - Cliquez sur les 3 points (⋯) à droite
   - Sélectionnez "Delete user"
   - Confirmez la suppression

---

## 📋 Méthode 2 : Via Edge Function (Automatique)

### Étape 1 : Déployer la Fonction

```bash
# Depuis le terminal, dans le dossier du projet
supabase functions deploy delete-all-users
```

### Étape 2 : Appeler la Fonction

**Option A : Via le Dashboard Supabase**
1. Allez dans : Edge Functions → delete-all-users
2. Cliquez sur "Invoke"
3. La fonction supprimera tous les utilisateurs automatiquement

**Option B : Via une Requête HTTP**

```bash
curl -X POST \
  'https://VOTRE_PROJECT_ID.supabase.co/functions/v1/delete-all-users' \
  -H 'Authorization: Bearer VOTRE_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

**⚠️ Remplacez** :
- `VOTRE_PROJECT_ID` par votre ID de projet Supabase
- `VOTRE_SERVICE_ROLE_KEY` par votre clé de service (trouvable dans Settings → API)

---

## ✅ Vérification

Après la suppression, vérifiez que :

1. **Table `user_roles` est vide** :
   ```sql
   SELECT COUNT(*) FROM public.user_roles;
   -- Doit retourner 0
   ```

2. **Aucun utilisateur dans Authentication** :
   - Dashboard → Authentication → Users
   - La liste doit être vide

---

## 🆕 Créer un Nouveau Compte

Une fois tous les comptes supprimés :

1. **Ouvrez l'application** : http://localhost:5173/auth
2. **Allez sur l'onglet "Inscription"**
3. **Créez un nouveau compte** :
   - Email : votre email
   - Mot de passe : minimum 6 caractères
   - Type de compte : Sélectionnez "Chef / Administrateur" ou "Salarié"
4. **Connectez-vous** avec ce nouveau compte

---

## 🔒 Sécurité

- ⚠️ **Ne déployez JAMAIS** la fonction `delete-all-users` en production
- ⚠️ **Ne partagez JAMAIS** votre `SERVICE_ROLE_KEY`
- ✅ **Utilisez uniquement** en développement/local

---

## 📝 Notes

- La suppression des utilisateurs dans `auth.users` nécessite des droits admin
- Les rôles dans `user_roles` sont supprimés automatiquement
- Les données des employés sont aussi supprimées (si la table existe)

