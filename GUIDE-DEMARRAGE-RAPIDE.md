# 🚀 Guide de Démarrage Rapide

## ⚡ Configuration en 3 Étapes

### Étape 1 : Configurer les Variables d'Environnement

#### Option A : Créer le fichier .env manuellement

1. **À la racine du projet**, créez un fichier nommé `.env`
2. **Ajoutez ces lignes** :

```env
VITE_SUPABASE_URL=votre_url_supabase_ici
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_publique_ici
```

#### Option B : Utiliser le script (si vous avez Supabase CLI)

```bash
# Copier l'exemple
cp .env.example .env

# Éditer le fichier .env avec vos valeurs
```

#### Où trouver les valeurs ?

1. **Allez sur https://supabase.com**
2. **Connectez-vous** à votre compte
3. **Sélectionnez votre projet** (ou créez-en un)
4. **Allez dans Settings > API**
5. **Copiez** :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

---

### Étape 2 : Appliquer les Migrations dans Supabase

#### Méthode 1 : Via l'Interface Web (Recommandé)

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans SQL Editor** (menu de gauche)
4. **Cliquez sur "New query"**
5. **Ouvrez le fichier** : `supabase/migrations/20241105120000_create_core_tables.sql`
6. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
7. **Collez dans l'éditeur SQL** (Cmd+V)
8. **Cliquez sur "Run"** ou appuyez sur Cmd+Enter
9. **Attendez que l'exécution se termine** (quelques secondes)

#### Méthode 2 : Via la CLI Supabase

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

#### Vérification

Après avoir exécuté la migration :

1. **Allez dans Table Editor** (menu de gauche)
2. **Vérifiez que vous voyez** :
   - ✅ `clients`
   - ✅ `projects`
   - ✅ `user_stats`
   - ✅ `user_settings`

Si vous voyez ces 4 tables, la migration a réussi ! 🎉

---

### Étape 3 : Tester l'Application

1. **Redémarrez le serveur de développement** :
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   npm run dev
   ```

2. **Ouvrez l'application** : http://localhost:8080

3. **Créez un compte** :
   - Allez sur `/auth`
   - Cliquez sur "Inscription"
   - Entrez un email et mot de passe
   - Cliquez sur "Créer un compte"

4. **Testez les fonctionnalités** :
   - Créez un client
   - Créez un projet
   - Vérifiez le Dashboard
   - Voir les statistiques
   - Modifier les paramètres

---

## ✅ Checklist de Vérification

- [ ] Fichier `.env` créé avec les bonnes variables
- [ ] Migration SQL exécutée dans Supabase
- [ ] 4 tables créées (`clients`, `projects`, `user_stats`, `user_settings`)
- [ ] Serveur de développement redémarré
- [ ] Application accessible sur http://localhost:8080
- [ ] Peut créer un compte
- [ ] Peut créer un client
- [ ] Peut créer un projet

---

## 🆘 Problèmes Courants

### Erreur : "Missing environment variable"

**Solution** :
1. Vérifiez que le fichier `.env` existe
2. Vérifiez que les variables commencent par `VITE_`
3. Redémarrez le serveur

### Erreur : "relation does not exist"

**Solution** :
1. Vérifiez que la migration a été exécutée
2. Vérifiez que les tables existent dans Supabase
3. Ré-exécutez la migration si nécessaire

### Erreur : "Invalid API key"

**Solution** :
1. Vérifiez que vous avez copié la bonne clé (anon public)
2. Vérifiez qu'il n'y a pas d'espaces dans le fichier `.env`
3. Redémarrez le serveur

---

## 📝 Notes

- Le fichier `.env` ne doit **JAMAIS** être commité dans Git
- Les clés Supabase sont sensibles - gardez-les secrètes
- Si vous changez les variables d'environnement, redémarrez toujours le serveur

---

**Une fois ces étapes terminées, votre application sera prête à être utilisée !** 🎉

