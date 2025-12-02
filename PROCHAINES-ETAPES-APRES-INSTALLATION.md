# 🎉 Système Installé - Prochaines Étapes

## ✅ Ce qui a été créé

Le script `INSTALL-COMPLETE-SYSTEM.sql` a créé :

### 1. **Système Multi-Entreprises**
- ✅ Table `companies` (entreprises)
- ✅ Table `company_users` (liaison utilisateurs ↔ entreprises)
- ✅ Table `interventions` (facturation SAV)
- ✅ Isolation des données par `company_id` sur toutes les tables

### 2. **Système d'Invitations**
- ✅ Table `invitations` (invitations avec tokens uniques)
- ✅ Fonction `accept_invitation()` (accepter une invitation)
- ✅ Fonction `has_valid_invitation()` (vérifier si un email a une invitation)
- ✅ RLS policies pour la sécurité

### 3. **Système de Demandes de Contact**
- ✅ Table `contact_requests` (demandes de contact)
- ✅ Fonction `create_contact_request()` (créer une demande)
- ✅ RLS policies (seuls les admins peuvent voir)

### 4. **Mise à jour des Tables Existantes**
- ✅ Ajout de `company_id` sur : `clients`, `projects`, `invoices`, `ai_quotes`, `employees`, `candidatures`, `taches_rh`
- ✅ RLS policies mises à jour pour l'isolation par entreprise

## 🚀 Prochaines Étapes

### 1. **Créer une Entreprise de Test (Admin)**

1. Va sur la page **Paramètres** → **Gestion Entreprises**
2. Clique sur **"Créer une nouvelle entreprise"**
3. Remplis les informations :
   - Nom : `Entreprise Test`
   - Plan : `pro` ou `enterprise`
   - Modules à activer : coche ceux que tu veux
   - Niveau de support : `2` (premium)

### 2. **Inviter un Dirigeant**

1. Sur la page **Gestion Entreprises**, trouve l'entreprise créée
2. Clique sur **"Inviter Dirigeant"**
3. Entre l'email du dirigeant
4. Le dirigeant recevra un email avec un lien d'invitation

### 3. **Tester le Système d'Invitation**

1. Le dirigeant clique sur le lien dans l'email
2. Il arrive sur `/accept-invitation?token=...`
3. Il remplit le formulaire (nom, prénom, mot de passe)
4. Son compte est créé et lié à l'entreprise
5. Il peut maintenant se connecter

### 4. **Tester les Demandes de Contact**

1. Va sur la page d'accueil (`/`)
2. Clique sur **"Demander un essai gratuit"** ou **"Nous contacter"**
3. Remplis le formulaire de contact
4. Va sur **Paramètres** → **Demandes de contact** (admin uniquement)
5. Tu verras la demande avec les options :
   - Marquer comme contacté
   - Créer entreprise + Inviter
   - Inviter (entreprise existe)
   - Rejeter

### 5. **Vérifier l'Isolation des Données**

1. Connecte-toi avec un compte dirigeant d'une entreprise
2. Crée des clients, projets, factures
3. Connecte-toi avec un compte d'une autre entreprise
4. Tu ne devrais **PAS** voir les données de l'autre entreprise

## 🔍 Vérifications Importantes

### Vérifier que les Tables Existent

Dans Supabase SQL Editor, exécute :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'company_users', 'invitations', 'contact_requests')
ORDER BY table_name;
```

Tu devrais voir les 4 tables listées.

### Vérifier les RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'company_users', 'invitations', 'contact_requests')
ORDER BY tablename, policyname;
```

### Vérifier les Fonctions

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('accept_invitation', 'has_valid_invitation', 'create_contact_request', 'get_user_company_id')
ORDER BY routine_name;
```

## ⚠️ Points d'Attention

1. **Premier Utilisateur Admin** : Assure-toi d'avoir au moins un utilisateur avec le rôle `administrateur` dans `user_roles`
2. **Company ID** : Les utilisateurs existants n'ont pas de `company_id` par défaut. Tu devras soit :
   - Créer une entreprise et les assigner manuellement
   - Ou créer un script de migration pour assigner les utilisateurs existants
3. **Données Existantes** : Les données créées avant l'installation n'ont pas de `company_id`. Tu devras soit :
   - Les supprimer
   - Ou créer un script pour les assigner à une entreprise par défaut

## 🎯 Test Complet du Workflow

1. **Admin crée une entreprise** → ✅
2. **Admin invite un dirigeant** → ✅
3. **Dirigeant accepte l'invitation** → ✅
4. **Dirigeant se connecte** → ✅
5. **Dirigeant invite un salarié** → ✅
6. **Salarié accepte et se connecte** → ✅
7. **Visiteur non invité essaie de s'inscrire** → ❌ (bloqué)
8. **Visiteur remplit le formulaire de contact** → ✅
9. **Admin voit la demande et crée entreprise + invite** → ✅

## 📝 Notes

- Le système est maintenant **multi-tenant** : chaque entreprise voit uniquement ses données
- Les **invitations expirent après 7 jours** par défaut
- Seuls les **admins** et **dirigeants** peuvent inviter des utilisateurs
- Les **visiteurs non démarchés** doivent passer par le formulaire de contact

## 🆘 En Cas de Problème

Si tu rencontres des erreurs :

1. Vérifie que toutes les tables existent (voir section "Vérifications")
2. Vérifie que les RLS policies sont actives
3. Vérifie que les fonctions SQL existent
4. Vérifie les logs dans la console du navigateur
5. Vérifie les logs Supabase dans le dashboard

---

**🎉 Félicitations ! Le système est maintenant installé et prêt à être utilisé !**

