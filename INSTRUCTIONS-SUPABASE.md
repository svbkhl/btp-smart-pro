# 📋 Instructions Détaillées pour Supabase

## 🎯 Étape 1 : Créer un Projet Supabase

1. **Allez sur https://supabase.com**
2. **Connectez-vous** ou créez un compte
3. **Cliquez sur "New Project"**
4. **Remplissez les informations** :
   - Nom du projet : "Edifice Opus One" (ou votre choix)
   - Mot de passe de la base de données : (choisissez un mot de passe fort)
   - Région : Choisissez la plus proche de vous
5. **Cliquez sur "Create new project"**
6. **Attendez** que le projet soit créé (2-3 minutes)

---

## 🔑 Étape 2 : Récupérer les Clés API

1. **Dans votre projet Supabase**, allez dans **Settings** (⚙️ en bas à gauche)
2. **Cliquez sur "API"** dans le menu
3. **Vous verrez deux sections importantes** :

### Project URL
- C'est votre `VITE_SUPABASE_URL`
- Exemple : `https://abcdefghijklmnop.supabase.co`
- **Copiez cette URL**

### API Keys
- **anon public** : C'est votre `VITE_SUPABASE_PUBLISHABLE_KEY`
- C'est une longue clé qui commence par `eyJ...`
- **Copiez cette clé** (ne copiez pas la clé "service_role", c'est la "anon public" qu'il faut)

---

## 📝 Étape 3 : Créer le Fichier .env

1. **À la racine du projet**, créez un fichier `.env`
2. **Ajoutez ces lignes** :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public_ici
```

3. **Remplacez** les valeurs par celles que vous avez copiées
4. **Sauvegardez** le fichier

**Exemple** :
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

---

## 🗄️ Étape 4 : Appliquer la Migration SQL

### Méthode Simple (Interface Web)

1. **Dans Supabase Dashboard**, allez dans **SQL Editor** (💬 dans le menu de gauche)
2. **Cliquez sur "New query"**
3. **Ouvrez le fichier** dans votre éditeur : `supabase/APPLY-MIGRATION.sql`
4. **Sélectionnez tout le contenu** (Cmd+A)
5. **Copiez** (Cmd+C)
6. **Collez dans l'éditeur SQL** de Supabase (Cmd+V)
7. **Cliquez sur "Run"** (bouton en bas à droite) ou appuyez sur **Cmd+Enter**
8. **Attendez** que l'exécution se termine (quelques secondes)
9. **Vérifiez** qu'il n'y a pas d'erreurs dans la console

### Vérification

1. **Allez dans "Table Editor"** (📊 dans le menu de gauche)
2. **Vous devriez voir 4 nouvelles tables** :
   - ✅ `clients`
   - ✅ `projects`
   - ✅ `user_stats`
   - ✅ `user_settings`

Si vous voyez ces 4 tables, **la migration a réussi !** 🎉

---

## ✅ Étape 5 : Vérifier que Tout Fonctionne

1. **Redémarrez le serveur de développement** :
   ```bash
   # Arrêtez le serveur (Ctrl+C dans le terminal)
   npm run dev
   ```

2. **Ouvrez l'application** : http://localhost:8080

3. **Testez l'authentification** :
   - Allez sur `/auth`
   - Créez un compte
   - Connectez-vous

4. **Testez les fonctionnalités** :
   - Créez un client
   - Créez un projet
   - Vérifiez le Dashboard
   - Voir les statistiques

---

## 🆘 Dépannage

### Erreur : "Missing environment variable"

**Solution** :
1. Vérifiez que le fichier `.env` existe à la racine du projet
2. Vérifiez que les variables sont correctes (pas d'espaces, pas de guillemets)
3. **Redémarrez le serveur** après avoir créé/modifié `.env`

### Erreur : "relation does not exist"

**Solution** :
1. Vérifiez que la migration SQL a été exécutée
2. Allez dans "Table Editor" et vérifiez que les tables existent
3. Si les tables n'existent pas, ré-exécutez la migration

### Erreur : "Invalid API key"

**Solution** :
1. Vérifiez que vous avez copié la bonne clé (anon public, pas service_role)
2. Vérifiez qu'il n'y a pas d'espaces dans le fichier `.env`
3. Vérifiez que l'URL est correcte

### Les tables existent mais je ne peux pas insérer de données

**Solution** :
1. Vérifiez que RLS (Row Level Security) est activé
2. Vérifiez que les politiques sont créées
3. Vérifiez que vous êtes connecté

---

## 📸 Capture d'Écran - Où Trouver les Clés

### Dans Supabase Dashboard :

```
Settings (⚙️)
  └── API
      ├── Project URL          → VITE_SUPABASE_URL
      └── API Keys
          └── anon public      → VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## ✅ Checklist Finale

- [ ] Projet Supabase créé
- [ ] Clés API récupérées
- [ ] Fichier `.env` créé avec les bonnes valeurs
- [ ] Migration SQL exécutée
- [ ] 4 tables créées et visibles
- [ ] Serveur redémarré
- [ ] Application testée

---

**Une fois ces étapes terminées, votre application sera complètement fonctionnelle !** 🎉

