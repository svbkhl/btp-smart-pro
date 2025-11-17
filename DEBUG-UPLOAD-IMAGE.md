# 🔍 Debug : Erreur lors de l'Upload d'Image

## 🎯 Problème

Erreur lors de l'upload d'une photo dans l'application.

## 🔧 Causes Possibles

1. **Bucket "images" n'existe pas**
2. **Bucket n'est pas public**
3. **Politiques RLS mal configurées**
4. **Structure de chemin incorrecte**
5. **Permissions insuffisantes**

---

## 🚀 Solution Automatique

### Étape 1 : Exécuter le Script SQL de Correction

1. **Ouvrez Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans SQL Editor** (💬 dans le menu)

3. **Cliquez sur "New query"**

4. **Ouvrez le fichier** : `supabase/FIX-STORAGE-UPLOAD.sql`

5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)

6. **Collez dans SQL Editor** (Cmd+V)

7. **Cliquez sur "Run"** (ou Cmd+Enter)

8. **Vérifiez le résultat** :
   - `bucket_exists: 1`
   - `is_public: true`
   - `policies_count: 4`

**Si vous voyez ça, c'est parfait ! ✅**

---

## 🔍 Diagnostic Manuel

### Vérifier le Bucket

1. **Allez dans Supabase Dashboard → Storage**
2. **Vérifiez** que le bucket `images` existe
3. **Cliquez sur le bucket** `images`
4. **Vérifiez** dans Settings :
   - ✅ **Public bucket** : Activé
   - ✅ **File size limit** : 5 MB ou plus
   - ✅ **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`

### Vérifier les Politiques RLS

1. **Dans Storage → Policies** (onglet en haut)
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can upload their own images" (INSERT)
   - ✅ "Anyone can view images" (SELECT)
   - ✅ "Users can delete their own images" (DELETE)
   - ✅ "Users can update their own images" (UPDATE)

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
- `folder` : projects, clients, quotes, analysis
- `userId` : ID de l'utilisateur connecté
- `fileName` : Nom du fichier (timestamp-random.ext)

---

## 🆘 Erreurs Courantes

### Erreur : "Bucket not found"

**Solution** :
1. Créez le bucket `images` dans Storage → New bucket
2. Configurez-le comme public
3. Ré-exécutez le script SQL

### Erreur : "new row violates row-level security policy"

**Solution** :
1. Vérifiez que les politiques RLS existent
2. Ré-exécutez `supabase/FIX-STORAGE-UPLOAD.sql`
3. Vérifiez que vous êtes connecté dans l'application

### Erreur : "File size limit exceeded"

**Solution** :
1. Réduisez la taille de l'image (max 5MB)
2. Ou augmentez la limite dans Storage → Settings → File size limit

### Les images ne s'affichent pas

**Solution** :
1. Vérifiez que le bucket est public
2. Vérifiez que la politique "Anyone can view images" existe
3. Vérifiez l'URL de l'image dans la console (F12)

---

## 🧪 Test

### Test 1 : Vérifier le Bucket

Dans **SQL Editor**, exécutez :
```sql
SELECT * FROM storage.buckets WHERE name = 'images';
```

Vous devriez voir une ligne avec `public: true`.

### Test 2 : Vérifier les Politiques

Dans **SQL Editor**, exécutez :
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';
```

Vous devriez voir 4 politiques.

### Test 3 : Tester l'Upload

1. **Dans l'application**, créez un projet
2. **Uploadez une image** (petite, < 1MB)
3. **Vérifiez** que l'image s'affiche

---

## 📊 Logs de Debug

Le code affiche maintenant des logs détaillés dans la console :
- Chemin du fichier
- Taille du fichier
- Type de fichier
- Erreurs détaillées

**Pour voir les logs** :
1. Ouvrez la console du navigateur (F12)
2. Allez dans l'onglet "Console"
3. Essayez d'uploader une image
4. Regardez les messages

---

## ✅ Checklist

- [ ] Le bucket `images` existe
- [ ] Le bucket est public
- [ ] Les 4 politiques RLS existent
- [ ] Vous êtes connecté dans l'application
- [ ] L'image est < 5MB
- [ ] L'image est au format JPEG, PNG, WebP ou GIF
- [ ] Aucune erreur dans la console

---

## 🎯 Prochaine Étape

Après avoir exécuté le script SQL :

1. **Rechargez l'application**
2. **Testez l'upload d'une image**
3. **Vérifiez** que l'image s'affiche

Si le problème persiste, **dites-moi le message d'erreur exact** affiché dans l'application ou dans la console.

---

**Exécutez `supabase/FIX-STORAGE-UPLOAD.sql` et testez !** 🚀

