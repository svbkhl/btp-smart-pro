# ✅ Vérification Storage - Bucket "images" Existant

## 🎉 Bonne Nouvelle

Le bucket `images` existe déjà ! Il ne reste plus qu'à vérifier et appliquer les politiques RLS.

---

## 📋 Étapes à Suivre

### Étape 1 : Vérifier les Politiques RLS (5 min)

Dans **Supabase Dashboard → SQL Editor**, exécutez :

```sql
-- Vérifier les politiques existantes pour le bucket images
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%images%'
ORDER BY policyname;
```

**Résultat attendu** : 4 politiques

Si vous voyez **4 politiques**, c'est bon ! ✅
Si vous voyez **moins de 4 politiques**, continuez à l'étape 2.

---

### Étape 2 : Appliquer les Politiques RLS (5 min)

Si les politiques ne sont pas toutes là, exécutez le script :

1. **Dans Supabase**, allez dans **SQL Editor**

2. **Cliquez sur "New query"**

3. **Ouvrez le fichier** : `supabase/CONFIGURE-STORAGE.sql`

4. **Copiez-collez** tout le contenu dans SQL Editor

5. **Cliquez sur "Run"**

Ce script va :
- Supprimer les anciennes politiques (si elles existent)
- Créer les 4 nouvelles politiques nécessaires

---

### Étape 3 : Vérifier le Bucket (2 min)

Dans **SQL Editor**, exécutez :

```sql
-- Vérifier que le bucket est public
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'images';
```

**Vérifiez** :
- ✅ `public` = `true` (très important !)
- ✅ `file_size_limit` = `5242880` (5 MB) ou plus
- ✅ `allowed_mime_types` contient les types d'images

---

### Étape 4 : Tester l'Upload (5 min)

1. **Dans l'application**, créez un nouveau projet

2. **Uploadez une image** dans le formulaire

3. **Vérifiez** que :
   - L'image s'upload correctement
   - L'image s'affiche dans le formulaire
   - Pas d'erreur dans la console

---

## ✅ Checklist

- [ ] Bucket `images` existe (déjà fait ✅)
- [ ] 4 politiques RLS configurées
- [ ] Bucket est public (`public = true`)
- [ ] Test d'upload réussi

---

## 🆘 Si Problème

### Erreur : "new row violates row-level security policy"

**Solution** : Les politiques RLS ne sont pas correctement configurées. Ré-exécutez `supabase/CONFIGURE-STORAGE.sql`.

### Erreur : "Bucket not found"

**Solution** : Vérifiez que le nom du bucket est exactement `images` (sensible à la casse).

### Les images ne s'affichent pas

**Solution** : Vérifiez que le bucket est **public** (`public = true`).

---

## 🎯 Prochaine Étape

Une fois les politiques vérifiées/appliquées :

1. **Testez l'upload** d'image dans l'application
2. **Passez à l'étape suivante** : Vérifier les tables

---

**Consultez `ETAPES-SUIVANTES.md` pour la suite !** 📄

