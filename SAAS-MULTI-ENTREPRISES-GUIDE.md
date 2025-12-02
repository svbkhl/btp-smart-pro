# 🚀 Guide d'Implémentation - SaaS Multi-Entreprises

## ✅ Ce qui a été créé

### 1. Base de données
- ✅ **Table `companies`** : Gestion des entreprises avec features, settings, support_level
- ✅ **Table `company_users`** : Liaison utilisateurs ↔ entreprises
- ✅ **Table `interventions`** : Facturation des interventions SAV
- ✅ **Migration SQL** : Script pour ajouter `company_id` aux tables existantes
- ✅ **RLS Policies** : Sécurité et isolation des données par entreprise
- ✅ **Fonctions SQL** : `get_user_company_id`, `is_feature_enabled`, `get_support_level`

### 2. Frontend
- ✅ **Hook `useCompany`** : Récupération et gestion des companies
- ✅ **Utilitaires `companyFeatures`** : Vérification des features et support
- ✅ **Page Admin `AdminCompanies`** : Interface pour gérer les entreprises
- ✅ **Sidebar dynamique** : Masque les items selon les features activées
- ✅ **Route admin** : `/admin/companies` (accessible aux admins seulement)

### 3. Features disponibles
- `planning` : Planning des employés
- `facturation` : Facturation et paiements
- `devis` : Création et gestion des devis
- `projets` : Gestion des projets et chantiers
- `documents` : Gestion des documents
- `messagerie` : Système de messagerie
- `ia_assistant` : Assistant IA
- `employes` : Employés & RH

### 4. Niveaux de support
- **0** : Pas de support → interventions ponctuelles payantes
- **1** : Support standard → correction bugs + 1h/mois incluse
- **2** : Support premium → 3h/mois + priorité 24h + personnalisations avancées

---

## 📋 Étapes d'installation

### Étape 1 : Appliquer le script SQL

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor** (💬 dans le menu)
3. **Cliquez sur "New query"**
4. **Ouvrez le fichier** : `supabase/CREATE-COMPANIES-SYSTEM.sql`
5. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
6. **Collez dans SQL Editor** (`Cmd+V`)
7. **Cliquez sur "Run"** (ou `Cmd+Enter`)
8. **Vérifiez** : Vous devriez voir "Success"

### Étape 2 : Créer une entreprise de test

Après avoir appliqué le script SQL, vous pouvez créer une entreprise de test :

```sql
-- Créer une entreprise
INSERT INTO public.companies (name, plan, features, settings, support_level)
VALUES (
  'Mon Entreprise',
  'pro',
  '{
    "planning": true,
    "facturation": true,
    "devis": true,
    "projets": true,
    "messagerie": true,
    "ia_assistant": true,
    "employes": true
  }'::jsonb,
  '{
    "color_theme": "bleu",
    "menu_items": ["planning", "facturation", "devis", "projets", "messagerie", "ia_assistant", "employes"]
  }'::jsonb,
  2
) RETURNING id;

-- Associer un utilisateur à l'entreprise (remplacez USER_ID et COMPANY_ID)
INSERT INTO public.company_users (company_id, user_id, role)
VALUES (
  'COMPANY_ID_FROM_ABOVE',
  'USER_ID_FROM_AUTH_USERS',
  'owner'
);
```

### Étape 3 : Vérifier l'isolation des données

Toutes les tables existantes ont maintenant un `company_id`. Les RLS policies filtrent automatiquement les données par entreprise.

**Important** : Les données existantes n'ont pas de `company_id`. Vous devrez :
1. Créer une entreprise
2. Associer les utilisateurs à cette entreprise
3. Mettre à jour les données existantes avec le `company_id` approprié

---

## 🎯 Utilisation

### Pour les administrateurs

1. **Accéder à la gestion des entreprises** :
   - Connectez-vous en tant qu'admin
   - Allez dans le Sidebar → "Gestion Entreprises"
   - Ou directement : `/admin/companies`

2. **Créer une nouvelle entreprise** :
   - Cliquez sur "Nouvelle entreprise"
   - Remplissez le nom, plan, niveau de support
   - Activez/désactivez les modules souhaités
   - Cliquez sur "Créer"

3. **Modifier une entreprise** :
   - Cliquez sur l'icône "Éditer" d'une entreprise
   - Modifiez les modules ou le niveau de support
   - Les changements sont sauvegardés automatiquement

### Pour les utilisateurs

- Le Sidebar affiche uniquement les modules activés pour leur entreprise
- Les pages non activées ne sont pas accessibles
- L'isolation des données est automatique via RLS

---

## 🔒 Sécurité

### RLS (Row Level Security)

Toutes les tables sont protégées par RLS :
- Les utilisateurs ne voient que les données de leur entreprise
- Les admins peuvent gérer toutes les entreprises
- Les owners/admins d'une entreprise peuvent gérer leur entreprise

### Vérification des features

Le frontend et le backend vérifient les features avant d'afficher/autorisé l'accès :
- Sidebar : Masque les items non activés
- Pages : Peuvent vérifier `useIsFeatureEnabled(featureName)`
- Backend : Utilise `is_feature_enabled(company_id, feature_name)`

---

## 💰 Système de facturation interventions

### Table `interventions`

Les interventions hors SAV sont facturées via la table `interventions` :
- `type` : `standard`, `urgence`, `bug_fix`, `custom`
- `duration_hours` : Durée en heures
- `amount` : Montant facturé
- `status` : `pending`, `in_progress`, `completed`, `cancelled`

### Tarifs par défaut

```typescript
const INTERVENTION_TARIFS = {
  standard: 100, // minimum / intervention
  urgence: 200,
  bug_fix: 150,
  custom: 0, // à définir selon la demande
};
```

---

## 🚧 Prochaines étapes (optionnel)

1. **Créer un composant Interventions** :
   - Page pour créer/gérer les interventions
   - Calcul automatique des montants selon le type
   - Génération de factures pour les interventions

2. **Mettre à jour les données existantes** :
   - Script SQL pour assigner un `company_id` aux données existantes
   - Migration des utilisateurs vers des entreprises

3. **Dashboard par entreprise** :
   - Statistiques isolées par entreprise
   - KPIs spécifiques selon les modules activés

4. **Système de facturation automatique** :
   - Facturation mensuelle selon le plan
   - Facturation des interventions hors SAV
   - Intégration avec Stripe

---

## 📝 Notes importantes

1. **Migration des données existantes** :
   - Les données existantes n'ont pas de `company_id`
   - Vous devrez créer une entreprise par défaut et assigner les données

2. **Utilisateurs sans entreprise** :
   - Les utilisateurs sans entreprise ne verront pas les modules
   - Créez une entreprise et associez-les via `company_users`

3. **Super Admin** :
   - Pour créer un super admin, ajoutez `role: 'super_admin'` dans le JWT
   - Ou créez une fonction SQL pour gérer les super admins

4. **Performance** :
   - Les index sur `company_id` sont créés automatiquement
   - Les requêtes sont optimisées pour filtrer par entreprise

---

## ✅ Checklist de déploiement

- [ ] Appliquer le script SQL `CREATE-COMPANIES-SYSTEM.sql`
- [ ] Créer une entreprise de test
- [ ] Associer les utilisateurs existants à une entreprise
- [ ] Mettre à jour les données existantes avec `company_id`
- [ ] Tester l'isolation des données
- [ ] Vérifier que le Sidebar masque les modules non activés
- [ ] Tester la page admin `/admin/companies`
- [ ] Configurer les features pour chaque entreprise
- [ ] Tester les différents niveaux de support

---

## 🆘 Support

En cas de problème :
1. Vérifiez les logs Supabase
2. Vérifiez que les RLS policies sont actives
3. Vérifiez que les utilisateurs ont un `company_id` associé
4. Vérifiez que les features sont correctement configurées dans `companies.features`

---

**🎉 Votre application est maintenant un SaaS multi-entreprises professionnel !**




