# 🖼️ Configuration de Supabase Storage pour l'Upload d'Images

## 📋 Étapes de Configuration

### 1. Créer le Bucket "images" dans Supabase

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans "Storage"** (📦 dans le menu de gauche)
4. **Cliquez sur "New bucket"**
5. **Configurez le bucket** :
   - **Name** : `images`
   - **Public bucket** : ✅ **Activé** (pour que les images soient accessibles publiquement)
   - **File size limit** : 5 MB (ou plus selon vos besoins)
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`
6. **Cliquez sur "Create bucket"**

### 2. Configurer les Politiques de Stockage (RLS)

1. **Dans Storage**, cliquez sur le bucket `images`
2. **Allez dans "Policies"** (onglet en haut)
3. **Cliquez sur "New policy"**

#### Politique 1 : Permettre l'upload (INSERT)

1. **Nom** : "Users can upload their own images"
2. **Type** : INSERT
3. **Policy definition** : 
   ```sql
   (bucket_id = 'images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   Cette politique permet aux utilisateurs d'uploader seulement dans leur propre dossier (user_id)

#### Politique 2 : Permettre la lecture (SELECT)

1. **Nom** : "Anyone can view images"
2. **Type** : SELECT
3. **Policy definition** : 
   ```sql
   bucket_id = 'images'::text
   ```
   Cette politique permet à tout le monde de voir les images (car le bucket est public)

#### Politique 3 : Permettre la suppression (DELETE)

1. **Nom** : "Users can delete their own images"
2. **Type** : DELETE
3. **Policy definition** : 
   ```sql
   (bucket_id = 'images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
   ```
   Cette politique permet aux utilisateurs de supprimer seulement leurs propres images

### 3. Structure des Dossiers

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

### 4. Vérification

1. **Testez l'upload** :
   - Créez un projet
   - Uploadez une image
   - Vérifiez que l'image apparaît

2. **Vérifiez les permissions** :
   - Connectez-vous avec un autre compte
   - Essayez d'accéder à une image d'un autre utilisateur
   - Vous devriez pouvoir la voir (bucket public)
   - Mais vous ne devriez pas pouvoir la supprimer

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

### Erreur : "Bucket not found"

**Solution** : 
1. Vérifiez que le bucket `images` existe
2. Vérifiez que le nom est exactement `images` (sensible à la casse)

### Erreur : "The resource already exists"

**Solution** : 
- C'est normal, le fichier existe déjà
- Le service génère un nom unique, mais si cela se produit, réessayez

### Les images ne s'affichent pas

**Solution** :
1. Vérifiez que le bucket est **public**
2. Vérifiez que les politiques SELECT sont configurées
3. Vérifiez l'URL de l'image dans la console

---

## 📝 SQL pour Créer les Politiques

Si vous préférez créer les politiques via SQL Editor :

```sql
-- Politique INSERT : Users can upload their own images
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique SELECT : Anyone can view images
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Politique DELETE : Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## ✅ Checklist

- [ ] Bucket `images` créé
- [ ] Bucket configuré comme public
- [ ] Politique INSERT configurée
- [ ] Politique SELECT configurée
- [ ] Politique DELETE configurée
- [ ] Test d'upload réussi
- [ ] Images accessibles publiquement

---

**Une fois configuré, l'upload d'images fonctionnera dans les formulaires de projets et clients !** 🎉

