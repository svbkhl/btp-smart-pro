# 🚀 Exécuter FIX-STORAGE-PERMISSIONS-SIMPLE.sql

## ⚠️ Problème Résolu

**Erreur** : `ERROR: 42501: must be owner of table objects`

**Solution** : Utilisez la version simplifiée du script qui ne nécessite pas de permissions administrateur.

---

## 📋 Instructions Pas à Pas

### Étape 1 : Créer le Bucket (si nécessaire)

**Si le bucket `images` n'existe pas encore** :

1. **Allez dans Supabase Dashboard → Storage**
2. **Cliquez sur "New bucket"**
3. **Configurez** :
   - **Nom** : `images`
   - **Public bucket** : Activé (ON) ⚠️ IMPORTANT
   - **File size limit** : `5 MB`
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`
4. **Cliquez sur "Create bucket"**

### Étape 2 : Exécuter le Script SQL

1. **Allez dans Supabase Dashboard → SQL Editor**
2. **Cliquez sur "New query"**
3. **Ouvrez le fichier** : `supabase/FIX-STORAGE-PERMISSIONS-SIMPLE.sql`
4. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
5. **Collez dans SQL Editor** (Cmd+V)
6. **Cliquez sur "Run"** (Cmd+Enter)

### Étape 3 : Vérifier le Résultat

**Vous devriez voir** :
```
✅ Bucket Configuration
bucket_name: images
is_public: true
max_size_mb: 5.00

✅ Politiques RLS
policy_count: 4

📋 Politiques créées
nom: Users can upload their own images (INSERT)
nom: Anyone can view images (SELECT)
nom: Users can update their own images (UPDATE)
nom: Users can delete their own images (DELETE)
```

**Si vous voyez ces résultats, c'est parfait ! ✅**

---

## 🔍 Vérifications

### Vérifier le Bucket

1. **Allez dans Storage → images**
2. **Allez dans Settings** (onglet en haut)
3. **Vérifiez** :
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

### Erreur : "bucket does not exist"

**Solution** : Créez le bucket manuellement dans Storage → New bucket (voir Étape 1)

### Erreur : "policy already exists"

**C'est normal !** Le script supprime d'abord les anciennes politiques avant de créer les nouvelles. Si vous avez toujours l'erreur, exécutez le script une seconde fois.

### Erreur : "permission denied"

**Solution** : 
1. Vérifiez que vous êtes connecté avec un compte qui a accès au projet
2. Si vous êtes le propriétaire du projet, cela ne devrait pas arriver
3. Si vous êtes un collaborateur, demandez au propriétaire d'exécuter le script

---

## 🎯 Différences avec la Version Définitive

**Version Simplifiée** :
- ✅ Ne modifie pas la table `storage.objects` (pas besoin de permissions administrateur)
- ✅ Ne crée pas le bucket automatiquement (doit être créé manuellement)
- ✅ Se contente de créer les politiques RLS
- ✅ Fonctionne avec les permissions standard

**Version Définitive** :
- ❌ Nécessite des permissions administrateur
- ❌ Essaie de créer le bucket automatiquement
- ❌ Essaie d'activer RLS sur `storage.objects` (déjà activé par défaut)

---

## 🎯 Prochaine Étape

Après avoir exécuté le script :

1. ✅ **Vérifiez** que le bucket est créé et public
2. ✅ **Vérifiez** que les 4 politiques RLS existent
3. ✅ **Testez** l'upload d'images dans l'application

---

**Le script simplifié est prêt à être exécuté !** 🚀

