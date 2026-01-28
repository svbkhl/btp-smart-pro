# 🧪 Instructions pour Exécuter les Tests

## ✅ Configuration Terminée

Les fichiers de configuration ont été mis à jour :
- ✅ `vitest.config.ts` - Configuration Vitest
- ✅ `tests/setup.ts` - Chargement des variables d'environnement
- ✅ `package.json` - Scripts de test ajoutés

---

## 🚀 Exécution des Tests

### Étape 0 : Vérifier les Variables d'Environnement (IMPORTANT)

```bash
npm run test:check-env
```

✅ Si vous voyez "TOUT EST BON", passez à l'étape suivante.  
❌ Si des variables manquent, ajoutez-les à votre fichier `.env`.

### Option 1 : Tous les Tests Multi-tenant

```bash
npm run test:multi-tenant
```

### Option 2 : Mode Watch (recommandé pour debug)

```bash
npm run test
```

### Option 3 : Avec Interface UI

```bash
npm run test:ui
```

---

## 🔧 Si les Tests Échouent Encore

### Problème : Variables d'environnement manquantes

Si vous voyez encore l'erreur `Missing Supabase credentials`, vérifiez que votre fichier `.env` contient :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

### Solution Alternative : Utiliser .env.local

Si vous utilisez `.env.local` au lieu de `.env`, créez un fichier `.env.test` :

```bash
cp .env.local .env.test
```

Puis modifiez `vitest.config.ts` pour utiliser `.env.test`.

---

## 📊 Résultats Attendus

### ✅ Tests Passants (Idéal)

```
✓ CLIENTS - Read Isolation (500ms)
✓ CLIENTS - Write Isolation (450ms)
✓ CLIENTS - Update Isolation (480ms)
✓ CLIENTS - Delete Isolation (520ms)
✓ PROJECTS - CRUD Isolation (600ms)
✓ INVOICES - CRUD Isolation (550ms)
✓ QUOTES - CRUD Isolation (580ms)
✓ RLS - Direct Query (400ms)
✓ EXPLOITATION - Bypass Attempts (350ms)

Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  5.2s
```

### ❌ Tests Échouants (Problème de Sécurité)

Si des tests échouent, consultez `GUIDE-TESTS-MULTI-TENANT.md` pour les corrections.

---

## 🐛 Debug

### Activer les Logs Verbeux

```bash
npm run test -- --reporter=verbose
```

### Tester un Seul Test

```bash
npm run test -- -t "CLIENTS - Read Isolation"
```

### Vérifier les Variables d'Environnement

Les variables seront affichées au début des tests :

```
✓ Variables d'environnement chargées pour les tests
  - VITE_SUPABASE_URL: ✓
  - VITE_SUPABASE_ANON_KEY: ✓
```

Si vous voyez des ✗, vérifiez votre fichier `.env`.

---

## 🆘 Problèmes Connus

### 1. Port 4000 Already in Use

```bash
# Tuer le processus
lsof -ti:4000 | xargs kill -9

# Puis relancer
npm run dev
```

### 2. Permission Errors avec npm

Si `npm install` échoue avec `EPERM`, essayez :

```bash
# Corriger les permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Ou utiliser nvm/n pour Node.js sans sudo
```

### 3. Tests ne Trouvent pas Supabase

Vérifiez que votre fichier `.env` existe et contient les bonnes variables :

```bash
cat .env | grep VITE_SUPABASE
```

---

## ✅ Checklist Finale

Avant de considérer les tests comme opérationnels :

- [ ] Vitest installé (`npm list vitest`)
- [ ] Variables d'environnement dans `.env`
- [ ] `npm run test:multi-tenant` s'exécute sans erreur
- [ ] Au moins 1 test passe (même si d'autres échouent)
- [ ] Rapport de test généré

---

**Dernière mise à jour** : 25 janvier 2026  
**Status** : ✅ Configuration prête
