# Guide de Test : Système de Permissions Personnalisées par Employé

## 🎯 Objectif

Permettre au **patron** de sélectionner individuellement les fonctionnalités accessibles à chaque **employé**.

---

## 📋 Étape 1 : Appliquer la migration SQL

1. Suivez le guide : `APPLY-USER-PERMISSIONS-MIGRATION.md`
2. Vérifiez que la table `user_permissions` a été créée

---

## 🧪 Étape 2 : Test en tant que Patron

### 2.1 - Accéder à la gestion des employés

1. **Connectez-vous** avec un compte **Patron** (owner)
2. Allez sur la page **"Employés"** (via la sidebar ou `/users-management`)
3. Vous devriez voir la liste de tous les employés de votre entreprise

### 2.2 - Configurer les permissions d'un employé

1. **Trouvez un employé** dans la liste
2. Vous devriez voir **3 boutons** :
   - 🛡️ **Changer le rôle**
   - ⚙️ **Permissions** ← NOUVEAU !
   - 🗑️ **Retirer**

3. **Cliquez sur "Permissions"**
4. Une fenêtre s'ouvre avec toutes les permissions disponibles, **groupées par catégorie** :

#### **Clients**
- [ ] Voir les clients
- [ ] Créer des clients
- [ ] Modifier les clients
- [ ] Supprimer les clients

#### **Projets**
- [ ] Voir les projets
- [ ] Créer des projets
- [ ] Modifier les projets
- [ ] Supprimer les projets

#### **Devis**
- [ ] Voir les devis
- [ ] Créer des devis
- [ ] Modifier les devis
- [ ] Supprimer les devis

#### **Factures**
- [ ] Voir les factures
- [ ] Créer des factures
- [ ] Envoyer les factures

#### **Employés**
- [ ] Inviter des employés
- [ ] Voir les employés

#### **Paramètres**
- [ ] Gérer les paramètres de l'entreprise

### 2.3 - Exemple de configuration

**Scénario 1 : Employé Chantier (accès limité)**
```
✅ Voir les clients
✅ Voir les projets
❌ Créer/modifier/supprimer
```

**Scénario 2 : Employé Commercial (accès clients + devis)**
```
✅ Voir les clients
✅ Créer des clients
✅ Modifier les clients
✅ Voir les devis
✅ Créer des devis
❌ Factures, projets
```

**Scénario 3 : Responsable (accès étendu)**
```
✅ Toutes les permissions clients
✅ Toutes les permissions projets
✅ Toutes les permissions devis
✅ Voir les factures
✅ Voir les employés
❌ Gérer les paramètres (réservé au patron)
```

5. **Cochez les permissions** souhaitées
6. Cliquez sur **"Enregistrer"**
7. Un message de succès s'affiche : ✅ "Permissions mises à jour avec succès"

---

## 🔍 Étape 3 : Test en tant qu'Employé

### 3.1 - Connexion

1. **Déconnectez-vous** du compte patron
2. **Connectez-vous** avec le compte employé que vous venez de configurer
3. L'employé est **automatiquement redirigé** vers `/employee-dashboard`

### 3.2 - Vérifier la Sidebar

La sidebar de l'employé doit afficher **uniquement** les sections auxquelles il a accès :

**Si aucune permission accordée :**
```
✅ Tableau de bord
✅ Mon Planning
✅ Messagerie
✅ Paramètres (profil personnel uniquement)
```

**Si permissions "Clients" accordées :**
```
✅ Tableau de bord
✅ Clients           ← NOUVEAU !
✅ Mon Planning
✅ Messagerie
✅ Paramètres
```

**Si permissions "Projets" accordées :**
```
✅ Tableau de bord
✅ Clients (si accordé)
✅ Chantiers         ← NOUVEAU !
✅ Mon Planning
✅ Messagerie
✅ Paramètres
```

### 3.3 - Vérifier les accès

1. **Clients** :
   - Si permission "Voir les clients" → Page `/clients` accessible
   - Si permission "Créer des clients" → Bouton "Nouveau client" visible
   - Si permission "Modifier les clients" → Bouton "Modifier" visible
   - Si permission "Supprimer les clients" → Bouton "Supprimer" visible

2. **Projets** :
   - Si permission "Voir les projets" → Page `/projects` accessible
   - Si permission "Créer des projets" → Bouton "Nouveau projet" visible
   - etc.

3. **Devis** :
   - Si permission "Voir les devis" → Section devis visible
   - Si permission "Créer des devis" → Bouton "Nouveau devis" visible
   - etc.

4. **Factures** :
   - Si permission "Voir les factures" → Page `/facturation` accessible
   - Si permission "Créer des factures" → Bouton "Nouvelle facture" visible
   - Si permission "Envoyer les factures" → Bouton "Envoyer" visible

### 3.4 - Test d'accès direct (sécurité)

1. Essayez d'accéder directement à une page interdite en tapant l'URL :
   - Exemple : `/clients` si permission non accordée
   - **Résultat attendu** : Redirection vers `/dashboard` ou message "Accès refusé"

---

## ✅ Checklist de validation

### Interface Patron
- [ ] Le bouton "Permissions" apparaît pour chaque employé
- [ ] La fenêtre de permissions s'ouvre correctement
- [ ] Les permissions sont regroupées par catégorie
- [ ] Je peux cocher/décocher les permissions
- [ ] Le bouton "Enregistrer" fonctionne
- [ ] Un message de succès s'affiche après sauvegarde

### Interface Employé
- [ ] La sidebar affiche uniquement les sections autorisées
- [ ] Je peux accéder aux pages autorisées
- [ ] Je ne peux PAS accéder aux pages interdites
- [ ] Les boutons d'actions (créer, modifier, supprimer) respectent les permissions
- [ ] Tentative d'accès direct à une page interdite = redirection

### Persistance
- [ ] Les permissions sont conservées après déconnexion/reconnexion
- [ ] Les permissions sont conservées après redémarrage de l'application
- [ ] Si je modifie les permissions, les changements sont immédiatement appliqués (après rechargement de la page employé)

---

## 🐛 Problèmes connus et solutions

### Problème 1 : Le bouton "Permissions" n'apparaît pas

**Cause** : Vous n'êtes pas connecté en tant que patron (owner)

**Solution** :
1. Vérifiez votre rôle dans la base de données
2. Assurez-vous que `company_users.role_id` pointe vers un rôle avec `slug = 'owner'`

### Problème 2 : Les permissions ne s'appliquent pas

**Cause** : Le cache des permissions n'est pas rafraîchi

**Solution** :
1. Déconnectez-vous et reconnectez-vous
2. Ou attendez 5 minutes (durée du cache)
3. Ou ouvrez une fenêtre de navigation privée

### Problème 3 : Erreur "permission_id does not exist"

**Cause** : Les permissions de base ne sont pas dans la table `permissions`

**Solution** :
```sql
-- Insérer les permissions manquantes
INSERT INTO public.permissions (key, resource, action, category, description)
VALUES
  ('clients.read', 'clients', 'read', 'business', 'Voir les clients'),
  ('clients.create', 'clients', 'create', 'business', 'Créer des clients'),
  ('clients.update', 'clients', 'update', 'business', 'Modifier les clients'),
  ('clients.delete', 'clients', 'delete', 'business', 'Supprimer les clients'),
  ('projects.read', 'projects', 'read', 'business', 'Voir les projets'),
  ('projects.create', 'projects', 'create', 'business', 'Créer des projets'),
  ('projects.update', 'projects', 'update', 'business', 'Modifier les projets'),
  ('projects.delete', 'projects', 'delete', 'business', 'Supprimer les projets'),
  ('quotes.read', 'quotes', 'read', 'business', 'Voir les devis'),
  ('quotes.create', 'quotes', 'create', 'business', 'Créer des devis'),
  ('quotes.update', 'quotes', 'update', 'business', 'Modifier les devis'),
  ('quotes.delete', 'quotes', 'delete', 'business', 'Supprimer les devis'),
  ('invoices.read', 'invoices', 'read', 'business', 'Voir les factures'),
  ('invoices.create', 'invoices', 'create', 'business', 'Créer des factures'),
  ('invoices.send', 'invoices', 'send', 'business', 'Envoyer les factures'),
  ('users.invite', 'users', 'invite', 'hr', 'Inviter des employés'),
  ('users.read', 'users', 'read', 'hr', 'Voir les employés'),
  ('company.settings', 'company', 'settings', 'company', 'Gérer les paramètres de l''entreprise')
ON CONFLICT (key) DO NOTHING;
```

---

## 📊 Logs de débogage

Pour vérifier les permissions en cours :

```javascript
// Dans la console du navigateur (F12)
// Ceci affichera toutes les permissions de l'utilisateur connecté
console.log(window.permissions);
```

Ou dans le code :
```typescript
const { permissions, can } = usePermissions();
console.log('Mes permissions:', permissions);
console.log('Puis-je voir les clients ?', can('clients.read'));
```

---

## 🎉 Félicitations !

Vous avez maintenant un **système de permissions granulaires** où le patron peut décider précisément ce que chaque employé peut voir et faire dans l'application ! 🚀
