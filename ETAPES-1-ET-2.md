# ✅ Étapes 1 et 2 : Configuration Complète

## 📋 Résumé des Étapes

### ✅ Étape 1 : Configurer les Variables d'Environnement
### ✅ Étape 2 : Appliquer les Migrations dans Supabase

---

## 🔑 ÉTAPE 1 : Variables d'Environnement

### Vérification

Le fichier `.env` existe déjà. Vérifiez qu'il contient :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public
```

### Si le fichier .env est vide ou incorrect

1. **Ouvrez le fichier `.env`** à la racine du projet
2. **Ajoutez ces deux lignes** (remplacez par vos vraies valeurs) :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public
```

### Où trouver les valeurs ?

1. **Allez sur https://supabase.com**
2. **Connectez-vous** et sélectionnez votre projet
3. **Settings** (⚙️) > **API**
4. **Copiez** :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Après avoir modifié .env

**Redémarrez le serveur** :
```bash
# Arrêtez le serveur (Ctrl+C)
npm run dev
```

---

## 🗄️ ÉTAPE 2 : Appliquer la Migration SQL

### Méthode Simple (Copier-Coller)

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Sélectionnez votre projet**
3. **Cliquez sur "SQL Editor"** (💬 dans le menu de gauche)
4. **Cliquez sur "New query"** (ou le bouton +)
5. **Ouvrez le fichier** `supabase/APPLY-MIGRATION.sql` dans votre éditeur de code
6. **Sélectionnez TOUT le contenu** (Cmd+A)
7. **Copiez** (Cmd+C)
8. **Collez dans l'éditeur SQL** de Supabase (Cmd+V)
9. **Cliquez sur "Run"** (bouton en bas à droite) ou **Cmd+Enter**
10. **Attendez** quelques secondes
11. **Vérifiez** qu'il n'y a pas d'erreurs (message vert "Success")

### Vérification de la Migration

1. **Dans Supabase**, allez dans **"Table Editor"** (📊 dans le menu)
2. **Vous devriez voir 4 tables** :
   - ✅ `clients`
   - ✅ `projects`
   - ✅ `user_stats`
   - ✅ `user_settings`

**Si vous voyez ces 4 tables → Migration réussie !** 🎉

---

## 🧪 Test Rapide

### Test 1 : Vérifier les Variables d'Environnement

```bash
# Dans le terminal, vérifiez que les variables sont chargées
# (Vous ne verrez peut-être rien, c'est normal si elles sont chargées)
npm run dev
```

Si le serveur démarre sans erreur liée à Supabase, c'est bon !

### Test 2 : Vérifier les Tables

1. **Dans Supabase** > **Table Editor**
2. **Vérifiez** que vous voyez les 4 tables
3. **Cliquez sur une table** pour voir sa structure

### Test 3 : Tester l'Application

1. **Ouvrez** http://localhost:8080
2. **Allez sur** `/auth`
3. **Créez un compte**
4. **Si vous pouvez vous connecter** → Tout fonctionne ! ✅

---

## ✅ Checklist

### Étape 1 : Variables d'Environnement
- [ ] Fichier `.env` existe
- [ ] `VITE_SUPABASE_URL` est rempli avec la bonne valeur
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` est rempli avec la bonne valeur
- [ ] Serveur redémarré après modification

### Étape 2 : Migration
- [ ] Migration SQL exécutée dans Supabase
- [ ] Message "Success" dans Supabase SQL Editor
- [ ] 4 tables visibles dans Table Editor :
  - [ ] `clients`
  - [ ] `projects`
  - [ ] `user_stats`
  - [ ] `user_settings`

### Test
- [ ] Serveur démarre sans erreur
- [ ] Peut se connecter à Supabase
- [ ] Peut créer un compte
- [ ] Peut accéder au Dashboard

---

## 🆘 Problèmes Courants

### "Missing environment variable"

**Solution** :
1. Vérifiez que `.env` existe à la racine
2. Vérifiez l'orthographe des variables (`VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`)
3. Redémarrez le serveur

### "relation does not exist"

**Solution** :
1. Vérifiez que la migration a été exécutée
2. Allez dans Table Editor et vérifiez les tables
3. Ré-exécutez la migration si nécessaire

### "Invalid API key"

**Solution** :
1. Vérifiez que vous avez copié la bonne clé (anon public)
2. Vérifiez qu'il n'y a pas d'espaces dans `.env`
3. Vérifiez que l'URL est correcte

---

## 📝 Fichiers Créés

- ✅ `.env.example` - Exemple de fichier .env
- ✅ `supabase/APPLY-MIGRATION.sql` - Migration SQL prête à utiliser
- ✅ `GUIDE-DEMARRAGE-RAPIDE.md` - Guide complet
- ✅ `INSTRUCTIONS-SUPABASE.md` - Instructions détaillées
- ✅ `ETAPES-1-ET-2.md` - Ce fichier

---

## 🚀 Après avoir Terminé les Étapes 1 et 2

Votre application sera **prête à être utilisée** !

Vous pourrez :
- ✅ Créer un compte
- ✅ Créer des clients
- ✅ Créer des projets
- ✅ Voir les statistiques
- ✅ Modifier les paramètres

**Besoin d'aide ?** Consultez les autres fichiers de documentation ! 📚

