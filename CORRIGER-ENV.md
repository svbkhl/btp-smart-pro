# 🔧 Correction des Variables d'Environnement

## ⚠️ PROBLÈME DÉTECTÉ

Votre fichier `.env` pointe vers l'**ancien projet** Supabase alors que les fonctions sont déployées sur le **nouveau projet**.

### Ancien projet (dans .env actuellement) :
- Project ID: `cynffvpedtleejatmxeo`
- URL: `https://cynffvpedtleejatmxeo.supabase.co`

### Nouveau projet (où les fonctions sont déployées) :
- Project ID: `renmjmqlmafqjzldmsgs`
- URL: `https://renmjmqlmafqjzldmsgs.supabase.co`

## ✅ SOLUTION

### Étape 1 : Récupérer les nouvelles clés

1. Allez dans le **Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. Allez dans **Settings** → **API**

3. Récupérez :
   - **Project URL** : `https://renmjmqlmafqjzldmsgs.supabase.co`
   - **anon/public key** : La clé sous "Project API keys" → "anon" → "public"

### Étape 2 : Mettre à jour le fichier `.env`

Ouvrez le fichier `.env` à la racine du projet et remplacez par :

```env
# Nouveau projet Supabase
VITE_SUPABASE_URL=https://renmjmqlmafqjzldmsgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_nouvelle_cle_anon_ici
VITE_SUPABASE_PROJECT_ID=renmjmqlmafqjzldmsgs
```

**⚠️ IMPORTANT** : Remplacez `votre_nouvelle_cle_anon_ici` par la vraie clé récupérée depuis le Dashboard.

### Étape 3 : Redémarrer le serveur de développement

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez :
npm run dev
```

## 🔍 Vérification

Après avoir mis à jour le `.env` :

1. Vérifiez que le serveur démarre sans erreur
2. Connectez-vous à l'application
3. Testez l'assistant IA

## 📝 Où trouver les clés dans Supabase Dashboard

1. **Project URL** :
   - Settings → API → Project URL
   - Format : `https://[project-ref].supabase.co`

2. **anon/public key** :
   - Settings → API → Project API keys
   - Section "anon" → "public" key
   - C'est la clé qui commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## ⚡ Alternative : Utiliser Supabase CLI

Si vous préférez, vous pouvez aussi lier le projet et récupérer les infos :

```bash
# Le projet est déjà lié, mais vous pouvez vérifier :
npx supabase link --project-ref renmjmqlmafqjzldmsgs

# Puis récupérer les infos :
npx supabase status
```

Mais pour le frontend, vous devez quand même mettre à jour le `.env` avec les bonnes valeurs.

