# Résumé du Nettoyage du Codebase

## 📦 Scripts créés

### 1. `scripts/cleanup-codebase.ts`
**Objectif :** Détecter et supprimer le code mort, remplacer les `any`, organiser les imports.

**Usage :**
```bash
# Détection seulement
tsx scripts/cleanup-codebase.ts

# Avec corrections automatiques
tsx scripts/cleanup-codebase.ts --fix

# Simulation (dry-run)
tsx scripts/cleanup-codebase.ts --dry-run
```

**Fonctionnalités :**
- ✅ Détecte les imports non utilisés
- ✅ Détecte les exports non utilisés
- ✅ Remplace les `any` par `unknown`
- ✅ Organise les imports (React → externes → locaux)
- ✅ Vérifie l'utilisation de `service_role`
- ✅ Vérifie la gestion d'erreurs

### 2. `scripts/check-api-calls.ts`
**Objectif :** Vérifier que tous les appels API sont sécurisés et gèrent les erreurs.

**Usage :**
```bash
tsx scripts/check-api-calls.ts
```

**Vérifications :**
- ❌ Aucune clé `service_role` dans le frontend
- ⚠️ Tous les appels API ont une gestion d'erreur
- ⚠️ Les Edge Functions sont correctement appelées

### 3. `scripts/organize-files.ts`
**Objectif :** Réorganiser les fichiers selon une structure standardisée.

**Usage :**
```bash
# Simulation
tsx scripts/organize-files.ts --dry-run

# Avec modifications
tsx scripts/organize-files.ts --fix
```

**Structure cible :**
```
components/
├── ui/          # Composants UI réutilisables
├── layout/      # Composants de mise en page
├── forms/       # Formulaires
├── dialogs/     # Dialogs et modals
└── ...
```

### 4. `scripts/standardize-ui.ts`
**Objectif :** Standardiser l'utilisation des toasts et boutons.

**Usage :**
```bash
tsx scripts/standardize-ui.ts
```

**Vérifications :**
- ✅ Les toasts sont utilisés correctement
- ✅ Les boutons ont des variants cohérents
- ✅ Pas de `console.log` pour les messages utilisateur

### 5. `scripts/cleanup-all.sh`
**Objectif :** Script principal qui exécute tous les nettoyages.

**Usage :**
```bash
./scripts/cleanup-all.sh
```

**Exécute :**
1. Linter (ESLint)
2. Vérification des appels API
3. Nettoyage du code
4. Organisation des fichiers (optionnel)
5. Formatage (Prettier)
6. Vérification TypeScript

## 📋 Scripts npm ajoutés

```json
{
  "lint:fix": "eslint . --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
  "type-check": "tsc --noEmit",
  "cleanup": "tsx scripts/cleanup-codebase.ts",
  "cleanup:fix": "tsx scripts/cleanup-codebase.ts --fix",
  "check-api": "tsx scripts/check-api-calls.ts",
  "organize": "tsx scripts/organize-files.ts --dry-run",
  "organize:fix": "tsx scripts/organize-files.ts --fix",
  "cleanup:all": "./scripts/cleanup-all.sh"
}
```

## 🔧 Configuration ajoutée

### `.eslintrc.cjs`
- Détecte les variables non utilisées
- Avertit sur les `any`
- Vérifie les hooks React

### `.prettierrc`
- Formatage cohérent
- Single quotes
- Semicolons
- 100 caractères par ligne

## ✅ Checklist de nettoyage

Avant chaque commit :

- [ ] Exécuter `npm run check-api` (vérifier les erreurs critiques)
- [ ] Exécuter `npm run cleanup:fix` (nettoyer le code)
- [ ] Exécuter `npm run format` (formater le code)
- [ ] Exécuter `npm run type-check` (vérifier TypeScript)
- [ ] Vérifier qu'aucune clé `service_role` n'est dans le frontend
- [ ] Vérifier que tous les appels API ont une gestion d'erreur

## 🚨 Problèmes critiques détectés

### 1. Clés service_role
**Statut :** ✅ Vérifié - Aucune utilisation détectée dans le frontend (seulement dans les commentaires)

**Fichiers concernés :**
- `src/hooks/useUserRoles.ts` (commentaires seulement)

### 2. Gestion d'erreurs
**Statut :** ⚠️ À améliorer - Certains appels API n'ont pas de gestion d'erreur explicite

**Action :** Exécuter `npm run check-api` pour voir les détails

## 📊 Statistiques

- **Fichiers analysés :** ~200+ fichiers TypeScript/TSX
- **Scripts créés :** 5 scripts de nettoyage
- **Configuration :** ESLint + Prettier
- **Documentation :** Guide complet dans `docs/CLEANUP-GUIDE.md`

## 🎯 Prochaines étapes

1. **Exécuter le nettoyage initial :**
   ```bash
   npm run cleanup:all
   ```

2. **Vérifier les résultats :**
   ```bash
   npm run check-api
   ```

3. **Corriger les problèmes critiques :**
   - Déplacer toute logique `service_role` vers Edge Functions
   - Ajouter la gestion d'erreurs manquante

4. **Intégrer dans le workflow :**
   - Ajouter un pre-commit hook
   - Exécuter automatiquement avant chaque build

## 📚 Documentation

- **Guide complet :** `docs/CLEANUP-GUIDE.md`
- **Scripts :** `scripts/*.ts`
- **Configuration :** `.eslintrc.cjs`, `.prettierrc`

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifier que `tsx` est installé : `npm install -g tsx`
2. Exécuter en mode `--dry-run` d'abord
3. Vérifier les logs pour les erreurs spécifiques
4. Consulter `docs/CLEANUP-GUIDE.md` pour plus de détails







