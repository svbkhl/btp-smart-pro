# 🔐 Guide : Connexion avec Google

## ✅ Ce qui a été créé

Une fonctionnalité de connexion avec Google OAuth a été ajoutée à la page d'authentification.

### Fonctionnalités
- ✅ Bouton "Continuer avec Google" sur la page de connexion
- ✅ Bouton "Continuer avec Google" sur la page d'inscription
- ✅ Redirection automatique après connexion Google réussie
- ✅ Gestion des rôles après connexion OAuth

---

## 🚀 Configuration dans Supabase (OBLIGATOIRE)

### Étape 1 : Activer Google OAuth dans Supabase

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans** : Authentication → Providers (menu de gauche)
4. **Trouvez "Google"** dans la liste des providers
5. **Cliquez sur "Google"** pour l'activer
6. **Activez le toggle** "Enable Google provider"

### Étape 2 : Configurer Google OAuth

#### A. Créer un projet Google Cloud (si vous n'en avez pas)

1. **Allez sur** : https://console.cloud.google.com
2. **Créez un nouveau projet** ou sélectionnez un projet existant
3. **Activez l'API Google+** :
   - Allez dans "APIs & Services" → "Library"
   - Recherchez "Google+ API"
   - Cliquez sur "Enable"

#### B. Créer les identifiants OAuth

1. **Allez dans** : "APIs & Services" → "Credentials"
2. **Cliquez sur** : "Create Credentials" → "OAuth client ID"
3. **Sélectionnez** : "Web application"
4. **Configurez** :
   - **Name** : `BTP Smart Pro` (ou le nom de votre choix)
   - **Authorized JavaScript origins** :
     ```
     http://localhost:5173
     http://localhost:8080
     https://votre-domaine.com
     ```
   - **Authorized redirect URIs** :
     ```
     https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
     ```
     ⚠️ **IMPORTANT** : Remplacez `renmjmqlmafqjzldmsgs` par votre project reference Supabase
5. **Cliquez sur** : "Create"
6. **Copiez** :
   - **Client ID** (ex: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret** (ex: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

#### C. Configurer dans Supabase

1. **Retournez dans Supabase Dashboard** → Authentication → Providers → Google
2. **Collez les identifiants** :
   - **Client ID (for OAuth)** : Collez votre Client ID Google
   - **Client Secret (for OAuth)** : Collez votre Client Secret Google
3. **Cliquez sur** : "Save"

### Étape 3 : Configurer l'URL de redirection

1. **Dans Supabase Dashboard** → Authentication → URL Configuration
2. **Vérifiez que "Redirect URLs" contient** :
   ```
   http://localhost:5173/**
   http://localhost:8080/**
   https://votre-domaine.com/**
   ```
3. **Ajoutez les URLs si nécessaire** et cliquez sur "Save"

---

## 🧪 Tester la Connexion Google

### 1. Vérifier la configuration

1. **Ouvrez** : http://localhost:5173/auth
2. **Vous devriez voir** : Le bouton "Continuer avec Google" sous le formulaire

### 2. Tester la connexion

1. **Cliquez sur** : "Continuer avec Google"
2. **Sélectionnez votre compte Google**
3. **Autorisez l'application** (si demandé)
4. **Vous serez redirigé** vers l'application

### 3. Vérifier le rôle

Après la première connexion Google :
- L'utilisateur sera créé automatiquement dans Supabase Auth
- **Par défaut**, il n'aura pas de rôle dans `user_roles`
- **Il sera redirigé vers** `/dashboard` (comme dirigeant par défaut)

**Pour assigner un rôle** :
1. Allez dans Supabase Dashboard → Table Editor → `user_roles`
2. Trouvez l'utilisateur (par email)
3. Ajoutez une entrée avec `role: "dirigeant"` ou `role: "salarie"`

---

## 🔧 Améliorations Possibles

### 1. Assigner automatiquement un rôle après OAuth

Vous pouvez créer une fonction Supabase qui assigne automatiquement un rôle après la première connexion OAuth :

```sql
-- Créer une fonction pour assigner un rôle par défaut
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assigner le rôle "dirigeant" par défaut pour les nouveaux utilisateurs
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'dirigeant')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer un trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();
```

### 2. Créer automatiquement un enregistrement employé

Si vous voulez créer automatiquement un enregistrement dans `employees` après connexion OAuth :

```sql
-- Modifier la fonction pour créer aussi un employé
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assigner le rôle "dirigeant" par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'dirigeant')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Optionnel : Créer un enregistrement employé
  -- INSERT INTO public.employees (user_id, nom, poste)
  -- VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'), 'Non défini')
  -- ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection n'est pas configurée correctement dans Google Cloud Console

**Solution** :
1. Vérifiez que l'URL dans Google Cloud Console est exactement :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/auth/v1/callback
   ```
2. Remplacez `renmjmqlmafqjzldmsgs` par votre project reference Supabase

### Erreur : "invalid_client"

**Cause** : Le Client ID ou Client Secret est incorrect

**Solution** :
1. Vérifiez que vous avez copié correctement les identifiants
2. Vérifiez qu'ils sont bien collés dans Supabase Dashboard

### Le bouton ne fait rien

**Cause** : Google OAuth n'est pas activé dans Supabase

**Solution** :
1. Vérifiez que Google provider est activé dans Supabase
2. Vérifiez que Client ID et Client Secret sont configurés

---

## ✅ Checklist de Vérification

- [ ] Google OAuth activé dans Supabase Dashboard
- [ ] Client ID et Client Secret configurés dans Supabase
- [ ] URL de redirection configurée dans Google Cloud Console
- [ ] URLs de redirection configurées dans Supabase (URL Configuration)
- [ ] Bouton "Continuer avec Google" visible sur la page /auth
- [ ] Connexion Google fonctionne
- [ ] Redirection après connexion fonctionne
- [ ] Rôle assigné à l'utilisateur (optionnel : via trigger)

---

## 🎉 C'est Prêt !

La connexion avec Google est maintenant disponible. Les utilisateurs peuvent se connecter avec leur compte Google au lieu de créer un compte avec email/mot de passe.

