# 🧹 Scripts de Nettoyage du Codebase

## 🚀 Démarrage rapide

### Nettoyage complet (recommandé)

```bash
# 1. Rendre le script exécutable (si nécessaire)
chmod +x scripts/cleanup-all.sh

# 2. Exécuter le nettoyage complet
npm run cleanup:all
```

### Commandes individuelles

```bash
# Vérifier les appels API (sécurité)
npm run check-api

# Nettoyer le code (détection)
npm run cleanup

# Nettoyer le code (avec corrections)
npm run cleanup:fix

# Formater le code
npm run format

# Vérifier TypeScript
npm run type-check

# Linter avec corrections
npm run lint:fix
```

## 📋 Ce que font les scripts

### ✅ Détection et suppression du code mort
- Imports non utilisés
- Exports non utilisés
- Variables non utilisées

### ✅ Organisation des fichiers
- Structure standardisée
- Groupement par fonctionnalité
- Séparation UI / logique métier

### ✅ Nettoyage TypeScript
- Remplacement des `any` par des types appropriés
- Organisation des imports
- Standardisation du code

### ✅ Vérifications de sécurité
- Aucune clé `service_role` dans le frontend
- Gestion d'erreurs sur tous les appels API
- Vérification des Edge Functions

### ✅ Standardisation UI
- Toasts cohérents
- Boutons avec variants
- Formulaires standardisés

## 🔍 Vérifications critiques

### 1. Clés service_role
**⚠️ CRITIQUE :** Aucune clé `service_role` ne doit être dans le frontend.

```bash
npm run check-api
```

Si détecté, déplacer vers une Edge Function.

### 2. Gestion d'erreurs
Tous les appels API doivent avoir un `try/catch` ou vérifier `error`.

```typescript
// ❌ Mauvais
const { data } = await supabase.from('users').select();

// ✅ Bon
try {
  const { data, error } = await supabase.from('users').select();
  if (error) throw error;
} catch (error) {
  toast.error('Erreur');
}
```

## 📁 Structure cible

```
src/
├── pages/              # Pages (routes)
├── components/
│   ├── ui/             # Composants UI (shadcn)
│   ├── layout/         # Layouts
│   ├── forms/          # Formulaires
│   ├── dialogs/        # Dialogs
│   └── ...
├── hooks/              # Hooks React
├── services/           # Services métier
├── utils/              # Utilitaires
└── types/              # Types TS
```

## 🎯 Workflow recommandé

### Avant chaque commit

```bash
# 1. Vérifier les appels API
npm run check-api

# 2. Nettoyer le code
npm run cleanup:fix

# 3. Formater
npm run format

# 4. Vérifier TypeScript
npm run type-check
```

### Nettoyage initial (une fois)

```bash
# Exécuter le script complet
npm run cleanup:all

# Réorganiser les fichiers (optionnel)
npm run organize:fix
```

## 📚 Documentation complète

- **Guide détaillé :** `docs/CLEANUP-GUIDE.md`
- **Résumé :** `docs/CLEANUP-SUMMARY.md`

## 🆘 Problèmes courants

### "tsx: command not found"
```bash
npm install -g tsx
# ou
npm install -D tsx
```

### "Permission denied" sur cleanup-all.sh
```bash
chmod +x scripts/cleanup-all.sh
```

### Scripts trop lents
Utilisez `--dry-run` pour tester sans modifier :
```bash
tsx scripts/cleanup-codebase.ts --dry-run
```

## ✅ Checklist finale

- [ ] Aucune clé `service_role` dans le frontend
- [ ] Tous les appels API ont une gestion d'erreur
- [ ] Aucun import non utilisé
- [ ] Aucun `any` (ou justifié)
- [ ] Code formaté avec Prettier
- [ ] Pas d'erreurs TypeScript
- [ ] Toasts utilisés pour les actions utilisateur

---

**💡 Astuce :** Exécutez `npm run cleanup:all` régulièrement pour maintenir le code propre !







