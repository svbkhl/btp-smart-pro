# ✅ Vérification Complète - Google Calendar Integration

## 🔍 Checklist de Vérification

### 1️⃣ Scripts SQL Migrations

#### ✅ Script 1 : Google Calendar niveau entreprise
- **Fichier** : `supabase/migrations/20260106000001_google_calendar_entreprise_level.sql`
- **Status** : ⬜ À exécuter
- **Action** : Copier-coller dans Supabase SQL Editor et exécuter
- **Vérification** : Aucune erreur "column reference 'company_id' is ambiguous"

#### ✅ Script 2 : Ajouter google_calendar_id à companies
- **Fichier** : `supabase/migrations/20260106000002_add_google_calendar_id_to_companies.sql`
- **Status** : ⬜ À exécuter
- **Action** : Copier-coller dans Supabase SQL Editor et exécuter

#### ✅ Script 3 : Préparation webhooks
- **Fichier** : `supabase/migrations/20260106000003_prepare_google_webhooks.sql`
- **Status** : ⬜ À exécuter
- **Action** : Copier-coller dans Supabase SQL Editor et exécuter
- **Vérification** : Aucune erreur "column reference 'company_id' is ambiguous"

**📍 Où exécuter** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

---

### 2️⃣ Secrets Supabase

#### ✅ GOOGLE_CLIENT_ID
- **Name** : `GOOGLE_CLIENT_ID`
- **Value** : Votre Client ID depuis Google Cloud Console
- **Status** : ⬜ À vérifier
- **Vérification** : Allez sur https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions → Section "Secrets"

#### ✅ GOOGLE_CLIENT_SECRET
- **Name** : `GOOGLE_CLIENT_SECRET`
- **Value** : Votre Client Secret depuis Google Cloud Console
- **Status** : ⬜ À vérifier
- **Vérification** : Doit apparaître dans la liste des secrets (masqué)

#### ✅ GOOGLE_REDIRECT_URI
- **Name** : `GOOGLE_REDIRECT_URI`
- **Value** : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce`
- **Status** : ⬜ À vérifier
- **Vérification** : Doit apparaître dans la liste des secrets

**📍 Où vérifier** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions

---

### 3️⃣ Google Cloud Console

#### ✅ OAuth Consent Screen
- **Status** : ⬜ À vérifier
- **Vérification** : https://console.cloud.google.com/apis/credentials/consent
- **Requis** : Configuré avec au moins un nom d'app

#### ✅ OAuth 2.0 Client ID
- **Type** : Web application
- **Status** : ⬜ À vérifier
- **Vérification** : https://console.cloud.google.com/apis/credentials
- **Requis** : 
  - Client ID créé
  - Client Secret visible/récupéré
  - Authorized redirect URI ajouté : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce`

#### ✅ Google Calendar API
- **Status** : ⬜ À vérifier
- **Vérification** : https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- **Requis** : API activée (bouton "Enable" ou "Enabled")

---

### 4️⃣ Edge Functions Supabase

#### ✅ google-calendar-oauth-entreprise-pkce
- **Status** : ⬜ À vérifier
- **Vérification** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
- **Requis** : Fonction déployée et active

#### ✅ google-calendar-sync-entreprise
- **Status** : ⬜ À vérifier
- **Vérification** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
- **Requis** : Fonction déployée et active

**📍 Où vérifier** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions

---

## 🚀 ÉTAPE SUIVANTE : Exécuter les Scripts SQL

### Ordre d'exécution recommandé :

1. **Script 1** : `20260106000001_google_calendar_entreprise_level.sql`
   - Modifie la table `google_calendar_connections`
   - Ajoute les colonnes à `employee_assignments`
   - Configure les RLS policies

2. **Script 2** : `20260106000002_add_google_calendar_id_to_companies.sql`
   - Ajoute la colonne `google_calendar_id` à `companies`

3. **Script 3** : `20260106000003_prepare_google_webhooks.sql`
   - Crée la table `google_calendar_webhooks`
   - Configure les RLS policies

### Comment exécuter :

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. Ouvrez le fichier `20260106000001_google_calendar_entreprise_level.sql`
3. Copiez tout le contenu
4. Collez dans l'éditeur SQL Supabase
5. Cliquez sur **"Run"** ou appuyez sur `Ctrl+Enter` (ou `Cmd+Enter` sur Mac)
6. Vérifiez qu'il n'y a pas d'erreur
7. Répétez pour les scripts 2 et 3

---

## ✅ Après l'Exécution des Scripts SQL

Une fois les 3 scripts exécutés avec succès :

### Prochaine étape : Vérifier les Secrets

1. Allez sur : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions
2. Section **"Secrets"**
3. Vérifiez que les 3 secrets sont présents :
   - ✅ `GOOGLE_CLIENT_ID`
   - ✅ `GOOGLE_CLIENT_SECRET`
   - ✅ `GOOGLE_REDIRECT_URI`

### Si les secrets ne sont pas configurés :

Suivez le guide : `SECRETS-SUPABASE-GOOGLE-CALENDAR.md`

---

## 🧪 Test Final

Une fois tout configuré :

1. **Redéployez les Edge Functions** (si vous avez modifié les secrets) :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/functions
   - Cliquez sur **"Redeploy"** pour chaque fonction

2. **Testez la connexion** :
   - Allez dans votre application
   - **Paramètres** → **Intégrations** → **Google Calendar**
   - Cliquez sur **"Connecter Google Calendar"**
   - Vous devriez être redirigé vers Google OAuth
   - Autorisez l'accès
   - Vous serez redirigé vers l'app avec la connexion établie

---

## 📋 Résumé des Actions

### ✅ À Faire MAINTENANT :

1. [ ] Exécuter le Script SQL 1
2. [ ] Exécuter le Script SQL 2
3. [ ] Exécuter le Script SQL 3
4. [ ] Vérifier les 3 secrets Supabase
5. [ ] Vérifier Google Cloud Console (OAuth Client + API activée)
6. [ ] Redéployer les Edge Functions si nécessaire
7. [ ] Tester la connexion Google Calendar

---

## 🆘 En Cas d'Erreur

### Erreur SQL "column reference 'company_id' is ambiguous"
- ✅ **Résolu** : Les scripts ont été corrigés avec les références qualifiées

### Erreur "Secret not found"
- Vérifiez que les secrets sont bien ajoutés dans Supabase
- Vérifiez l'orthographe exacte : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### Erreur OAuth "redirect_uri_mismatch"
- Vérifiez que l'URL dans Google Cloud Console est **exactement** la même que dans Supabase
- Pas de trailing slash `/` à la fin
- Utilisez `https://` (pas `http://`)

---

## 📞 Fichiers de Référence

- **Scripts SQL** : `supabase/migrations/20260106000001_*.sql`, `20260106000002_*.sql`, `20260106000003_*.sql`
- **Secrets** : `SECRETS-SUPABASE-GOOGLE-CALENDAR.md`
- **Trouver Client ID/Secret** : `OU-TROUVER-CLIENT-ID-SECRET.md`
- **URLs** : `CONFIGURATION-GOOGLE-CALENDAR-URLS.md`

