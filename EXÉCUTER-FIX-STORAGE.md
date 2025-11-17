# 🚀 Exécuter FIX-STORAGE-PERMISSIONS-DEFINITIF.sql

## 📋 Instructions Pas à Pas

### Étape 1 : Ouvrir Supabase Dashboard

1. **Allez sur** : https://supabase.com/dashboard
2. **Connectez-vous** à votre compte
3. **Sélectionnez votre projet** : `renmjmqlmafqjzldmsgs`

### Étape 2 : Ouvrir SQL Editor

1. **Dans le menu de gauche**, cliquez sur **"SQL Editor"** (icône 💬)
2. **Cliquez sur "New query"** (bouton en haut à gauche)

### Étape 3 : Ouvrir le Script

1. **Ouvrez le fichier** : `supabase/FIX-STORAGE-PERMISSIONS-DEFINITIF.sql`
2. **Sélectionnez TOUT le contenu** (Cmd+A sur Mac, Ctrl+A sur Windows/Linux)
3. **Copiez** (Cmd+C sur Mac, Ctrl+C sur Windows/Linux)

### Étape 4 : Coller et Exécuter

1. **Collez dans SQL Editor** (Cmd+V sur Mac, Ctrl+V sur Windows/Linux)
2. **Vérifiez** que tout le script est bien collé
3. **Cliquez sur "Run"** (bouton en bas à droite) ou appuyez sur **Cmd+Enter** (Mac) / **Ctrl+Enter** (Windows/Linux)

### Étape 5 : Vérifier le Résultat

**Vous devriez voir** :
```
✅ Bucket Configuration
bucket_name: images
is_public: true
max_size_mb: 5.00

✅ Politiques RLS
policy_count: 4

📋 Politiques créées
nom: Anyone can view images (SELECT)
nom: Users can delete their own images (DELETE)
nom: Users can update their own images (UPDATE)
nom: Users can upload their own images (INSERT)
```

**Si vous voyez ces résultats, c'est parfait ! ✅**

---

## 🔍 Vérifications Supplémentaires

### Vérifier dans Storage

1. **Allez dans Storage** (menu de gauche)
2. **Vérifiez** que le bucket `images` existe
3. **Cliquez sur le bucket** `images`
4. **Allez dans Settings** (onglet en haut)
5. **Vérifiez** :
   - ✅ **Public bucket** : Activé (ON)
   - ✅ **File size limit** : 5 MB
   - ✅ **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`

### Vérifier les Politiques RLS

1. **Dans Storage → Policies** (onglet en haut)
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can upload their own images" (INSERT)
   - ✅ "Anyone can view images" (SELECT)
   - ✅ "Users can update their own images" (UPDATE)
   - ✅ "Users can delete their own images" (DELETE)

---

## ✅ Après l'Exécution

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Testez l'upload d'images** :
   - Créez un nouveau projet
   - Uploadez une image
   - Vérifiez que l'upload fonctionne sans erreur
   - Vérifiez que l'image s'affiche

---

## 🆘 Si Vous Avez une Erreur

### Erreur : "permission denied"

**Solution** : Vérifiez que vous êtes connecté avec un compte administrateur dans Supabase.

### Erreur : "bucket already exists"

**C'est normal !** Le script utilise `ON CONFLICT DO UPDATE`, donc il met à jour le bucket s'il existe déjà.

### Erreur : "policy already exists"

**C'est normal !** Le script supprime d'abord les anciennes politiques avant de créer les nouvelles.

---

## 🎯 Prochaine Étape

Après avoir exécuté le script :

1. ✅ **Vérifiez** que le bucket est créé et public
2. ✅ **Vérifiez** que les 4 politiques RLS existent
3. ✅ **Testez** l'upload d'images dans l'application

---

**Le script est prêt à être exécuté !** 🚀

