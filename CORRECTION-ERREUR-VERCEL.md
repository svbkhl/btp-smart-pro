# 🔧 Correction Erreur Vercel - Noms de Variables

## ❌ Erreur
```
The name contains invalid characters. Only letters, digits, and underscores are allowed. 
Furthermore, the name should not start with a digit.
```

## ✅ Solution

### Règles pour les NOMS de variables :
- ✅ **Autorisés** : Lettres (A-Z, a-z), Chiffres (0-9), Underscores (_)
- ❌ **Interdits** : Espaces, Tirets (-), Caractères spéciaux (!@#$%^&*)

### ❌ Exemples INCORRECTS :
```
VITE-SUPABASE-URL          ❌ (tirets interdits)
VITE SUPABASE URL         ❌ (espaces interdits)
VITE_SUPABASE_URL = ...   ❌ (ne mets PAS le signe = dans le nom)
```

### ✅ Exemples CORRECTS :
```
VITE_SUPABASE_URL         ✅
VITE_SUPABASE_PUBLISHABLE_KEY  ✅
PUBLIC_URL                ✅
```

---

## 📝 Comment Ajouter Correctement dans Vercel

### Étape par Étape :

1. **Clique sur "Environment Variables"**
2. **Clique sur "Add"** ou le bouton "+"
3. **Dans le champ "Name"** (Nom) :
   - ✅ Copie **EXACTEMENT** : `VITE_SUPABASE_URL`
   - ❌ Ne mets PAS : `VITE_SUPABASE_URL =` (sans le signe =)
   - ❌ Ne mets PAS : `VITE-SUPABASE-URL` (sans tirets)
   - ❌ Ne mets PAS d'espaces avant ou après

4. **Dans le champ "Value"** (Valeur) :
   - ✅ Mets : `https://renmjmqlmafqjzldmsgs.supabase.co`
   - ❌ Ne mets PAS de guillemets autour

5. **Coche les environnements** : Production, Preview, Development
6. **Clique sur "Save"**

---

## 📋 Liste des Noms CORRECTS à Copier

Copie-colle **EXACTEMENT** ces noms (sans espaces, sans tirets) :

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
PUBLIC_URL
PRODUCTION_URL
VITE_PUBLIC_URL
```

---

## 🎯 Exemple Visuel

### ✅ CORRECT :
```
Name:  VITE_SUPABASE_URL
Value: https://renmjmqlmafqjzldmsgs.supabase.co
```

### ❌ INCORRECT :
```
Name:  VITE-SUPABASE-URL          ❌ (tirets)
Name:  VITE_SUPABASE_URL =        ❌ (signe =)
Name:  VITE SUPABASE URL          ❌ (espaces)
Name:  vite_supabase_url          ⚠️ (minuscules OK mais pas standard)
```

---

## 💡 Astuce

Si tu as déjà ajouté une variable avec un mauvais nom :
1. **Supprime-la** (bouton poubelle)
2. **Réajoute-la** avec le bon nom

---

## ✅ Checklist

Avant de cliquer sur "Save", vérifie :
- [ ] Le nom ne contient QUE des lettres, chiffres et underscores
- [ ] Le nom ne commence PAS par un chiffre
- [ ] Il n'y a PAS d'espaces dans le nom
- [ ] Il n'y a PAS de tirets (-) dans le nom
- [ ] Il n'y a PAS de signe = dans le nom
- [ ] La valeur est correcte (URL ou clé)

---

**🎯 Résumé** : Utilise **UNIQUEMENT** des underscores (_) pour séparer les mots, jamais de tirets ou d'espaces !















