# 🔧 Résolution Définitive : Erreur de Permissions pour Upload d'Images

## 🎯 Problème

**Erreur** : "Erreur de permissions. Vérifiez que les politiques RLS sont configurées dans Supabase."

Cette erreur apparaît lorsque vous essayez d'uploader une image pour un projet (chantier) ou un client.

---

## ✅ Solution Automatique

### Étape 1 : Exécuter le Script de Correction

1. **Ouvrez Supabase Dashboard** → https://supabase.com/dashboard
2. **Sélectionnez votre projet** (`renmjmqlmafqjzldmsgs`)
3. **Allez dans SQL Editor** (menu de gauche)
4. **Ouvrez** : `supabase/FIX-STORAGE-PERMISSIONS-DEFINITIF.sql`
5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
6. **Collez dans SQL Editor** (Cmd+V)
7. **Cliquez sur "Run"** (Cmd+Enter ou bouton "Run")
8. **Vérifiez le résultat** :
   - `bucket_name: images` ✅
   - `is_public: true` ✅
   - `max_size_mb: 5.00` ✅
   - `policy_count: 4` ✅

**Si vous voyez ces résultats, c'est parfait ! ✅**

---

## 🔍 Vérifications Détaillées

### Vérifier le Bucket

1. **Allez dans Supabase Dashboard → Storage**
2. **Vérifiez** que le bucket `images` existe
3. **Cliquez sur le bucket** `images`
4. **Vérifiez dans Settings** :
   - ✅ **Public bucket** : Activé (ON)
   - ✅ **File size limit** : 5 MB ou plus
   - ✅ **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`

### Vérifier les Politiques RLS

1. **Dans Storage → Policies** (onglet en haut)
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can upload their own images" (INSERT)
   - ✅ "Anyone can view images" (SELECT)
   - ✅ "Users can update their own images" (UPDATE)
   - ✅ "Users can delete their own images" (DELETE)

### Vérifier la Structure des Chemins

Les images sont organisées comme suit :
```
images/
  ├── projects/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  ├── clients/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.{ext}
  └── ...
```

**Format du chemin** : `folder/userId/fileName`
- `folder` : `projects`, `clients`, `quotes`, `analysis`
- `userId` : ID de l'utilisateur connecté (UUID)
- `fileName` : Nom du fichier (timestamp-random.ext)

---

## 🧪 Tests

### Test 1 : Vérifier le Bucket (SQL)

Dans **SQL Editor**, exécutez :
```sql
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'images';
```

**Résultat attendu** :
- `name: images`
- `public: true`
- `file_size_limit: 5242880` (5MB)
- `allowed_mime_types: {image/jpeg,image/jpg,image/png,image/webp,image/gif}`

### Test 2 : Vérifier les Politiques (SQL)

Dans **SQL Editor**, exécutez :
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%images%';
```

**Résultat attendu** : 4 lignes (une pour chaque politique)

### Test 3 : Tester l'Upload dans l'Application

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Connectez-vous** si nécessaire
3. **Allez dans "Projets"**
4. **Créez un nouveau projet** ou **éditez un projet existant**
5. **Cliquez sur "Uploader une image"**
6. **Sélectionnez une image** (JPEG, PNG, WebP ou GIF, < 5MB)
7. **Vérifiez** que l'upload fonctionne sans erreur
8. **Vérifiez** que l'image s'affiche

### Test 4 : Vérifier le Chemin dans Storage

1. **Dans Supabase Dashboard → Storage → images**
2. **Vérifiez** que la structure est :
   - `projects/{votre_user_id}/{nom_fichier}`
3. **Vérifiez** que vous pouvez voir l'image
4. **Vérifiez** que l'URL publique fonctionne

---

## 🆘 Résolution des Problèmes

### Problème 1 : "Bucket not found"

**Cause** : Le bucket `images` n'existe pas.

**Solution** :
1. Exécutez `FIX-STORAGE-PERMISSIONS-DEFINITIF.sql` (il crée le bucket automatiquement)
2. Ou créez-le manuellement dans Storage → New bucket → Nom: `images` → Public: Activé

### Problème 2 : "new row violates row-level security policy"

**Cause** : Les politiques RLS ne permettent pas l'upload.

**Solution** :
1. Vérifiez que vous êtes connecté dans l'application
2. Vérifiez que les 4 politiques RLS existent
3. Vérifiez que le chemin est correct : `folder/userId/fileName`
4. Ré-exécutez `FIX-STORAGE-PERMISSIONS-DEFINITIF.sql`

### Problème 3 : "permission denied"

**Cause** : Les politiques RLS ne permettent pas l'opération.

**Solution** :
1. Vérifiez que vous êtes connecté
2. Vérifiez que les politiques RLS existent
3. Vérifiez que `(storage.foldername(name))[2] = auth.uid()::text` dans les politiques
4. Ré-exécutez le script de correction

### Problème 4 : Les images ne s'affichent pas

**Cause** : Le bucket n'est pas public ou la politique SELECT ne fonctionne pas.

**Solution** :
1. Vérifiez que le bucket est public (Settings → Public bucket → ON)
2. Vérifiez que la politique "Anyone can view images" existe
3. Vérifiez l'URL de l'image dans la console

### Problème 5 : "File size limit exceeded"

**Cause** : Le fichier est trop volumineux.

**Solution** :
1. Réduisez la taille de l'image (< 5MB)
2. Ou augmentez la limite dans Storage → Settings → File size limit

---

## 📊 Structure des Politiques RLS

Les politiques RLS vérifient que :
- `(storage.foldername(name))[2] = auth.uid()::text`
- Cela garantit que chaque utilisateur ne peut uploader que dans son propre dossier

### Politique INSERT
```sql
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

### Politique SELECT
```sql
CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');
```

### Politique UPDATE
```sql
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

### Politique DELETE
```sql
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

---

## ✅ Checklist de Vérification

- [ ] Le bucket `images` existe
- [ ] Le bucket est public
- [ ] La limite de taille est de 5MB ou plus
- [ ] Les types MIME autorisés incluent : JPEG, PNG, WebP, GIF
- [ ] RLS est activé sur `storage.objects`
- [ ] Les 4 politiques RLS existent (INSERT, SELECT, UPDATE, DELETE)
- [ ] Vous êtes connecté dans l'application
- [ ] L'image est < 5MB
- [ ] L'image est au format JPEG, PNG, WebP ou GIF
- [ ] Aucune erreur dans la console du navigateur (F12)
- [ ] L'upload fonctionne sans erreur
- [ ] L'image s'affiche après l'upload

---

## 🎯 Prochaines Étapes

Après avoir résolu le problème :

1. **Testez l'upload pour un projet** :
   - Créez un nouveau projet
   - Uploadez une image
   - Vérifiez que l'image s'affiche

2. **Testez l'upload pour un client** :
   - Créez un nouveau client
   - Uploadez une photo de profil
   - Vérifiez que la photo s'affiche

3. **Testez la suppression** :
   - Supprimez une image
   - Vérifiez qu'elle est supprimée de Storage

---

## 📚 Ressources

- **Script de correction** : `supabase/FIX-STORAGE-PERMISSIONS-DEFINITIF.sql`
- **Service de stockage** : `src/services/storageService.ts`
- **Composant d'upload** : `src/components/ImageUpload.tsx`
- **Documentation Supabase Storage** : https://supabase.com/docs/guides/storage

---

## 🔍 Debug

Si le problème persiste, vérifiez la console du navigateur (F12) :

1. **Ouvrez la console** (F12 → Console)
2. **Essayez d'uploader une image**
3. **Vérifiez les erreurs** affichées
4. **Vérifiez les logs** :
   - `Uploading image: { filePath, folder, userId, ... }`
   - `Upload error: { message, statusCode, ... }`

**Les logs affichent** :
- Le chemin du fichier (`filePath`)
- Le dossier (`folder`)
- L'ID de l'utilisateur (`userId`)
- L'ID de l'utilisateur de la session (`sessionUserId`)

**Vérifiez que** :
- `userId === sessionUserId`
- Le chemin est : `folder/userId/fileName`
- Le bucket `images` existe et est public

---

**Exécutez `supabase/FIX-STORAGE-PERMISSIONS-DEFINITIF.sql` et testez !** 🚀

