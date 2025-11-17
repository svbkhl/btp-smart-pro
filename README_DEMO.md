# 📋 Guide du Mode Démo - BTP Smart Pro

Ce guide explique comment utiliser le système de mode démo pour présenter l'application à des clients avec des données réalistes, et comment créer des copies client sans données de démo.

---

## 📚 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation et configuration](#installation-et-configuration)
3. [Utilisation du mode démo](#utilisation-du-mode-démo)
4. [Création de copies client](#création-de-copies-client)
5. [Scripts disponibles](#scripts-disponibles)
6. [Structure des données de démo](#structure-des-données-de-démo)
7. [Templates d'emails](#templates-demails)
8. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Le système de mode démo permet de :

- ✅ **Remplir l'application avec des données réalistes** pour les démonstrations
- ✅ **Identifier facilement les données de démo** via le flag `is_demo`
- ✅ **Supprimer toutes les données de démo** en une seule commande
- ✅ **Créer des copies client** sans données de démo
- ✅ **Personnaliser le branding** (logo, couleurs, nom d'entreprise)

---

## 🚀 Installation et configuration

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Mode démo (optionnel)
VITE_APP_DEMO=false  # true pour activer le mode démo
```

### 3. Appliquer les migrations

Exécutez la migration pour ajouter les colonnes `is_demo` :

```bash
# Via Supabase CLI
supabase db reset

# Ou manuellement dans Supabase Dashboard > SQL Editor
# Exécutez : supabase/migrations/20250104000000_add_demo_flags.sql
```

### 4. Déployer les Edge Functions

```bash
# Seed demo
supabase functions deploy seed-demo

# Purge demo
supabase functions deploy purge-demo
```

---

## 🎨 Utilisation du mode démo

### Activer le mode démo

1. **Via variable d'environnement** :
   ```env
   VITE_APP_DEMO=true
   ```

2. **Via l'interface admin** :
   - Connectez-vous en tant qu'administrateur
   - Allez dans **Paramètres** > **Mode Démo**
   - Cliquez sur **"Créer les données de démo"**

### Créer les données de démo

#### Option 1 : Via l'interface admin (recommandé)

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Paramètres** > **Mode Démo**
3. Cliquez sur **"Créer les données de démo"**
4. Confirmez l'action

#### Option 2 : Via la ligne de commande

```bash
# Créer les données de démo
npm run seed:demo

# Forcer la création (supprime d'abord les données existantes)
npm run seed:demo:force
```

#### Option 3 : Via SQL direct

```bash
# Exécutez dans Supabase Dashboard > SQL Editor
psql -f supabase/seeds/demo.sql
```

### Supprimer les données de démo

#### Option 1 : Via l'interface admin

1. Allez dans **Paramètres** > **Mode Démo**
2. Cliquez sur **"Supprimer les données de démo"**
3. Confirmez l'action

#### Option 2 : Via la ligne de commande

```bash
npm run purge:demo
```

#### Option 3 : Via SQL direct

```sql
-- Supprimer toutes les données de démo
DELETE FROM clients WHERE is_demo = true;
DELETE FROM projects WHERE is_demo = true;
DELETE FROM ai_quotes WHERE is_demo = true;
DELETE FROM notifications WHERE is_demo = true;
DELETE FROM employees WHERE is_demo = true;
DELETE FROM candidatures WHERE is_demo = true;
DELETE FROM taches_rh WHERE is_demo = true;
```

---

## 👥 Création de copies client

### Workflow complet

1. **Créer la copie client** :
   ```bash
   npm run create:client <client-name>
   ```
   
   Exemple :
   ```bash
   npm run create:client acme-construction
   ```

2. **Configurer les variables client** :
   - Éditez `clients/<client-name>/.env`
   - Configurez :
     - `VITE_CLIENT_COMPANY_NAME` : Nom de l'entreprise
     - `VITE_CLIENT_LOGO_URL` : URL du logo
     - `VITE_CLIENT_PRIMARY_COLOR` : Couleur principale (hex)
     - `VITE_APP_DEMO=false` : Désactiver le mode démo

3. **Purger les données de démo** :
   ```bash
   cd clients/<client-name>
   npm run purge:demo
   ```

4. **Optionnel : Seed des données client spécifiques** :
   - Créez `clients/<client-name>/seed-client.sql`
   - Exécutez-le dans Supabase Dashboard

5. **Déployer** :
   ```bash
   # Vercel
   vercel --env-file clients/<client-name>/.env
   
   # Netlify
   netlify deploy --env-file clients/<client-name>/.env
   ```

### Structure d'une copie client

```
clients/
  └── <client-name>/
      ├── .env                    # Variables d'environnement client
      ├── client-config.json      # Configuration client
      └── README.md               # Instructions de déploiement
```

---

## 📜 Scripts disponibles

### `npm run seed:demo`

Crée les données de démo dans la base de données.

**Options :**
- `--force` : Supprime d'abord les données de démo existantes

**Exemple :**
```bash
npm run seed:demo
npm run seed:demo -- --force
```

### `npm run purge:demo`

Supprime toutes les données de démo de la base de données.

**Exemple :**
```bash
npm run purge:demo
```

### `npm run create:client <client-name>`

Crée une copie client avec configuration personnalisée.

**Exemple :**
```bash
npm run create:client acme-construction
```

---

## 📊 Structure des données de démo

Les données de démo incluent :

### Clients (3)
- Entreprise Bernard & Fils (actif)
- Promotion Immobilière Dubois (VIP)
- M. et Mme Martin (actif)

### Projets (4)
- Rénovation complète appartement 75m² (en cours, 65%)
- Extension maison +20m² (planifié)
- Rénovation salle de bain (terminé, 100%)
- Construction garage (en attente)

### Devis (3)
- Rénovation complète (pending, 3 jours)
- Rénovation salle de bain (signed)
- Extension maison (pending, 1 jour)

### Notifications (4)
- Devis en attente (warning)
- Chantier à démarrer (info)
- Paiement reçu (success)
- Rappel devis (reminder)

### Données RH (si tables existent)
- 3 employés (Maçon, Plombier, Électricien)
- 2 candidatures (en attente, entretien)
- 2 tâches RH (urgente, en attente)

---

## 📧 Templates d'emails

Les templates d'emails sont disponibles dans `templates/emails/` :

- `quote-reminder-fr.html` : Rappel devis en attente
- `project-start-reminder-fr.html` : Rappel démarrage chantier
- `payment-due-reminder-fr.html` : Rappel paiement dû

### Variables disponibles

- `{{COMPANY_NAME}}` : Nom de l'entreprise
- `{{COMPANY_PHONE}}` : Téléphone
- `{{COMPANY_EMAIL}}` : Email
- `{{CLIENT_NAME}}` : Nom du client
- `{{QUOTE_TITLE}}` / `{{PROJECT_NAME}}` : Titre
- `{{AMOUNT_DUE}}` / `{{ESTIMATED_COST}}` : Montant
- `{{DAYS_PENDING}}` : Nombre de jours
- Et plus...

---

## 🔧 Dépannage

### Les données de démo ne s'affichent pas

1. Vérifiez que `is_demo = true` dans la base de données
2. Vérifiez que les migrations ont été appliquées
3. Videz le cache du navigateur

### Erreur lors du seed

1. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est configuré
2. Vérifiez que vous avez au moins un utilisateur dans `auth.users`
3. Consultez les logs dans la console

### Les Edge Functions ne fonctionnent pas

1. Vérifiez que les fonctions sont déployées :
   ```bash
   supabase functions list
   ```

2. Vérifiez les logs :
   ```bash
   supabase functions logs seed-demo
   supabase functions logs purge-demo
   ```

### Impossible de supprimer les données de démo

1. Vérifiez les permissions RLS
2. Utilisez `SUPABASE_SERVICE_ROLE_KEY` pour bypasser RLS
3. Supprimez manuellement via SQL si nécessaire

---

## 📝 Notes importantes

- ⚠️ **Les données de démo sont identifiées par `is_demo = true`**
- ⚠️ **La purge supprime définitivement toutes les données de démo**
- ✅ **Les données réelles ne sont jamais affectées**
- ✅ **Le mode démo peut être activé/désactivé à tout moment**

---

## 🆘 Support

Pour toute question ou problème :

1. Consultez les logs : `supabase functions logs <function-name>`
2. Vérifiez la documentation Supabase
3. Contactez l'équipe de développement

---

**Dernière mise à jour :** Janvier 2025

