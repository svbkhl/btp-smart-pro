# 📋 Guide : Système de Gestion des Employés

## ✅ Ce qui a été créé

Un système complet de gestion des employés avec authentification et rôles :

1. ✅ **Hook `useEmployees`** : Gestion des employés (CRUD)
2. ✅ **Page `AdminEmployees`** : Interface admin pour créer/modifier/supprimer des employés
3. ✅ **Edge Function `manage-employees`** : Fonction backend pour créer/supprimer des comptes
4. ✅ **Route `/admin/employees`** : Page accessible uniquement aux admins
5. ✅ **Lien dans la Sidebar** : "Gestion Employés" visible uniquement pour les admins

---

## 🚀 Installation en 3 Étapes

### 📋 Étape 1 : Déployer l'Edge Function (2 minutes)

#### Option A : Via Supabase Dashboard (Recommandé)

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Allez dans** : Edge Functions (menu de gauche)
3. **Cliquez sur** : "Create a new function"
4. **Nommez-la** : `manage-employees`
5. **Ouvrez le fichier** : `supabase/functions/manage-employees/index.ts`
6. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
7. **Collez dans l'éditeur Supabase** (Cmd+V)
8. **Cliquez sur "Deploy"**

**✅ Résultat** : La fonction est déployée.

#### Option B : Via Terminal (Si Supabase CLI installé)

```bash
cd /Users/sabrikhalfallah/Downloads/edifice-opus-one-main
supabase functions deploy manage-employees
```

---

### 📋 Étape 2 : Vérifier les Tables (1 minute)

Assurez-vous que les tables suivantes existent dans Supabase :

1. **Table `employees`** :
   - `id` (UUID)
   - `user_id` (UUID, référence auth.users)
   - `nom` (TEXT)
   - `prenom` (TEXT, nullable)
   - `poste` (TEXT)
   - `specialites` (TEXT[])

2. **Table `user_roles`** :
   - `user_id` (UUID, référence auth.users)
   - `role` (TEXT : "dirigeant", "salarie", "client")

**Si les tables n'existent pas**, exécutez le script SQL :
- `supabase/CREATE-EMPLOYEES-TABLE.sql`

---

### 📋 Étape 3 : Tester le Système (2 minutes)

1. **Connectez-vous en tant qu'admin** (rôle "dirigeant")
2. **Allez dans** : "Gestion Employés" (menu latéral)
3. **Cliquez sur** : "Nouvel employé"
4. **Remplissez le formulaire** :
   - Email : `test.employe@example.com`
   - Mot de passe : `password123`
   - Nom : `Dupont`
   - Prénom : `Jean`
   - Poste : `Maçon`
   - Spécialités : `Maçonnerie`, `Enduit`
5. **Cliquez sur** : "Créer l'employé"

**✅ Résultat** : L'employé est créé avec :
- ✅ Compte Supabase Auth
- ✅ Rôle "salarie" assigné
- ✅ Enregistrement dans la table `employees`

---

## 🎯 Fonctionnalités

### Pour les Admins (Patrons)

1. **Créer un employé** :
   - Email + mot de passe temporaire
   - Informations personnelles (nom, prénom, poste)
   - Spécialités (liste)
   - Le compte est créé automatiquement avec rôle "salarie"

2. **Modifier un employé** :
   - Modifier nom, prénom, poste, spécialités
   - Le mot de passe ne peut pas être modifié ici (à faire via Supabase Auth)

3. **Supprimer un employé** :
   - Supprime l'enregistrement employé
   - Supprime le rôle
   - Supprime le compte auth

4. **Désactiver/Activer un compte** :
   - Via la fonction `useToggleEmployeeAccount`
   - (À implémenter dans l'UI si nécessaire)

### Pour les Employés

1. **Se connecter** :
   - Email + mot de passe
   - Redirection automatique vers `/my-planning`

2. **Accès restreint** :
   - ✅ Planning personnel (`/my-planning`)
   - ✅ Paramètres (`/settings`)
   - ❌ Pas d'accès aux autres pages (Dashboard, Clients, Devis, etc.)

---

## 🔐 Sécurité

- ✅ **Vérification du rôle admin** : Seuls les utilisateurs avec rôle "dirigeant" peuvent créer/modifier/supprimer des employés
- ✅ **Edge Function sécurisée** : Vérifie l'authentification et le rôle avant toute action
- ✅ **RLS (Row Level Security)** : Les employés ne peuvent voir que leurs propres données
- ✅ **Protection des routes** : `ProtectedRoute` avec `requireAdmin` pour les pages admin

---

## 📝 Structure des Fichiers

```
src/
├── hooks/
│   └── useEmployees.ts          # Hook pour gérer les employés
├── pages/
│   └── AdminEmployees.tsx       # Page de gestion des employés (admin)
└── components/
    └── Sidebar.tsx              # Navigation avec lien "Gestion Employés"

supabase/
└── functions/
    └── manage-employees/
        └── index.ts             # Edge Function pour créer/supprimer des comptes
```

---

## 🐛 Dépannage

### Erreur : "Forbidden: Admin access required"

**Cause** : L'utilisateur n'a pas le rôle "dirigeant"

**Solution** :
1. Vérifiez dans Supabase : Table `user_roles`
2. Assurez-vous que votre `user_id` a le rôle `"dirigeant"`

### Erreur : "Failed to create user"

**Cause** : L'email existe déjà ou le mot de passe est trop faible

**Solution** :
- Utilisez un email unique
- Mot de passe minimum 6 caractères

### Erreur : "Edge Function not found"

**Cause** : La fonction n'est pas déployée

**Solution** :
1. Vérifiez que la fonction `manage-employees` est déployée dans Supabase
2. Redéployez-la si nécessaire

---

## ✅ Checklist de Vérification

- [ ] Edge Function `manage-employees` déployée
- [ ] Tables `employees` et `user_roles` créées
- [ ] Votre compte a le rôle "dirigeant"
- [ ] Vous pouvez accéder à `/admin/employees`
- [ ] Vous pouvez créer un employé de test
- [ ] L'employé peut se connecter avec son email/mot de passe
- [ ] L'employé est redirigé vers `/my-planning`
- [ ] L'employé ne peut pas accéder aux pages admin

---

## 🎉 C'est Prêt !

Le système de gestion des employés est maintenant opérationnel. Les patrons peuvent créer et gérer les comptes de leurs employés, et les employés ont un accès restreint à leur planning personnel.

