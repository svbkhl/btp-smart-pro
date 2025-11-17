# 🚀 Guide Rapide : Configurer Supabase Storage

## ⚡ Configuration en 2 Étapes

### Étape 1 : Créer le Bucket (Interface Web)

1. **Ouvrez Supabase Dashboard** : https://supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans "Storage"** (📦 dans le menu de gauche)
4. **Cliquez sur "New bucket"**
5. **Configurez le bucket** :
   - **Name** : `images` (exactement comme ça, en minuscules)
   - **Public bucket** : ✅ **Activé** (très important !)
   - **File size limit** : `5242880` (5 MB) ou plus
   - **Allowed MIME types** : `image/jpeg,image/jpg,image/png,image/webp,image/gif`
6. **Cliquez sur "Create bucket"**

### Étape 2 : Configurer les Politiques (SQL)

1. **Dans Supabase**, allez dans **SQL Editor** (💬 dans le menu)
2. **Cliquez sur "New query"**
3. **Ouvrez le fichier** : `supabase/CONFIGURE-STORAGE.sql`
4. **Copiez TOUT le contenu** (Cmd+A, Cmd+C)
5. **Collez dans l'éditeur SQL** (Cmd+V)
6. **Cliquez sur "Run"** ou appuyez sur Cmd+Enter
7. **Vérifiez** qu'il n'y a pas d'erreurs

---

## ✅ Vérification

### Vérifier le Bucket

1. **Dans Storage**, vous devriez voir le bucket `images`
2. **Cliquez dessus** pour voir les dossiers

### Vérifier les Politiques

1. **Dans Storage** > **Policies** (onglet en haut)
2. **Vous devriez voir 4 politiques** :
   - ✅ "Users can upload their own images"
   - ✅ "Anyone can view images"
   - ✅ "Users can delete their own images"
   - ✅ "Users can update their own images"

### Tester l'Upload

1. **Dans l'application**, créez un projet
2. **Uploadez une image**
3. **Vérifiez** que l'image apparaît

---

## 🆘 Problèmes Courants

### Erreur : "Bucket not found"

**Solution** : Vérifiez que le bucket `images` existe et que le nom est exactement `images` (sensible à la casse).

### Erreur : "new row violates row-level security policy"

**Solution** : Vérifiez que les politiques RLS sont correctement créées. Ré-exécutez le script SQL.

### Les images ne s'affichent pas

**Solution** :
1. Vérifiez que le bucket est **public**
2. Vérifiez que la politique SELECT est créée
3. Vérifiez l'URL de l'image dans la console

### Erreur lors de l'upload

**Solution** :
1. Vérifiez que vous êtes connecté
2. Vérifiez que la politique INSERT est créée
3. Vérifiez la taille du fichier (max 5MB)

---

## 📝 Structure des Dossiers

Après l'upload, vos images seront organisées comme suit :

```
images/
  ├── projects/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.jpg
  ├── clients/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.jpg
  ├── quotes/
  │   └── {user_id}/
  │       └── {timestamp}-{random}.jpg
  └── analysis/
      └── {user_id}/
          └── {timestamp}-{random}.jpg
```

---

## ✅ Checklist

- [ ] Bucket `images` créé dans Supabase
- [ ] Bucket configuré comme public
- [ ] Script SQL exécuté
- [ ] 4 politiques créées
- [ ] Test d'upload réussi
- [ ] Images accessibles publiquement

---

## 🎉 C'est Fait !

Une fois ces 2 étapes terminées, l'upload d'images fonctionnera dans votre application ! 🚀

**Besoin d'aide ?** Consultez `CONFIGURATION-STORAGE.md` pour plus de détails.

