# 📋 Guide : Créer un compte employé

## 🎯 Objectif
Créer un compte employé avec accès restreint au planning personnel.

---

## 📝 Étapes

### 1️⃣ Créer l'utilisateur dans Supabase Auth

1. Aller dans **Supabase Dashboard** > **Authentication** > **Users**
2. Cliquer sur **"Add user"** ou **"Create new user"**
3. Remplir :
   - **Email** : `karim@btp-smartpro.fr` (ou autre)
   - **Password** : `motdepasse123` (ou autre, min 6 caractères)
   - **Auto Confirm User** : ✅ Cocher (pour éviter la vérification email)
4. Cliquer sur **"Create user"**
5. **Copier l'UUID** de l'utilisateur créé (ex: `123e4567-e89b-12d3-a456-426614174000`)

---

### 2️⃣ Assigner le rôle "salarie"

1. Aller dans **Supabase Dashboard** > **SQL Editor**
2. Exécuter cette requête (remplacer `USER_ID_HERE` par l'UUID copié) :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'salarie'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

**Exemple :**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'salarie'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

---

### 3️⃣ Créer l'entrée dans la table employees

Dans le même **SQL Editor**, exécuter (remplacer `USER_ID_HERE` par l'UUID) :

```sql
INSERT INTO public.employees (user_id, nom, prenom, email, poste, specialites)
VALUES (
  'USER_ID_HERE',
  'Ben Ali',
  'Karim',
  'karim@btp-smartpro.fr',
  'Maçon',
  ARRAY['Maçonnerie', 'Enduit', 'Carrelage']
)
ON CONFLICT (user_id) DO UPDATE
SET nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    email = EXCLUDED.email,
    poste = EXCLUDED.poste,
    specialites = EXCLUDED.specialites;
```

**Exemple :**
```sql
INSERT INTO public.employees (user_id, nom, prenom, email, poste, specialites)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Ben Ali',
  'Karim',
  'karim@btp-smartpro.fr',
  'Maçon',
  ARRAY['Maçonnerie', 'Enduit', 'Carrelage']
)
ON CONFLICT (user_id) DO UPDATE
SET nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    email = EXCLUDED.email,
    poste = EXCLUDED.poste,
    specialites = EXCLUDED.specialites;
```

---

### 4️⃣ Vérifier

1. Aller dans **Table Editor** > **user_roles**
   - Vérifier que l'utilisateur a le rôle `salarie`

2. Aller dans **Table Editor** > **employees**
   - Vérifier que l'employé est créé avec les bonnes informations

---

### 5️⃣ Tester la connexion

1. Se déconnecter de l'application (si connecté en tant qu'admin)
2. Aller sur `/auth`
3. Se connecter avec :
   - **Email** : `karim@btp-smartpro.fr`
   - **Password** : `motdepasse123`
4. Vous devriez être redirigé vers `/my-planning` (planning personnel)

---

## ✅ Résultat attendu

- ✅ L'employé peut se connecter
- ✅ Redirection automatique vers `/my-planning`
- ✅ Menu sidebar limité : "Mon Planning" + "Paramètres"
- ✅ Accès refusé aux pages admin (redirection automatique)

---

## 🔧 Créer d'autres employés

Répéter les étapes 1-3 avec :
- Un nouvel email
- Un nouvel UUID
- Les informations de l'employé (nom, prénom, poste, spécialités)

---

## 📌 Notes

- Les employés ne peuvent pas accéder aux pages admin
- Les employés voient uniquement leur propre planning
- Les affectations sont créées par l'admin dans `/employees-planning`

