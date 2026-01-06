# 🏢 ARCHITECTURE GOOGLE CALENDAR - NIVEAU ENTREPRISE

## 📋 VUE D'ENSEMBLE

Architecture complète pour connecter le calendrier de l'application ET les plannings employés à Google Calendar au **niveau ENTREPRISE**.

---

## 🎯 OBJECTIFS

1. ✅ **Connexion au niveau ENTREPRISE** (pas personnel par défaut)
2. ✅ **Calendrier Google dédié** : "Planning – {NomEntreprise}"
3. ✅ **Synchronisation automatique** : Événements + Plannings employés
4. ✅ **Gestion des rôles** : Seul le patron peut connecter
5. ✅ **Isolation multi-tenant** : Chaque entreprise a son propre calendrier

---

## 🗄️ BASE DE DONNÉES

### Migration SQL : `20260106000001_google_calendar_entreprise_level.sql`

#### Modifications de `google_calendar_connections` :

**Colonnes ajoutées** :
- `owner_user_id` : UUID (patron qui a connecté)
- `calendar_name` : TEXT (nom du calendrier Google créé)
- `sync_planning_enabled` : BOOLEAN (activer/désactiver sync planning)

**Contrainte modifiée** :
- `UNIQUE(company_id)` : Une seule connexion par entreprise (au lieu de par utilisateur)

**RLS Policies** :
- Seul le **patron** (owner) peut voir/créer/modifier/supprimer la connexion

#### Modifications de `employee_assignments` :

**Colonnes ajoutées** :
- `google_event_id` : TEXT (ID de l'événement dans Google Calendar)
- `synced_with_google` : BOOLEAN (synchronisé ou non)
- `google_sync_error` : TEXT (message d'erreur si sync échoue)

---

## ⚡ EDGE FUNCTIONS

### 1. `google-calendar-oauth-entreprise`

**Actions** :
- `get_auth_url` : Génère l'URL OAuth Google
- `exchange_code` : Échange le code OAuth contre des tokens + **crée le calendrier Google**
- `refresh_token` : Rafraîchit le token d'accès
- `disconnect` : Déconnecte et supprime la connexion

**Fonctionnalités** :
- ✅ Vérifie que l'utilisateur est **owner** (patron)
- ✅ Crée un calendrier Google dédié : `"Planning – {NomEntreprise}"`
- ✅ Stocke le `calendar_id` du calendrier créé
- ✅ Stocke les tokens de manière sécurisée

### 2. `google-calendar-sync-entreprise`

**Actions** :
- `create` : Crée un événement/planning dans Google Calendar
- `update` : Met à jour un événement/planning dans Google Calendar
- `delete` : Supprime un événement/planning dans Google Calendar

**Fonctionnalités** :
- ✅ Synchronise les **événements classiques** (`events`)
- ✅ Synchronise les **plannings employés** (`employee_assignments`)
- ✅ Utilise `extendedProperties.private` pour stocker les métadonnées
- ✅ Rafraîchit automatiquement les tokens expirés
- ✅ Gère les erreurs sans bloquer les opérations

**Format des événements Google Calendar** :

**Pour les événements classiques** :
```json
{
  "summary": "Titre de l'événement",
  "description": "Description...",
  "location": "Lieu...",
  "start": { "dateTime": "2026-01-06T10:00:00", "timeZone": "Europe/Paris" },
  "end": { "dateTime": "2026-01-06T11:00:00", "timeZone": "Europe/Paris" },
  "extendedProperties": {
    "private": {
      "event_id": "uuid",
      "company_id": "uuid",
      "event_type": "event"
    }
  }
}
```

**Pour les plannings employés** :
```json
{
  "summary": "Jean Dupont – Chantier Maison",
  "description": "Planning employé\nPoste: Chef de chantier\nChantier: Maison\nHeures: 8h",
  "location": "123 Rue Example",
  "start": { "dateTime": "2026-01-06T08:00:00", "timeZone": "Europe/Paris" },
  "end": { "dateTime": "2026-01-06T17:00:00", "timeZone": "Europe/Paris" },
  "extendedProperties": {
    "private": {
      "employee_id": "uuid",
      "company_id": "uuid",
      "assignment_id": "uuid",
      "event_type": "planning"
    }
  }
}
```

---

## 🔧 SERVICES & HOOKS

### Service : `googleCalendarService.ts`

**Fonctions** :
- `getCompanyGoogleCalendarConnection()` : Récupère la connexion de l'entreprise
- `syncWithGoogleCalendar()` : Synchronise un événement/planning
- `syncAllPlanningsToGoogle()` : Synchronise tous les plannings
- `syncAllEventsToGoogle()` : Synchronise tous les événements

### Hooks : `useGoogleCalendar.ts` (modifié)

**Modifications** :
- `useGoogleCalendarConnection()` : Récupère la connexion au niveau **entreprise** (pas utilisateur)
- Utilise `google-calendar-oauth-entreprise` au lieu de `google-calendar-oauth`
- Utilise `google-calendar-sync-entreprise` au lieu de `google-calendar-sync`

### Hook : `usePlanningSync.ts` (nouveau)

**Fonctions** :
- `useSyncPlanningWithGoogle()` : Synchronise un planning individuel
- `useSyncAllPlanningsWithGoogle()` : Synchronise tous les plannings

---

## 🎨 COMPOSANTS UI

### `GoogleCalendarConnection.tsx` (modifié)

**Modifications** :
- ✅ Affiche uniquement pour le **patron** (`isOwner`)
- ✅ Affiche le nom du calendrier (`calendar_name`)
- ✅ Affiche le statut de sync planning (`sync_planning_enabled`)
- ✅ Message pour les non-propriétaires : "Seul le propriétaire peut connecter"

### `EmployeesPlanning.tsx` (modifié)

**Intégration** :
- ✅ Synchronise automatiquement lors de la **création** d'un planning
- ✅ Synchronise automatiquement lors de la **modification** d'un planning
- ✅ Synchronise automatiquement lors de la **suppression** d'un planning
- ✅ Vérifie que `sync_planning_enabled` est activé

---

## 🔄 FLUX DE SYNCHRONISATION

### Création d'un Événement

1. **Utilisateur crée un événement** dans l'app
2. **Événement inséré** dans `events` (Supabase)
3. **Si Google Calendar connecté** :
   - Appel Edge Function `google-calendar-sync-entreprise`
   - Création de l'événement dans Google Calendar
   - Mise à jour de `google_event_id` et `synced_with_google` dans `events`

### Création d'un Planning

1. **RH/Patron crée un planning** dans `EmployeesPlanning`
2. **Planning inséré** dans `employee_assignments` (Supabase)
3. **Si Google Calendar connecté ET `sync_planning_enabled`** :
   - Appel Edge Function `google-calendar-sync-entreprise`
   - Création de l'événement dans Google Calendar avec format planning
   - Mise à jour de `google_event_id` et `synced_with_google` dans `employee_assignments`

### Modification/Suppression

- Même principe : synchronisation automatique si connecté

---

## 🔒 SÉCURITÉ

### Isolation Multi-Tenant

- ✅ Chaque entreprise a son propre calendrier Google
- ✅ RLS policies garantissent l'isolation
- ✅ Vérification systématique de `company_id` dans toutes les Edge Functions

### Permissions

- ✅ Seul le **patron** peut connecter Google Calendar
- ✅ Seul le **patron** peut modifier/déconnecter
- ✅ Les autres utilisateurs voient uniquement le statut de connexion

### Tokens

- ✅ Tokens stockés côté serveur uniquement (Edge Functions)
- ✅ Refresh automatique des tokens expirés
- ✅ Aucune exposition au front-end

---

## 📊 GESTION DES RÔLES GOOGLE CALENDAR

**Mapping des rôles** (à implémenter dans le futur) :

- **Patron** → `owner` (propriétaire du calendrier)
- **RH / Manager** → `writer` (peut modifier)
- **Employé** → `reader` (peut seulement lire)

**Note** : Pour l'instant, seul le patron peut connecter. Les permissions Google Calendar seront gérées lors de l'invitation des utilisateurs au calendrier.

---

## 🧪 TESTS

### Test 1 : Connexion Google Calendar (Patron)

1. **Se connecter en tant que patron**
2. **Aller dans** Paramètres → Intégrations
3. **Cliquer sur** "Connecter Google Calendar"
4. **Autoriser** dans la popup Google
5. **Vérifier** :
   - Badge "Connecté" visible
   - Nom du calendrier : "Planning – {NomEntreprise}"
   - Sync planning activée

### Test 2 : Synchronisation Événements

1. **Créer un événement** dans le calendrier de l'app
2. **Vérifier sur Google Calendar** que l'événement apparaît
3. **Modifier l'événement** dans l'app
4. **Vérifier** que la modification est synchronisée

### Test 3 : Synchronisation Plannings

1. **Créer un planning** pour un employé dans `EmployeesPlanning`
2. **Vérifier sur Google Calendar** que l'événement apparaît avec le format :
   - Titre : "{Prénom} {Nom} – {Chantier}"
   - Description : Détails du planning
   - Heures : Début et fin
3. **Modifier le planning** dans l'app
4. **Vérifier** que la modification est synchronisée

### Test 4 : Non-Propriétaire

1. **Se connecter en tant qu'employé** (pas patron)
2. **Aller dans** Paramètres → Intégrations
3. **Vérifier** : Message "Seul le propriétaire peut connecter"

---

## 📝 FICHIERS CRÉÉS/MODIFIÉS

### Nouveaux fichiers

- `supabase/migrations/20260106000001_google_calendar_entreprise_level.sql`
- `supabase/functions/google-calendar-oauth-entreprise/index.ts`
- `supabase/functions/google-calendar-sync-entreprise/index.ts`
- `src/services/googleCalendarService.ts`
- `src/hooks/usePlanningSync.ts`

### Fichiers modifiés

- `src/hooks/useGoogleCalendar.ts` (niveau entreprise)
- `src/components/GoogleCalendarConnection.tsx` (seul patron)
- `src/pages/EmployeesPlanning.tsx` (sync automatique)
- `src/hooks/useEvents.ts` (utilise nouvelle Edge Function)

---

## 🚀 DÉPLOIEMENT

### 1. Exécuter la Migration SQL

```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier : supabase/migrations/20260106000001_google_calendar_entreprise_level.sql
```

### 2. Déployer les Edge Functions

```bash
# Déployer google-calendar-oauth-entreprise
supabase functions deploy google-calendar-oauth-entreprise

# Déployer google-calendar-sync-entreprise
supabase functions deploy google-calendar-sync-entreprise
```

### 3. Vérifier les Secrets Supabase

Vérifier que les secrets sont configurés :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

---

## ✅ RÉSULTAT FINAL

**Architecture complète** :
- ✅ Connexion Google Calendar au niveau ENTREPRISE
- ✅ Calendrier dédié par entreprise : "Planning – {NomEntreprise}"
- ✅ Synchronisation automatique des événements
- ✅ Synchronisation automatique des plannings employés
- ✅ Seul le patron peut connecter
- ✅ Isolation multi-tenant garantie
- ✅ Gestion des erreurs robuste

**Le calendrier fonctionne exactement comme Google Calendar** avec synchronisation automatique dans les deux sens (App → Google).

---

**🔥 Architecture prête ! Déploie les migrations et Edge Functions pour activer la synchronisation complète ! 🔥**
