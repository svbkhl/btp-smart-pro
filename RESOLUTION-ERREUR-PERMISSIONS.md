# 🔧 Résolution : Erreur de Permissions Storage

## 🎯 Problème

Erreur : "Erreur de permissions. Vérifiez que les politiques RLS sont configurées dans Supabase."

## ✅ Solution Automatique

### Étape 1 : Exécuter le Script SQL

1. **Ouvrez Supabase Dashboard** :
   https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs

2. **Allez dans SQL Editor** (💬 dans le menu)

3. **Cliquez sur "New query"**

4. **Ouvrez le fichier** : `supabase/FIX-PERMISSIONS-STORAGE.sql`

5. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)

6. **Collez dans SQL Editor** (Cmd+V)

7. **Cliquez sur "Run"** (ou Cmd+Enter)

8. **Vérifiez le résultat** :
   - `bucket_exists: 1`
   - `is_public: true`
   - `policies_count: 4`

**Si vous voyez ça, c'est parfait ! ✅**

---

## 🔍 Vérifications Manuelles

### Vérifier le Bucket

1. **Allez dans Storage** dans Supabase Dashboard
2. **Vérifiez** que le bucket `images` existe
3. **Cliquez sur le bucket** `images`
4. **Allez dans Settings**
5. **Vérifiez** :
   - ✅ **Public bucket** : Activé (très important !)
   - ✅ **File size limit** : 5 MB ou plus
   - ✅ **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`

### Vérifier les Politiques RLS

1. **Dans Storage → Policies** (onglet en haut)
2. **Vérifiez** que 4 politiques existent :
   - ✅ "Users can upload their own images" (INSERT)
   - ✅ "Anyone can view images" (SELECT)
   - ✅ "Users can delete their own images" (DELETE)
   - ✅ "Users can update their own images" (UPDATE)

---

## 🧪 Test

### Test 1 : Vérifier les Politiques

Dans **SQL Editor**, exécutez :
```sql
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%';
```

Vous devriez voir **4 politiques**.

### Test 2 : Tester l'Upload

1. **Rechargez l'application** (F5 ou Cmd+R)
2. **Créez un projet** ou un client
3. **Uploadez une image** (petite, < 1MB)
4. **Vérifiez** que l'image s'affiche

---

## 🆘 Si le Problème Persiste

### Erreur : "Bucket not found"

**Solution** :
1. Créez le bucket `images` dans Storage → New bucket
2. Configurez-le comme public
3. Ré-exécutez le script SQL

### Erreur : "new row violates row-level security policy"

**Solution** :
1. Ré-exécutez `supabase/FIX-PERMISSIONS-STORAGE.sql`
2. Vérifiez que vous êtes connecté dans l'application
3. Vérifiez que le bucket est public

### Les politiques n'apparaissent pas

**Solution** :
1. Vérifiez que le script SQL s'est exécuté sans erreur
2. Rechargez la page Storage → Policies
3. Ré-exécutez le script SQL

---

## 📊 Structure des Chemins

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

**Les politiques RLS vérifient** :
- `(storage.foldername(name))[2] = auth.uid()::text`
- Cela garantit que l'utilisateur ne peut uploader que dans son propre dossier

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

Si le problème persiste, **dites-moi le message d'erreur exact** affiché dans l'application.

---

**Exécutez `supabase/FIX-PERMISSIONS-STORAGE.sql` et testez !** 🚀

