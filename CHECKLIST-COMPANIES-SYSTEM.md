# ✅ CHECKLIST - SYSTÈME COMPANIES

## 📋 Vérifications à effectuer après exécution du script SQL

### 1. ✅ Exécuter le script SQL
- [ ] Ouvrir Supabase Dashboard → SQL Editor
- [ ] Copier le contenu de `supabase/COMPLETE-COMPANIES-SYSTEM-REBUILD.sql`
- [ ] Exécuter le script
- [ ] Vérifier qu'il n'y a pas d'erreurs dans les logs

### 2. ✅ Vérifier les tables créées
- [ ] Table `companies` existe
- [ ] Table `company_users` existe
- [ ] Table `invitations` existe
- [ ] Toutes les colonnes sont présentes
- [ ] Les index sont créés

### 3. ✅ Vérifier les fonctions SQL
- [ ] Fonction `is_admin()` existe et fonctionne
- [ ] Fonction `is_company_admin()` existe et fonctionne
- [ ] Fonction `add_user_to_company()` existe

### 4. ✅ Vérifier les triggers
- [ ] Trigger `on_company_created` ajoute automatiquement l'owner à `company_users`
- [ ] Trigger `update_companies_updated_at` fonctionne
- [ ] Trigger `update_invitations_updated_at` fonctionne

### 5. ✅ Vérifier les policies RLS
- [ ] RLS activé sur `companies`
- [ ] RLS activé sur `company_users`
- [ ] RLS activé sur `invitations`
- [ ] Les policies permettent aux admins de tout faire
- [ ] Les policies permettent aux admins de company de gérer leur company
- [ ] Les policies permettent aux users de voir leurs données

---

## 🧪 Tests fonctionnels

### Test 1 : Créer une entreprise
- [ ] Se connecter en tant qu'admin
- [ ] Aller dans Paramètres → Gestion Entreprises
- [ ] Cliquer sur "Nouvelle entreprise"
- [ ] Remplir le formulaire (nom, plan, modules)
- [ ] Cliquer sur "Créer"
- [ ] ✅ L'entreprise est créée sans erreur 500
- [ ] ✅ L'utilisateur est automatiquement ajouté comme owner dans `company_users`

**Vérification SQL :**
```sql
-- Vérifier que l'entreprise existe
SELECT * FROM companies WHERE owner_id = auth.uid();

-- Vérifier que l'utilisateur est dans company_users
SELECT * FROM company_users WHERE user_id = auth.uid();
```

### Test 2 : Récupérer company_users
- [ ] Se connecter en tant qu'utilisateur
- [ ] Aller sur le dashboard
- [ ] Ouvrir la console du navigateur
- [ ] ✅ Pas d'erreur 500 sur `company_users`
- [ ] ✅ Les données sont chargées correctement

**Vérification SQL :**
```sql
-- Vérifier que l'utilisateur peut voir ses companies
SELECT * FROM company_users WHERE user_id = auth.uid();
```

### Test 3 : Inviter un utilisateur
- [ ] Se connecter en tant qu'admin ou admin de company
- [ ] Aller dans Paramètres → Gestion Entreprises
- [ ] Cliquer sur "Inviter dirigeant" sur une entreprise
- [ ] Entrer un email valide
- [ ] Sélectionner un rôle (owner, admin, member)
- [ ] Cliquer sur "Envoyer l'invitation"
- [ ] ✅ Pas d'erreur 400
- [ ] ✅ L'invitation est créée dans la table `invitations`
- [ ] ✅ Un email est envoyé (ou au moins l'invitation est créée)

**Vérification SQL :**
```sql
-- Vérifier que l'invitation existe
SELECT * FROM invitations WHERE email = 'email@example.com' AND status = 'pending';
```

### Test 4 : Accepter une invitation
- [ ] Cliquer sur le lien d'invitation reçu par email
- [ ] OU aller sur `/accept-invitation?token=TOKEN`
- [ ] Remplir le formulaire d'inscription
- [ ] Créer le compte
- [ ] ✅ Le compte est créé
- [ ] ✅ L'utilisateur est automatiquement ajouté à `company_users`
- [ ] ✅ L'invitation est marquée comme "accepted"
- [ ] ✅ Redirection vers le dashboard

**Vérification SQL :**
```sql
-- Vérifier que l'invitation est acceptée
SELECT * FROM invitations WHERE token = 'TOKEN' AND status = 'accepted';

-- Vérifier que l'utilisateur est dans company_users
SELECT * FROM company_users WHERE user_id = (SELECT user_id FROM invitations WHERE token = 'TOKEN');
```

### Test 5 : Se connecter automatiquement
- [ ] Après avoir accepté l'invitation
- [ ] ✅ L'utilisateur est automatiquement connecté
- [ ] ✅ Redirection vers `/dashboard`
- [ ] ✅ Pas d'erreur 500 ou 400
- [ ] ✅ Le dashboard s'affiche correctement

### Test 6 : Afficher le dashboard sans erreur
- [ ] Se connecter normalement
- [ ] Aller sur `/dashboard`
- [ ] Ouvrir la console du navigateur
- [ ] ✅ Pas d'erreur 500 sur `company_users`
- [ ] ✅ Pas d'erreur 400 sur les requêtes
- [ ] ✅ Les données sont chargées
- [ ] ✅ L'interface s'affiche correctement

### Test 7 : Utilisateur avec plusieurs companies
- [ ] Créer une deuxième entreprise
- [ ] Inviter l'utilisateur dans cette entreprise
- [ ] Accepter l'invitation
- [ ] ✅ L'utilisateur apparaît dans les deux companies
- [ ] ✅ Le hook `useCompanies()` retourne les deux companies

**Vérification SQL :**
```sql
-- Vérifier que l'utilisateur a plusieurs companies
SELECT cu.*, c.name 
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = auth.uid();
```

---

## 🔧 Tests techniques

### Test 8 : Vérifier les permissions RLS
- [ ] Un admin global peut voir toutes les companies
- [ ] Un admin de company peut voir sa company
- [ ] Un membre peut voir sa company
- [ ] Un utilisateur non membre ne peut pas voir la company

**Vérification SQL :**
```sql
-- Tester en tant qu'admin
SELECT * FROM companies; -- Doit retourner toutes les companies

-- Tester en tant qu'utilisateur normal
SELECT * FROM companies; -- Doit retourner uniquement ses companies
```

### Test 9 : Vérifier la fonction Edge send-invitation
- [ ] Déployer la fonction Edge (si nécessaire)
- [ ] Tester l'invitation via l'interface
- [ ] ✅ Pas d'erreur 400
- [ ] ✅ L'invitation est créée
- [ ] ✅ Les logs de la fonction sont corrects

---

## ❌ Problèmes courants et solutions

### Erreur 500 sur company_users
**Solution :** Exécuter `COMPLETE-COMPANIES-SYSTEM-REBUILD.sql`

### Erreur 400 sur send-invitation
**Solution :** 
1. Vérifier que la table `invitations` existe
2. Vérifier que les policies RLS sont correctes
3. Vérifier que l'utilisateur est admin ou admin de company

### L'utilisateur n'est pas ajouté automatiquement à company_users
**Solution :** Vérifier que le trigger `on_company_created` existe et fonctionne

### Impossible d'inviter
**Solution :** 
1. Vérifier que l'utilisateur est admin global OU admin de la company
2. Vérifier que la fonction `is_company_admin()` fonctionne
3. Vérifier les policies RLS sur `invitations`

---

## 📝 Notes importantes

- **Inscription uniquement via invitation** : La page d'inscription publique a été supprimée
- **Un utilisateur peut avoir plusieurs companies** : Le hook `useCompanies()` retourne toutes les companies
- **Les admins de company peuvent inviter** : Pas besoin d'être admin global
- **Trigger automatique** : L'owner est automatiquement ajouté à `company_users` lors de la création

---

## ✅ Checklist finale

- [ ] Tous les tests fonctionnels passent
- [ ] Aucune erreur 500 dans la console
- [ ] Aucune erreur 400 dans la console
- [ ] Les invitations fonctionnent
- [ ] Les utilisateurs peuvent accepter les invitations
- [ ] Le dashboard s'affiche sans erreur
- [ ] Un utilisateur peut avoir plusieurs companies
- [ ] Les admins de company peuvent inviter

**🎉 Si tous les tests passent, le système est opérationnel !**





