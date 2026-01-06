# 📋 Résumé : Intégration Google Calendar Niveau Entreprise

## ✅ Ce qui a été implémenté

### 1. **Migration SQL** (`20260106000001_google_calendar_entreprise_level.sql`)
- ✅ Modification de `google_calendar_connections` pour le niveau entreprise :
  - Suppression de `UNIQUE(user_id, company_id)`
  - Ajout de `owner_user_id` (UUID)
  - Ajout de `calendar_name` (TEXT)
  - Ajout de `sync_planning_enabled` (BOOLEAN DEFAULT TRUE)
  - Nouveau `UNIQUE(company_id)` (une seule connexion par entreprise)
- ✅ Ajout de colonnes Google Calendar à `employee_assignments` :
  - `google_event_id` (TEXT)
  - `synced_with_google` (BOOLEAN DEFAULT FALSE)
  - `google_sync_error` (TEXT)
- ✅ **Ajout de `company_id` à `employee_assignments`** :
  - Migration des données existantes depuis `employees.company_id`
  - Contrainte NOT NULL après migration
  - Index pour performance
- ✅ Mise à jour des RLS policies pour restreindre la gestion aux **propriétaires uniquement**
- ✅ Fonction SQL `get_company_google_calendar_connection(company_uuid UUID)`

### 2. **Edge Function OAuth Entreprise** (`google-calendar-oauth-entreprise/index.ts`)
- ✅ Vérification que seul le **propriétaire** peut gérer la connexion
- ✅ `get_auth_url` : Génère l'URL OAuth Google
- ✅ `exchange_code` : 
  - Échange le code OAuth
  - Récupère le nom de l'entreprise depuis la DB
  - **Crée un calendrier Google dédié** : `"Planning – {NomEntreprise}"`
  - Stocke le `calendar_id` dans `google_calendar_connections`
  - Enregistre `owner_user_id`
- ✅ `refresh_token` : Rafraîchit le token d'accès
- ✅ `disconnect` : Déconnecte le calendrier Google

### 3. **Edge Function Sync Entreprise** (`google-calendar-sync-entreprise/index.ts`)
- ✅ Récupération de la connexion Google Calendar au niveau entreprise
- ✅ Rafraîchissement automatique des tokens expirés
- ✅ **Action `create`** :
  - Support pour `event_type: "planning"` (plannings employés)
  - Support pour `event_type: "event"` (événements classiques)
  - Pour les plannings : récupère `employee_assignments` avec `employees` et `projects`
  - Construit l'événement Google avec :
    - `summary`: `"{Prénom} {Nom} – {Chantier}"`
    - `description`: Détails du planning
    - `location`: Localisation du projet
    - `start`/`end`: Heures de début/fin
    - `extendedProperties.private`: `employee_id`, `company_id`, `assignment_id`, `event_type`
  - Met à jour `google_event_id` et `synced_with_google` dans la DB
- ✅ **Action `update`** : Mise à jour des événements existants dans Google Calendar
- ✅ **Action `delete`** : Suppression des événements dans Google Calendar
- ✅ Vérification stricte de `company_id` pour éviter les fuites de données
- ✅ Gestion d'erreurs avec mise à jour de `google_sync_error`

### 4. **Service Frontend** (`src/services/googleCalendarService.ts`)
- ✅ `getCompanyGoogleCalendarConnection()` : Récupère la connexion entreprise
- ✅ `syncWithGoogleCalendar()` : Fonction générique pour synchroniser événements/plannings
- ✅ `syncAllPlanningsToGoogle()` : Resynchronise tous les plannings non synchronisés
- ✅ `syncAllEventsToGoogle()` : Resynchronise tous les événements non synchronisés

### 5. **Hook Planning Sync** (`src/hooks/usePlanningSync.ts`)
- ✅ `useSyncPlanningWithGoogle()` : Mutation hook pour synchroniser un planning individuel
- ✅ `useSyncAllPlanningsWithGoogle()` : Mutation hook pour synchroniser tous les plannings

### 6. **Hook Google Calendar** (`src/hooks/useGoogleCalendar.ts`)
- ✅ Mise à jour pour le niveau entreprise :
  - `useGoogleCalendarConnection` : Récupère la connexion par `company_id` uniquement
  - `useGetGoogleAuthUrl` : Appelle `google-calendar-oauth-entreprise`
  - `useExchangeGoogleCode` : Appelle `google-calendar-oauth-entreprise`
  - `useDisconnectGoogleCalendar` : Appelle `google-calendar-oauth-entreprise`
  - `useSyncEventWithGoogle` : Appelle `google-calendar-sync-entreprise` avec `event_type: "event"`

### 7. **Composant UI** (`src/components/GoogleCalendarConnection.tsx`)
- ✅ Vérification que seul le **propriétaire** peut voir/gérer la connexion
- ✅ Affichage du nom du calendrier (`calendar_name`)
- ✅ Affichage du statut `sync_planning_enabled`
- ✅ Message informatif pour les non-propriétaires

### 8. **Page Planning Employés** (`src/pages/EmployeesPlanning.tsx`)
- ✅ Intégration de `useGoogleCalendarConnection` et `useSyncPlanningWithGoogle`
- ✅ **`saveAssignment`** :
  - Ajout de `company_id` lors de la création d'un assignment
  - Synchronisation automatique avec Google Calendar après création/mise à jour
  - Ne bloque pas l'utilisateur si la sync échoue
- ✅ **`deleteAssignment`** :
  - Synchronisation de la suppression avec Google Calendar
  - Ne bloque pas l'utilisateur si la sync échoue

### 9. **Page Settings** (`src/pages/Settings.tsx`)
- ✅ Ajout de l'onglet "Intégrations" avec `GoogleCalendarConnection`

## 🔧 Corrections apportées

1. ✅ **Ajout de `company_id` à `employee_assignments`** :
   - Migration SQL pour ajouter la colonne
   - Migration des données existantes depuis `employees.company_id`
   - Ajout de `company_id` lors de la création dans `EmployeesPlanning.tsx`

2. ✅ **Vérification stricte de `company_id` dans Edge Function** :
   - Vérification après récupération de l'assignment
   - Retour 403 si l'assignment n'appartient pas à l'entreprise

3. ✅ **Synchronisation automatique** :
   - Après création/mise à jour/suppression d'un planning
   - Gestion d'erreurs non bloquante

## 📝 Prochaines étapes

### Configuration requise

1. **Exécuter la migration SQL** :
   ```sql
   -- Exécuter dans Supabase SQL Editor
   supabase/migrations/20260106000001_google_calendar_entreprise_level.sql
   ```

2. **Configurer Google Cloud Console** :
   - Créer un projet Google Cloud
   - Activer Google Calendar API
   - Créer un OAuth 2.0 Client ID (type "Web application")
   - Ajouter les URI de redirection autorisés :
     - `https://{votre-projet}.supabase.co/functions/v1/google-calendar-oauth-entreprise`
     - `http://localhost:54321/functions/v1/google-calendar-oauth-entreprise` (pour développement local)

3. **Configurer les secrets Supabase** :
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID="votre-client-id"
   supabase secrets set GOOGLE_CLIENT_SECRET="votre-client-secret"
   ```

4. **Déployer les Edge Functions** :
   ```bash
   supabase functions deploy google-calendar-oauth-entreprise
   supabase functions deploy google-calendar-sync-entreprise
   ```

### Utilisation

1. **Connexion Google Calendar** :
   - Seul le **propriétaire** de l'entreprise peut se connecter
   - Aller dans **Paramètres > Intégrations**
   - Cliquer sur "Connecter Google Calendar"
   - Autoriser l'accès dans Google
   - Un calendrier dédié `"Planning – {NomEntreprise}"` sera créé automatiquement

2. **Synchronisation automatique** :
   - Les plannings créés/modifiés/supprimés dans l'app sont automatiquement synchronisés avec Google Calendar
   - Les événements créés/modifiés/supprimés dans l'app sont également synchronisés

3. **Gestion de la synchronisation** :
   - Le propriétaire peut activer/désactiver la synchronisation des plannings via `sync_planning_enabled`

## 📚 Documentation

- `ARCHITECTURE-GOOGLE-CALENDAR-ENTREPRISE.md` : Architecture complète du système
- `DEPLOYER-GOOGLE-CALENDAR-ENTREPRISE.md` : Guide de déploiement étape par étape

## ⚠️ Notes importantes

- **Sécurité** : Seul le propriétaire peut gérer la connexion Google Calendar
- **Isolation** : Chaque entreprise a son propre calendrier Google dédié
- **Synchronisation** : Unidirectionnelle (App → Google) pour l'instant
- **Gestion d'erreurs** : Les erreurs de synchronisation ne bloquent pas l'utilisateur
- **Performance** : La synchronisation se fait de manière asynchrone et non bloquante
