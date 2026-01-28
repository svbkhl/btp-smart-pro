# ⚡ FIX RAPIDE - Tests Multi-tenant

## 🎯 Problème

Les tests échouent avec : `Missing Supabase credentials in environment variables`

## ✅ Solution en 3 Étapes

### Étape 1 : Vérifier les Variables

```bash
npm run test:check-env
```

**Résultat attendu :**
```
✅ TOUT EST BON ! Les tests devraient fonctionner.
```

**Si vous voyez des ❌**, passez à l'étape 2.

---

### Étape 2 : Vérifier votre Fichier .env

Ouvrez votre fichier `.env` (dans le dossier racine du projet) et vérifiez qu'il contient :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Si le fichier n'existe pas :**

1. Copiez `.env.template` vers `.env`
2. Remplissez les valeurs depuis votre dashboard Supabase

---

### Étape 3 : Réexécuter les Tests

```bash
npm run test:multi-tenant
```

**Résultat attendu :**

```
🔧 Setup des tests - Variables d'environnement:
  ✅ VITE_SUPABASE_URL: ✓ Chargée
  ✅ VITE_SUPABASE_ANON_KEY: ✓ Chargée

✓ CLIENTS - Read Isolation (500ms)
✓ CLIENTS - Write Isolation (450ms)
...
✓ 9/9 tests passed
```

---

## 🔧 Si Ça Ne Marche Toujours Pas

### Option A : Créer un .env.test

```bash
# Copier votre .env
cp .env .env.test

# Vérifier
npm run test:check-env
```

### Option B : Variables Directement dans le Terminal

```bash
export VITE_SUPABASE_URL="https://votre-projet.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1..."

npm run test:multi-tenant
```

### Option C : Exécuter le Script de Diagnostic Avancé

```bash
node tests/check-env.js
```

Cela vous montrera exactement quels fichiers .env sont trouvés et quelles variables sont chargées.

---

## 📋 Checklist de Debug

- [ ] Le fichier `.env` existe à la racine du projet
- [ ] Le fichier contient `VITE_SUPABASE_URL=...`
- [ ] Le fichier contient `VITE_SUPABASE_ANON_KEY=...`
- [ ] Les valeurs ne sont pas entre guillemets (ou sont entre guillemets simples/doubles)
- [ ] Pas d'espaces avant/après le `=`
- [ ] `npm run test:check-env` affiche ✅ pour les deux variables

---

## 💡 Astuce

Si vous n'êtes pas sûr du contenu de votre `.env`, exécutez :

```bash
cat .env | grep VITE_SUPABASE
```

Vous devriez voir vos deux variables.

---

**Date** : 25 janvier 2026  
**Status** : ✅ Correction appliquée
