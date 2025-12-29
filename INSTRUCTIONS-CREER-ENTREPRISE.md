# 🔧 Instructions : Créer la Table companies

## ❌ Problème

L'erreur indique que la table `companies` n'existe pas dans Supabase :
```
Error: La table companies n'existe pas encore. Exécutez le script CREATE-COMPANIES-SYSTEM.sql dans Supabase.
```

## ✅ Solution

### Option 1 : Script Simple (Recommandé - 2 minutes)

1. **Ouvre Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionne ton projet** : `renmjmqlmafqjzldmsgs`
3. **Va dans SQL Editor** (menu de gauche)
4. **Clique sur "New query"**
5. **Ouvre le fichier** : `supabase/CREER-TABLE-COMPANIES.sql`
6. **Copie TOUT le contenu** (Cmd+A, Cmd+C)
7. **Colle dans l'éditeur SQL** (Cmd+V)
8. **Clique sur "Run"** (Cmd+Enter)

**✅ Résultat attendu** : Message "✅ Table companies créée avec succès !"

---

### Option 2 : Script Complet (Si tu veux tout installer)

Si tu n'as pas encore exécuté le script complet :

1. **Ouvre Supabase Dashboard** → **SQL Editor**
2. **Ouvre le fichier** : `supabase/INSTALL-COMPLETE-SYSTEM.sql`
3. **Copie TOUT le contenu** et **colle dans SQL Editor**
4. **Clique sur "Run"**

Ce script crée :
- ✅ Table `companies`
- ✅ Table `company_users`
- ✅ Table `invitations`
- ✅ Table `contact_requests`
- ✅ Toutes les RLS policies
- ✅ Toutes les fonctions SQL

---

## 🔍 Vérification

Après avoir exécuté le script :

1. **Va dans Supabase Dashboard** → **Table Editor**
2. **Tu devrais voir** : `companies` dans la liste des tables
3. **Clique sur `companies`** pour voir sa structure

---

## 🚨 Si ça ne marche toujours pas

### Vérifier que tu es bien admin

1. **Va dans SQL Editor**
2. **Exécute cette requête** :

```sql
SELECT 
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'administrateur';
```

3. **Vérifie** que ton user_id apparaît dans les résultats

### Si tu n'es pas admin

1. **Exécute cette requête** (remplace `TON_USER_ID` par ton ID) :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('TON_USER_ID', 'administrateur')
ON CONFLICT (user_id) DO UPDATE SET role = 'administrateur';
```

2. **Pour trouver ton user_id** :
   - Va dans **Authentication** → **Users**
   - Trouve ton email
   - Copie l'UUID (l'ID de l'utilisateur)

---

## ✅ Une fois la table créée

1. **Recharge la page** de l'application
2. **Va dans "Paramètres"** → **"Gestion des Entreprises"**
3. **Clique sur "Nouvelle entreprise"**
4. **Remplis le formulaire**
5. **Clique sur "Créer"**

**🎉 Ça devrait fonctionner maintenant !**

---

## 📋 Checklist

- [ ] Script SQL exécuté dans Supabase
- [ ] Table `companies` visible dans Table Editor
- [ ] Tu es bien connecté en tant qu'admin
- [ ] Test de création d'entreprise réussi














