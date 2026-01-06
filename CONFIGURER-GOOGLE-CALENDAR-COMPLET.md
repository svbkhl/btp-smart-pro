# 🔗 CONFIGURATION COMPLÈTE GOOGLE CALENDAR

## 📋 Vue d'ensemble

Ce guide te permet de configurer **Google Calendar** de A à Z en **4 étapes simples**.

**Temps estimé** : 15-20 minutes

---

## ✅ ÉTAPE 1 : Exécuter la Migration SQL (2 minutes)

### 1.1 Ouvrir Supabase SQL Editor

1. **Va sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Clique sur** "SQL Editor" (💬 dans le menu de gauche)
3. **Clique sur** "New query"

### 1.2 Exécuter le Script

1. **Ouvre le fichier** : `supabase/migrations/20260105000026_create_google_calendar_integration.sql`
2. **Sélectionne TOUT** (Cmd+A)
3. **Copie** (Cmd+C)
4. **Colle dans SQL Editor** (Cmd+V)
5. **Clique sur** "Run" (ou Cmd+Enter)

### 1.3 Vérifier le Succès

Tu devrais voir :
```
✅ INTÉGRATION GOOGLE CALENDAR CRÉÉE !
✅ Table google_calendar_connections créée
✅ Colonnes Google ajoutées à events
✅ Indexes créés
✅ RLS policies activées
✅ Fonctions utilitaires créées
```

**✅ Étape 1 terminée !**

---

## ✅ ÉTAPE 2 : Configurer Google Cloud Console (10 minutes)

### 2.1 Créer un Projet Google Cloud

1. **Va sur** : https://console.cloud.google.com
2. **Connecte-toi** avec ton compte Google
3. **En haut à gauche**, clique sur le sélecteur de projet
4. **Clique sur** "New Project"
5. **Nom du projet** : `BTP Smart Pro` (ou ton choix)
6. **Clique sur** "Create"
7. **Attends** quelques secondes
8. **Sélectionne le projet** dans le sélecteur en haut

### 2.2 Activer Google Calendar API

1. **Dans le menu de gauche**, va dans **"APIs & Services"** → **"Library"**
2. **Dans la barre de recherche**, tape : `Google Calendar API`
3. **Clique sur** "Google Calendar API" dans les résultats
4. **Clique sur** "Enable" (Activer)
5. **Attends** quelques secondes que l'API soit activée

### 2.3 Créer des Identifiants OAuth 2.0

1. **Dans le menu de gauche**, va dans **"APIs & Services"** → **"Credentials"**
2. **En haut**, clique sur **"Create Credentials"** → **"OAuth client ID"**

#### 2.3.1 Configurer l'Écran de Consentement (si demandé)

Si c'est la première fois :
1. **User Type** : Sélectionne "External"
2. **App name** : `BTP Smart Pro`
3. **User support email** : Ton email
4. **Developer contact** : Ton email
5. **Clique sur** "Save and Continue"
6. **Ajoute ton email** dans "Test users" (optionnel)
7. **Clique sur** "Save and Continue"
8. **Clique sur** "Back to Dashboard"

#### 2.3.2 Créer l'OAuth Client ID

1. **Application type** : Sélectionne "Web application"
2. **Name** : `BTP Smart Pro Web`
3. **Authorized redirect URIs** : Clique sur "Add URI" et ajoute :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
   ```
   ⚠️ **IMPORTANT** : Remplace `renmjmqlmafqjzldmsgs` par ton Project Reference Supabase si différent
4. **Clique sur** "Create"
5. **⚠️ COPIE IMMÉDIATEMENT** :
   - **Client ID** : `123456789-abc...` (copie-le)
   - **Client Secret** : `GOCSPX-abc...` (copie-le)

**✅ Étape 2 terminée !**

---

## ✅ ÉTAPE 3 : Configurer les Secrets Supabase (3 minutes)

### 3.1 Ouvrir Supabase Dashboard

1. **Va sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs
2. **Clique sur** "Settings" (⚙️ en bas à gauche)
3. **Clique sur** "Edge Functions" dans le menu
4. **Clique sur** "Secrets" (ou "Environment Variables")

### 3.2 Ajouter les Secrets

**Clique sur** "Add new secret" pour chaque variable :

#### Secret 1 : GOOGLE_CLIENT_ID
- **Name** : `GOOGLE_CLIENT_ID`
- **Value** : Colle le **Client ID** copié à l'étape 2.3.2
- **Clique sur** "Save"

#### Secret 2 : GOOGLE_CLIENT_SECRET
- **Name** : `GOOGLE_CLIENT_SECRET`
- **Value** : Colle le **Client Secret** copié à l'étape 2.3.2
- **Clique sur** "Save"

#### Secret 3 : GOOGLE_REDIRECT_URI
- **Name** : `GOOGLE_REDIRECT_URI`
- **Value** : 
  ```
  https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth/callback
  ```
  ⚠️ Remplace `renmjmqlmafqjzldmsgs` par ton Project Reference si différent
- **Clique sur** "Save"

**✅ Étape 3 terminée !**

---

## ✅ ÉTAPE 4 : Déployer les Edge Functions (5 minutes)

### 4.1 Installer Supabase CLI (si pas déjà installé)

```bash
# macOS
brew install supabase/tap/supabase

# Ou avec npm
npm install -g supabase
```

### 4.2 Se Connecter à Supabase

```bash
# Se connecter
supabase login

# Lier le projet (remplace renmjmqlmafqjzldmsgs par ton Project Reference)
supabase link --project-ref renmjmqlmafqjzldmsgs
```

### 4.3 Déployer les Edge Functions

```bash
# Déployer google-calendar-oauth
supabase functions deploy google-calendar-oauth

# Déployer google-calendar-sync
supabase functions deploy google-calendar-sync
```

**✅ Étape 4 terminée !**

---

## 🧪 TESTER LA CONFIGURATION

### 1. Vérifier dans l'Application

1. **Ouvre l'application** (localhost:4000 ou ton URL de production)
2. **Connecte-toi**
3. **Va dans** "Paramètres" → "Intégrations"
4. **Clique sur** "Connecter Google Calendar"
5. **Autorise l'application** dans la popup Google
6. **Vérifie** que la connexion est enregistrée

### 2. Tester la Synchronisation

1. **Crée un événement** dans le calendrier de l'app
2. **Vérifie sur Google Calendar** que l'événement apparaît
3. **Modifie l'événement** dans l'app
4. **Vérifie** que la modification est synchronisée

---

## 🐛 DÉPANNAGE

### Erreur : "No active Google Calendar connection found"

**Solution** :
- Vérifie que tu as bien connecté Google Calendar dans Settings > Intégrations
- Vérifie que la connexion n'est pas expirée

### Erreur : "Failed to exchange code for tokens"

**Solution** :
- Vérifie que les secrets Supabase sont corrects (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Vérifie que le GOOGLE_REDIRECT_URI correspond exactement à celui configuré dans Google Cloud Console

### Erreur : "Failed to create event in Google Calendar"

**Solution** :
- Vérifie que Google Calendar API est bien activée
- Vérifie les quotas API Google (1,000,000 requêtes/jour par défaut)

### Les événements ne se synchronisent pas

**Solution** :
- Vérifie que `sync_direction` n'est pas `"google_to_app"` uniquement
- Vérifie les logs dans la console du navigateur (F12)
- Vérifie les logs des Edge Functions dans Supabase Dashboard

---

## 📊 VÉRIFICATION FINALE

### Vérifier la Table dans Supabase

1. **Va dans** Supabase Dashboard → **Table Editor**
2. **Cherche** la table `google_calendar_connections`
3. **Vérifie** qu'une ligne existe après connexion

### Vérifier les Edge Functions

1. **Va dans** Supabase Dashboard → **Edge Functions**
2. **Vérifie** que `google-calendar-oauth` et `google-calendar-sync` sont déployées
3. **Clique sur** une fonction pour voir les logs

---

## ✅ RÉCAPITULATIF

**Ce qui a été fait** :
- ✅ Migration SQL exécutée
- ✅ Google Cloud Console configuré
- ✅ Secrets Supabase ajoutés
- ✅ Edge Functions déployées

**Résultat** :
- ✅ Connexion Google Calendar fonctionnelle
- ✅ Synchronisation automatique App → Google
- ✅ Isolation multi-tenant garantie

---

## 🎉 C'EST TERMINÉ !

Google Calendar est maintenant **complètement configuré** et **opérationnel** !

**Prochaine étape** : Teste la synchronisation en créant un événement dans l'app et vérifie qu'il apparaît sur Google Calendar.

---

## 📝 NOTES IMPORTANTES

- Les tokens sont stockés de manière sécurisée dans Supabase
- La synchronisation est asynchrone et ne bloque pas les opérations
- Les erreurs de synchronisation sont loggées mais n'empêchent pas la création/modification/suppression
- Chaque utilisateur peut connecter SON Google Calendar personnel
- La synchronisation est isolée par entreprise (multi-tenant)

---

**🔥 Tout est prêt ! Teste maintenant la synchronisation ! 🔥**
