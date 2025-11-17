# 🖼️ Configuration Complète de Supabase Storage

## 📋 Vue d'Ensemble

Ce guide vous permet de configurer Supabase Storage pour l'upload d'images dans l'application.

---

## 🚀 Installation en 2 Étapes

### Étape 1 : Créer le Bucket "images"

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans "Storage"** (📦 dans le menu de gauche)
4. **Cliquez sur "New bucket"**
5. **Configurez le bucket** :
   - **Name** : `images`
   - **Public bucket** : ✅ **Activé** (pour que les images soient accessibles publiquement)
   - **File size limit** : `5242880` (5 MB)
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`
6. **Cliquez sur "Create bucket"**

---

### Étape 2 : Appliquer les Politiques RLS

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Allez dans SQL Editor** (💬 dans le menu)
3. **Cliquez sur "New query"**
4. **Ouvrez le fichier** : `supabase/CONFIGURE-STORAGE.sql`
5. **Copiez TOUT le contenu** (`Cmd+A`, `Cmd+C`)
6. **Collez dans SQL Editor** (`Cmd+V`)
7. **Cliquez sur "Run"** (ou `Cmd+Enter`)
8. **Vérifiez** : Vous devriez voir "Success"

---

## ✅ Vérification

### Vérifier que le Bucket Existe

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE name = 'images';
```

Vous devriez voir une ligne avec le bucket `images`.

### Vérifier les Politiques RLS

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier les politiques
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';
```

Vous devriez voir **4 politiques** :
- ✅ "Users can upload their own images" (INSERT)
- ✅ "Anyone can view images" (SELECT)
- ✅ "Users can delete their own images" (DELETE)
- ✅ "Users can update their own images" (UPDATE)

### Tester l'Upload

1. **Dans l'application**, créez un nouveau projet
2. **Uploadez une image** dans le formulaire
3. **Vérifiez** que l'image s'affiche correctement
4. **Vérifiez dans Storage** que l'image est dans le bon dossier :
   - `images/projects/{user_id}/...`

---

## 🔒 Sécurité

### Bonnes Pratiques

1. **Bucket public** : Les images sont accessibles publiquement
   - ✅ Bon pour les images de projets/clients
   - ⚠️ Ne stockez pas d'informations sensibles dans les images

2. **Dossiers par utilisateur** : Chaque utilisateur a son propre dossier
   - ✅ Empêche les conflits de noms
   - ✅ Facilite la gestion

3. **Validation côté client** : Le composant `ImageUpload` valide :
   - ✅ Type de fichier (JPEG, PNG, WebP, GIF)
   - ✅ Taille (max 5MB)

4. **Validation côté serveur** : Les politiques RLS garantissent :
   - ✅ Seul l'utilisateur peut uploader dans son dossier
   - ✅ Seul l'utilisateur peut supprimer ses images

---

## 🆘 Dépannage

### Erreur : "new row violates row-level security policy"

**Solution** : Vérifiez que les politiques RLS sont correctement configurées.
1. Exécutez le script `CONFIGURE-STORAGE.sql`
2. Vérifiez que les politiques existent (voir section "Vérification")

### Erreur : "Bucket not found"

**Solution** : 
1. Vérifiez que le bucket `images` existe dans Storage
2. Vérifiez que le nom est exactement `images` (sensible à la casse)
3. Créez le bucket si nécessaire (voir Étape 1)

### Erreur : "The resource already exists"

**Solution** : 
- C'est normal, le fichier existe déjà
- Le service génère un nom unique, mais si cela se produit, réessayez

### Les Images ne s'Affichent Pas

**Solution** :
1. Vérifiez que le bucket est **public** (Settings du bucket)
2. Vérifiez que les politiques SELECT sont configurées
3. Vérifiez l'URL de l'image dans la console du navigateur
4. Vérifiez que l'image est bien dans le bucket

### Erreur : "File size exceeds limit"

**Solution** :
1. Vérifiez la taille du fichier (max 5MB)
2. Réduisez la taille de l'image
3. Ou augmentez la limite dans les settings du bucket

---

## 📝 Structure des Dossiers

Les images seront organisées comme suit :

```
images/
  ├── projects/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  ├── clients/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  ├── quotes/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  └── analysis/
      └── {user_id}/
          └── {timestamp}-{random}.{ext}
```

---

## 🎉 C'est Fait !

**Votre Storage est maintenant configuré !**

### Ce qui Fonctionne :

1. ✅ Upload d'images pour les projets
2. ✅ Upload d'images pour les clients
3. ✅ Affichage des images
4. ✅ Suppression des images
5. ✅ Sécurité (RLS activée)

### Prochaines Étapes :

1. ✅ Testez l'upload dans l'application
2. ✅ Vérifiez que les images s'affichent
3. ✅ Testez la suppression d'images

---

## 📄 Fichiers Concernés

- ✅ `supabase/CONFIGURE-STORAGE.sql` - Script SQL pour les politiques
- ✅ `src/components/ImageUpload.tsx` - Composant d'upload
- ✅ `src/services/storageService.ts` - Service de stockage
- ✅ `CONFIGURATION-STORAGE.md` - Documentation détaillée

---

**Besoin d'aide ? Consultez la section "Dépannage" ou demandez de l'aide !** 📚

