# 🚀 EXÉCUTER GOOGLE CALENDAR - GUIDE RAPIDE

## ⚡ Actions Immédiates

### 1️⃣ EXÉCUTER LA MIGRATION SQL

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

1. **Clique sur le lien** ci-dessus
2. **Ouvre** : `supabase/migrations/20260105000026_create_google_calendar_integration.sql`
3. **Copie TOUT** (Cmd+A puis Cmd+C)
4. **Colle dans SQL Editor** (Cmd+V)
5. **Clique sur "Run"** (ou Cmd+Enter)

**✅ Vérifie** : Tu devrais voir "Success" et des messages ✅

---

### 2️⃣ CONFIGURER GOOGLE CLOUD CONSOLE

**Lien direct** : https://console.cloud.google.com/apis/credentials

1. **Crée un projet** (ou sélectionne-en un)
2. **Active Google Calendar API** :
   - APIs & Services → Library
   - Recherche "Google Calendar API"
   - Clique sur "Enable"
3. **Crée OAuth Client ID** :
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Type : Web application
   - **Authorized redirect URIs** :
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
     ```
4. **COPIE** :
   - Client ID : `123456789-abc...`
   - Client Secret : `GOCSPX-abc...`

---

### 3️⃣ AJOUTER LES SECRETS SUPABASE

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions

1. **Clique sur "Secrets"** (ou "Environment Variables")
2. **Ajoute 3 secrets** :

   **Secret 1** :
   - Name : `GOOGLE_CLIENT_ID`
   - Value : Colle le Client ID copié

   **Secret 2** :
   - Name : `GOOGLE_CLIENT_SECRET`
   - Value : Colle le Client Secret copié

   **Secret 3** :
   - Name : `GOOGLE_REDIRECT_URI`
   - Value : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback`

---

### 4️⃣ DÉPLOYER LES EDGE FUNCTIONS

**Dans le terminal** :

```bash
# Se connecter à Supabase (si pas déjà fait)
supabase login

# Lier le projet
supabase link --project-ref renmjmqlmafqjzldmsgs

# Déployer google-calendar-oauth
supabase functions deploy google-calendar-oauth

# Déployer google-calendar-sync
supabase functions deploy google-calendar-sync
```

---

## ✅ VÉRIFICATION

1. **Ouvre l'app** : http://localhost:4000
2. **Va dans** : Paramètres → Intégrations
3. **Clique sur** : "Connecter Google Calendar"
4. **Autorise** dans la popup Google
5. **Crée un événement** dans le calendrier
6. **Vérifie** qu'il apparaît sur Google Calendar

---

## 🎉 TERMINÉ !

**Guide complet** : Voir `CONFIGURER-GOOGLE-CALENDAR-COMPLET.md`
