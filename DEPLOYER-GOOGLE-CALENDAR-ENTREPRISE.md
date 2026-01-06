# 🚀 DÉPLOYER GOOGLE CALENDAR - NIVEAU ENTREPRISE

## 📋 RÉSUMÉ

Guide complet pour déployer l'intégration Google Calendar au niveau ENTREPRISE avec synchronisation des événements ET des plannings employés.

---

## ✅ ÉTAPE 1 : EXÉCUTER LA MIGRATION SQL (2 minutes)

### 1.1 Ouvrir Supabase SQL Editor

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

### 1.2 Exécuter le Script

1. **Ouvre** : `supabase/migrations/20260106000001_google_calendar_entreprise_level.sql`
2. **Sélectionne TOUT** (Cmd+A)
3. **Copie** (Cmd+C)
4. **Colle dans SQL Editor** (Cmd+V)
5. **Clique sur** "Run" (ou Cmd+Enter)

### 1.3 Vérifier le Succès

Tu devrais voir :
```
✅ GOOGLE CALENDAR NIVEAU ENTREPRISE CONFIGURÉ !
✅ Table google_calendar_connections modifiée (niveau entreprise)
✅ Colonnes Google ajoutées à employee_assignments
✅ RLS policies modifiées (seul le patron peut gérer)
✅ Fonction get_company_google_calendar_connection créée
```

**✅ Étape 1 terminée !**

---

## ✅ ÉTAPE 2 : CONFIGURER GOOGLE CLOUD CONSOLE (10 minutes)

**Suis le guide** : `GUIDE-COMPLET-GOOGLE-CONNEXION-ET-CALENDAR.md`

**Résumé rapide** :
1. Créer projet Google Cloud
2. Activer Google Calendar API
3. Créer OAuth Client ID (pour Calendar)
4. Copier Client ID et Client Secret

**✅ Étape 2 terminée !**

---

## ✅ ÉTAPE 3 : AJOUTER LES SECRETS SUPABASE (3 minutes)

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/functions

1. **Clique sur** "Secrets"
2. **Ajoute 3 secrets** :
   - `GOOGLE_CLIENT_ID` : Client ID de l'étape 2
   - `GOOGLE_CLIENT_SECRET` : Client Secret de l'étape 2
   - `GOOGLE_REDIRECT_URI` : `https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise/callback`

**✅ Étape 3 terminée !**

---

## ✅ ÉTAPE 4 : DÉPLOYER LES EDGE FUNCTIONS (5 minutes)

### 4.1 Se Connecter à Supabase

```bash
# Se connecter (si pas déjà fait)
supabase login

# Lier le projet
supabase link --project-ref renmjmqlmafqjzldmsgs
```

### 4.2 Déployer les Edge Functions

```bash
# Déployer google-calendar-oauth-entreprise
supabase functions deploy google-calendar-oauth-entreprise

# Déployer google-calendar-sync-entreprise
supabase functions deploy google-calendar-sync-entreprise
```

**✅ Étape 4 terminée !**

---

## 🧪 TESTER

### Test 1 : Connexion Google Calendar (Patron uniquement)

1. **Se connecter en tant que PATRON**
2. **Aller dans** Paramètres → Intégrations
3. **Cliquer sur** "Connecter Google Calendar"
4. **Autoriser** dans la popup Google
5. **Vérifier** :
   - Badge "Connecté" visible
   - Nom du calendrier : "Planning – {NomEntreprise}"
   - Sync planning activée

### Test 2 : Synchronisation Événements

1. **Créer un événement** dans le calendrier de l'app
2. **Ouvrir Google Calendar** (https://calendar.google.com)
3. **Vérifier** que l'événement apparaît dans le calendrier "Planning – {NomEntreprise}"

### Test 3 : Synchronisation Plannings

1. **Aller dans** Planning Employés
2. **Créer un planning** pour un employé (affecter à un chantier)
3. **Vérifier sur Google Calendar** que l'événement apparaît avec :
   - Titre : "{Prénom} {Nom} – {Chantier}"
   - Description : Détails du planning
   - Heures : Début et fin

### Test 4 : Non-Propriétaire

1. **Se connecter en tant qu'employé** (pas patron)
2. **Aller dans** Paramètres → Intégrations
3. **Vérifier** : Message "Seul le propriétaire peut connecter"

---

## 📊 VÉRIFICATION

### Vérifier la Table dans Supabase

1. **Va dans** Supabase Dashboard → **Table Editor**
2. **Cherche** la table `google_calendar_connections`
3. **Vérifie** qu'une ligne existe avec :
   - `company_id` : UUID de l'entreprise
   - `owner_user_id` : UUID du patron
   - `calendar_name` : "Planning – {NomEntreprise}"
   - `calendar_id` : ID du calendrier Google créé

### Vérifier les Edge Functions

1. **Va dans** Supabase Dashboard → **Edge Functions**
2. **Vérifie** que `google-calendar-oauth-entreprise` et `google-calendar-sync-entreprise` sont déployées
3. **Clique sur** une fonction pour voir les logs

---

## 🎉 C'EST TERMINÉ !

**Résultat** :
- ✅ Connexion Google Calendar au niveau ENTREPRISE
- ✅ Calendrier dédié : "Planning – {NomEntreprise}"
- ✅ Synchronisation automatique des événements
- ✅ Synchronisation automatique des plannings employés
- ✅ Seul le patron peut connecter
- ✅ Isolation multi-tenant garantie

**Le calendrier fonctionne exactement comme Google Calendar** avec synchronisation automatique !

---

## 🐛 DÉPANNAGE

### Erreur : "Only company owners can manage Google Calendar connection"

**Solution** : Vérifie que tu es connecté en tant que patron (owner).

### Erreur : "No active Google Calendar connection found for this company"

**Solution** : Vérifie que Google Calendar est connecté dans Paramètres → Intégrations.

### Les plannings ne se synchronisent pas

**Solution** :
1. Vérifie que `sync_planning_enabled` est activé dans la connexion
2. Vérifie les logs des Edge Functions dans Supabase Dashboard
3. Vérifie les colonnes `google_sync_error` dans `employee_assignments`

---

**🔥 Tout est prêt ! Teste maintenant la synchronisation complète ! 🔥**
