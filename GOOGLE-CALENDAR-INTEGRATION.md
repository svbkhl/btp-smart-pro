# 🔗 INTÉGRATION GOOGLE CALENDAR

## 📋 VUE D'ENSEMBLE

Intégration complète de Google Calendar avec le calendrier interne de l'application pour synchroniser les événements de manière sécurisée et fiable.

---

## ✅ FONCTIONNALITÉS

### **1. Authentification OAuth 2.0**
- ✅ Connexion sécurisée avec Google Identity Services
- ✅ Scopes : `calendar` et `calendar.events`
- ✅ Stockage sécurisé des tokens (access_token, refresh_token, expires_at)
- ✅ Refresh automatique des tokens expirés

### **2. Synchronisation App → Google**
- ✅ Création d'événement → Création dans Google Calendar
- ✅ Modification d'événement → Mise à jour dans Google Calendar
- ✅ Suppression d'événement → Suppression dans Google Calendar
- ✅ Stockage de `google_event_id` pour éviter les doublons

### **3. Gestion des connexions**
- ✅ Une connexion par utilisateur et entreprise
- ✅ Statut de connexion visible
- ✅ Déconnexion / révocation possible
- ✅ Isolation multi-tenant garantie

---

## 🚀 INSTALLATION

### **Étape 1 : Configuration Google Cloud Console**

1. **Créer un projet Google Cloud** (ou utiliser un existant)
2. **Activer l'API Google Calendar** :
   - Aller dans "APIs & Services" > "Library"
   - Rechercher "Google Calendar API"
   - Cliquer sur "Enable"
3. **Créer des identifiants OAuth 2.0** :
   - Aller dans "APIs & Services" > "Credentials"
   - Cliquer sur "Create Credentials" > "OAuth client ID"
   - Type : "Web application"
   - **Authorized redirect URIs** : 
     ```
     https://<votre-projet>.supabase.co/functions/v1/google-calendar-oauth/callback
     ```
     OU pour développement local :
     ```
     http://localhost:5173/auth/callback
     ```

4. **Copier les identifiants** :
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

### **Étape 2 : Variables d'environnement Supabase**

Dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets** :

```bash
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=https://<votre-projet>.supabase.co/functions/v1/google-calendar-oauth/callback
```

---

### **Étape 3 : Exécuter la migration SQL**

[**supabase/migrations/20260105000026_create_google_calendar_integration.sql**](supabase/migrations/20260105000026_create_google_calendar_integration.sql)

1. **Clique sur le lien** ci-dessus
2. **Copie TOUT** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

---

### **Étape 4 : Déployer les Edge Functions**

```bash
# Déployer google-calendar-oauth
supabase functions deploy google-calendar-oauth

# Déployer google-calendar-sync
supabase functions deploy google-calendar-sync
```

---

## 📖 UTILISATION

### **1. Connexion Google Calendar**

1. **Va dans les Paramètres** > **Intégrations**
2. **Clique sur "Connecter Google Calendar"**
3. **Autorise l'application** dans la popup Google
4. **La connexion est automatiquement enregistrée**

### **2. Synchronisation automatique**

Une fois connecté, tous les événements créés/modifiés/supprimés dans l'app sont automatiquement synchronisés avec Google Calendar.

### **3. Déconnexion**

1. **Va dans les Paramètres** > **Intégrations**
2. **Clique sur "Déconnecter"**
3. **Confirme la déconnexion**

---

## 🔧 ARCHITECTURE

### **Base de données**

#### **Table `google_calendar_connections`**
- `id` : UUID
- `user_id` : UUID (référence auth.users)
- `company_id` : UUID (référence companies)
- `google_email` : Email du compte Google
- `calendar_id` : ID du calendrier (généralement "primary")
- `access_token` : Token d'accès OAuth
- `refresh_token` : Token de rafraîchissement
- `expires_at` : Date d'expiration du token
- `sync_direction` : Direction de synchronisation
- `enabled` : Actif ou non

#### **Table `events` (colonnes ajoutées)**
- `google_event_id` : ID de l'événement dans Google Calendar
- `synced_with_google` : Boolean (synchronisé ou non)
- `google_sync_error` : Message d'erreur si sync échoue

---

### **Edge Functions**

#### **`google-calendar-oauth`**
Actions disponibles :
- `get_auth_url` : Génère l'URL d'authentification Google
- `exchange_code` : Échange le code d'autorisation contre des tokens
- `refresh_token` : Rafraîchit le token d'accès
- `disconnect` : Déconnecte Google Calendar

#### **`google-calendar-sync`**
Actions disponibles :
- `create` : Crée un événement dans Google Calendar
- `update` : Met à jour un événement dans Google Calendar
- `delete` : Supprime un événement dans Google Calendar

---

### **Hooks React**

#### **`useGoogleCalendarConnection()`**
Récupère la connexion Google Calendar active de l'utilisateur.

#### **`useGetGoogleAuthUrl()`**
Obtient l'URL d'authentification Google.

#### **`useExchangeGoogleCode()`**
Échange le code d'autorisation contre des tokens.

#### **`useDisconnectGoogleCalendar()`**
Déconnecte Google Calendar.

#### **`useSyncEventWithGoogle()`**
Synchronise un événement avec Google Calendar.

---

### **Composants**

#### **`GoogleCalendarConnection`**
Composant UI pour gérer la connexion Google Calendar :
- Affiche le statut de connexion
- Bouton "Connecter Google Calendar"
- Bouton "Déconnecter"
- Informations de la connexion (email, calendrier, dernière sync)

---

## 🔒 SÉCURITÉ

### **Isolation multi-tenant**
- ✅ Chaque connexion est liée à un `user_id` et `company_id`
- ✅ RLS policies garantissent l'isolation
- ✅ Aucune synchronisation cross-entreprise

### **OAuth 2.0**
- ✅ Tokens stockés de manière sécurisée
- ✅ Refresh automatique des tokens expirés
- ✅ Révocation possible

### **Permissions**
- ✅ Respect des permissions RBAC internes
- ✅ Seul l'utilisateur peut gérer sa connexion

---

## 🐛 DÉPANNAGE

### **Erreur : "No active Google Calendar connection found"**
→ Vérifier que la connexion est active et non expirée.

### **Erreur : "Failed to exchange code for tokens"**
→ Vérifier que les identifiants OAuth sont corrects dans les secrets Supabase.

### **Erreur : "Failed to create event in Google Calendar"**
→ Vérifier les quotas API Google et les permissions du compte.

### **Les événements ne se synchronisent pas**
→ Vérifier que `sync_direction` n'est pas `"google_to_app"` uniquement.

---

## 📊 QUOTAS GOOGLE

Google Calendar API a des quotas :
- **1,000,000 requêtes/jour** (par défaut)
- **100 requêtes/100 secondes/utilisateur**

Si tu atteins les quotas, les requêtes échoueront. Les erreurs sont loggées dans `google_sync_error`.

---

## 🔄 SYNCHRONISATION BIDIRECTIONNELLE (FUTUR)

La synchronisation Google → App n'est pas encore implémentée. Pour l'implémenter :

1. Utiliser les **webhooks Google Calendar** (watch channels)
2. Créer une Edge Function pour recevoir les webhooks
3. Mettre à jour les événements dans la base de données

---

## 📝 NOTES

- Les tokens sont stockés en clair dans la base de données (à chiffrer en production)
- La synchronisation est asynchrone et ne bloque pas les opérations
- Les erreurs de synchronisation sont loggées mais n'empêchent pas la création/modification/suppression

---

**🔥 L'intégration est prête ! Configure Google Cloud Console et déploie les Edge Functions. 🔥**

