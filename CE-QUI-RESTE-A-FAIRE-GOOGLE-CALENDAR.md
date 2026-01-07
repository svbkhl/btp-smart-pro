# 📋 Ce qui reste à faire - Google Calendar

## ✅ Code : 100% Terminé

Tout le code est implémenté et prêt :
- ✅ Frontend avec PKCE
- ✅ Backend Edge Functions
- ✅ Migrations SQL
- ✅ Services et hooks
- ✅ Gestion des rôles
- ✅ Documentation complète

---

## 🚀 Actions à Faire (Déploiement)

### 1. **Exécuter les Migrations SQL** (5 min)

Dans **Supabase Dashboard → SQL Editor**, exécutez dans l'ordre :

1. `supabase/migrations/20260106000001_google_calendar_entreprise_level.sql`
2. `supabase/migrations/20260106000002_add_google_calendar_id_to_companies.sql`
3. `supabase/migrations/20260106000003_prepare_google_webhooks.sql`

**Vérification** : Vérifiez que les tables suivantes existent :
- `google_calendar_connections`
- `google_calendar_webhooks`
- Colonne `google_calendar_id` dans `companies`

---

### 2. **Configurer Google Cloud Console** (10 min)

#### A. Activer Google Calendar API
1. Allez sur : https://console.cloud.google.com/
2. Sélectionnez votre projet
3. **APIs & Services** → **Library**
4. Recherchez "Google Calendar API"
5. Cliquez sur **Enable**

#### B. Créer OAuth 2.0 Client ID
1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Si demandé, configurez l'écran de consentement :
   - **User Type** : External
   - **App name** : BTP Smart Pro
   - **User support email** : votre email
   - **Developer contact** : votre email
   - **Save and Continue** (2 fois)
4. **Application type** : Web application
5. **Name** : BTP Smart Pro Web Client
6. **Authorized redirect URIs** :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
   ```
7. **Create**
8. **COPIEZ** :
   - **Client ID** (ex: `123456789-abc...`)
   - **Client Secret** (ex: `GOCSPX-abc...`)

---

### 3. **Configurer les Secrets Supabase** (3 min)

Dans **Supabase Dashboard → Settings → Edge Functions → Secrets**, ajoutez :

```
GOOGLE_CLIENT_ID=votre-client-id-ici
GOOGLE_CLIENT_SECRET=votre-client-secret-ici
GOOGLE_REDIRECT_URI=https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce
```

**Via CLI** (alternative) :
```bash
supabase secrets set GOOGLE_CLIENT_ID="votre-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="votre-client-secret"
supabase secrets set GOOGLE_REDIRECT_URI="https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/google-calendar-oauth-entreprise-pkce"
```

---

### 4. **Déployer les Edge Functions** (5 min)

```bash
# Déployer la fonction OAuth avec PKCE
supabase functions deploy google-calendar-oauth-entreprise-pkce

# Déployer la fonction de synchronisation
supabase functions deploy google-calendar-sync-entreprise
```

**Vérification** : Dans **Supabase Dashboard → Edge Functions**, vérifiez que les 2 fonctions sont listées :
- ✅ `google-calendar-oauth-entreprise-pkce`
- ✅ `google-calendar-sync-entreprise`

---

### 5. **Tester la Connexion** (5 min)

1. Connectez-vous à l'application
2. Allez dans **Paramètres** → **Intégrations**
3. Cliquez sur **"Connecter Google Calendar"**
4. Autorisez l'accès dans Google
5. Vérifiez que :
   - ✅ La connexion s'affiche comme "Connecté"
   - ✅ Le calendrier Google `"Planning – {NomEntreprise}"` est créé
   - ✅ Le compte Google est affiché

---

### 6. **Tester la Synchronisation** (5 min)

#### Test A : Synchronisation d'un événement
1. Allez dans **Calendrier**
2. Créez un nouvel événement
3. Vérifiez dans Google Calendar que l'événement apparaît

#### Test B : Synchronisation d'un planning
1. Allez dans **Planning Employés**
2. Créez une affectation pour un employé
3. Vérifiez dans Google Calendar que l'événement apparaît avec le format :
   `"{Prénom Employé} – {Nom} – {Chantier}"`

---

## ✅ Checklist Complète

- [ ] Migrations SQL exécutées (3 fichiers)
- [ ] Google Calendar API activée
- [ ] OAuth 2.0 Client ID créé
- [ ] Redirect URI configurée dans Google Cloud
- [ ] Secrets Supabase configurés (3 secrets)
- [ ] Edge Functions déployées (2 fonctions)
- [ ] Test de connexion Google Calendar réussi
- [ ] Test de synchronisation événement réussi
- [ ] Test de synchronisation planning réussi
- [ ] Vérification des rôles (Owner peut connecter, RH peut gérer)

---

## ⚠️ Problèmes Courants

### Erreur : "redirect_uri_mismatch"
**Solution** : Vérifiez que l'URL dans Google Cloud Console correspond **exactement** à celle dans `GOOGLE_REDIRECT_URI` (même avec/sans trailing slash).

### Erreur : "invalid_grant"
**Solution** : Le `code_verifier` est manquant. Vérifiez que PKCE est correctement implémenté (le code est déjà fait, c'est probablement un problème de configuration).

### Erreur : "Token expired"
**Solution** : Le rafraîchissement automatique devrait se déclencher. Vérifiez que `refresh_token` est présent dans la table `google_calendar_connections`.

### Synchronisation ne fonctionne pas
**Solution** :
1. Vérifiez que `enabled = true` dans `google_calendar_connections`
2. Vérifiez que `sync_planning_enabled = true` pour les plannings
3. Vérifiez les logs de l'Edge Function `google-calendar-sync-entreprise`

---

## 📝 Optionnel (Non Bloquant)

### Chiffrement des Tokens
Les tokens sont actuellement stockés en clair dans la base de données. Pour un niveau de sécurité supplémentaire, vous pouvez :
- Utiliser Supabase Vault pour chiffrer les tokens
- Implémenter un chiffrement au niveau de la base de données

**Note** : Ce n'est pas bloquant car les tokens sont déjà sécurisés (stockés uniquement côté backend, jamais exposés au frontend).

---

## 🎯 Temps Total Estimé

- **Migrations SQL** : 5 min
- **Google Cloud Console** : 10 min
- **Secrets Supabase** : 3 min
- **Déploiement Edge Functions** : 5 min
- **Tests** : 10 min

**Total : ~35 minutes**

---

## 🎉 Une fois Terminé

Vous aurez :
- ✅ Connexion Google Calendar fluide (1 clic)
- ✅ Un calendrier Google par entreprise
- ✅ Synchronisation automatique des événements
- ✅ Synchronisation automatique des plannings
- ✅ Gestion automatique des tokens
- ✅ Sécurité renforcée avec PKCE
- ✅ Architecture prête pour la production

**Tout le code est prêt, il ne reste que le déploiement !** 🚀


