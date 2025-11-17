# 🔐 Configuration des Variables d'Environnement

## 📋 Étapes pour Configurer Supabase

### 1. Créer un compte Supabase

1. Allez sur https://supabase.com
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet

### 2. Récupérer les Variables d'Environnement

1. Dans votre projet Supabase, allez dans **Settings** > **API**
2. Vous verrez deux valeurs importantes :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (une longue clé)

### 3. Créer le Fichier .env

1. À la racine du projet, créez un fichier `.env`
2. Ajoutez les variables suivantes :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public
```

### 4. Exemple de Fichier .env

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

### 5. Vérifier que le Fichier .env est Ignoré par Git

Le fichier `.env` devrait déjà être dans `.gitignore` pour ne pas être commité.

### 6. Redémarrer le Serveur de Développement

Après avoir créé/modifié le fichier `.env`, redémarrez le serveur :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez-le
npm run dev
```

---

## ⚠️ Important

- ❌ **NE COMMITEZ JAMAIS** le fichier `.env` avec vos vraies clés
- ✅ Utilisez `.env.example` pour documenter les variables nécessaires
- ✅ Le fichier `.env` est déjà dans `.gitignore`

---

## 🔍 Vérifier que ça Fonctionne

1. Démarrez l'application : `npm run dev`
2. Allez sur la page d'authentification
3. Si vous voyez une erreur dans la console, vérifiez :
   - Que le fichier `.env` existe
   - Que les variables sont correctes
   - Que le serveur a été redémarré

---

## 🆘 Problèmes Courants

### Erreur : "Missing environment variable"

**Solution** : Vérifiez que le fichier `.env` existe et contient les bonnes variables.

### Erreur : "Invalid API key"

**Solution** : Vérifiez que vous avez copié la bonne clé (anon public, pas service_role).

### Les changements ne sont pas pris en compte

**Solution** : Redémarrez le serveur de développement.

---

## 📝 Note

Si vous utilisez Vite (comme c'est le cas ici), les variables d'environnement doivent commencer par `VITE_` pour être accessibles dans le frontend.

