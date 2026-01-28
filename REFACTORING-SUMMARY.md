# 🚀 REFACTORING COMPLET - useCompanyId Hook

## ✅ CE QUI A ÉTÉ FAIT

### 1. Création du Hook Central
- ✅ **`src/hooks/useCompanyId.ts`** créé avec:
  - Cache React Query automatique
  - Support multi-entreprises via localStorage
  - Gestion d'erreurs complète
  - Vérifications de sécurité

### 2. Refactoring des Fichiers Principaux
- ✅ **`src/hooks/useClients.ts`** - Complètement refactorisé
  - Supprimé: `useState`, `useEffect`, `getCurrentCompanyId`
  - Ajouté: `useCompanyId()` hook
  - Résultat: **454 → 397 lignes** (-57 lignes)

- ✅ **`src/components/CompanySelector.tsx`** - Simplifié
  - Utilise maintenant `useCompanyId()` directement

- ✅ **`src/utils/companyHelpers.ts`** - Marqué comme déprécié
  - Exports redirigés vers `useCompanyId`
  - Fonction `getCurrentCompanyId` conservée pour compatibilité

### 3. Imports Mis à Jour
- ✅ **`src/hooks/useProjects.ts`** - Import mis à jour
- ✅ **`src/hooks/useInvoices.ts`** - Import mis à jour
- ✅ **`src/hooks/useQuotes.ts`** - Import mis à jour
- ✅ **`src/hooks/useEmployees.ts`** - Import mis à jour
- ✅ **`src/hooks/useNotifications.ts`** - Import mis à jour

## 🔄 CE QUI RESTE À FAIRE

### Hooks à Refactoriser (Pattern identique)
Les fichiers suivants ont l'import mis à jour mais conservent le pattern `useState/useEffect`:

1. **`src/hooks/useInvoices.ts`** (ligne 106-112)
2. **`src/hooks/useQuotes.ts`** (ligne 89-95)
3. **`src/hooks/useEmployees.ts`** (ligne 49-55)
4. **`src/hooks/useNotifications.ts`** (ligne 61-67)
5. **`src/hooks/useUserStats.ts`** (ligne 28-34)

**Pattern à remplacer:**
```typescript
const [companyId, setCompanyId] = useState<string | null>(null);

useEffect(() => {
  if (user && !fakeDataEnabled) {
    getCurrentCompanyId(user.id).then(setCompanyId);
  }
}, [user?.id, fakeDataEnabled]);
```

**Par:**
```typescript
const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();
```

Et dans le `useQuery`:
```typescript
enabled: !!user && !isLoadingCompanyId && (!!companyId || fakeDataEnabled),
```

### Autres Fichiers à Vérifier
- `src/hooks/useDetailedQuotes.ts`
- `src/hooks/useUserSettings.ts`
- `src/hooks/useCompanySettings.ts`
- `src/hooks/useQuoteLineLibrary.ts`
- `src/hooks/useQuoteSectionLibrary.ts`
- `src/hooks/useQuoteLines.ts`
- `src/hooks/useQuoteSections.ts`
- `src/hooks/useMaterialsPriceCatalog.ts`
- `src/services/simpleQuoteService.ts`
- `src/services/archiveService.ts`
- `src/components/quotes/DetailedQuoteEditor.tsx`
- `src/components/quotes/QuoteActionButtons.tsx`
- `src/components/invoices/DetailedInvoiceEditor.tsx`
- `src/components/ai/AIQuoteGenerator.tsx`
- `src/utils/resolveLinePrice.ts`

## 📊 AVANTAGES DU NOUVEAU SYSTÈME

### Avant (❌ Ancien Pattern)
```typescript
const [companyId, setCompanyId] = useState<string | null>(null);

useEffect(() => {
  if (user && !fakeDataEnabled) {
    getCurrentCompanyId(user.id).then(setCompanyId);
  }
}, [user?.id, fakeDataEnabled]);

// 8 lignes de code dupliqué dans chaque hook
// Pas de cache
// Pas de gestion d'erreurs
// Difficile à maintenir
```

### Après (✅ Nouveau Pattern)
```typescript
const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

// 1 ligne de code
// ✅ Cache React Query automatique
// ✅ Gestion d'erreurs intégrée
// ✅ Support multi-entreprises
// ✅ Facile à maintenir
```

## 🎯 PROCHAINES ÉTAPES

1. **Test dans le navigateur**
   - Vérifier que `useClients` fonctionne correctement
   - Tester le `CompanySelector`
   - Vérifier le cache React Query

2. **Refactoriser les hooks restants**
   - Appliquer le même pattern aux 5 hooks listés ci-dessus
   - Vérifier les services et composants

3. **Supprimer le code obsolète**
   - Une fois tous les fichiers migrés, supprimer `getCurrentCompanyId` de `companyHelpers.ts`

## 📝 INSTRUCTIONS POUR LA MIGRATION

Pour migrer un hook:

1. Remplacer l'import:
```typescript
// AVANT
import { getCurrentCompanyId } from "@/utils/companyHelpers";

// APRÈS
import { useCompanyId } from "./useCompanyId";
import { logger } from "@/utils/logger";
```

2. Remplacer le state/effect:
```typescript
// AVANT
const [companyId, setCompanyId] = useState<string | null>(null);
useEffect(() => {
  if (user && !fakeDataEnabled) {
    getCurrentCompanyId(user.id).then(setCompanyId);
  }
}, [user?.id, fakeDataEnabled]);

// APRÈS
const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();
```

3. Supprimer les appels à `getCurrentCompanyId` dans le `queryFn`:
```typescript
// AVANT
const currentCompanyId = companyId || await getCurrentCompanyId(user.id);

// APRÈS
// companyId est déjà disponible, pas besoin d'appel async
```

4. Mettre à jour `enabled`:
```typescript
// AVANT
enabled: !!user && (!!companyId || fakeDataEnabled),

// APRÈS
enabled: !!user && !isLoadingCompanyId && (!!companyId || fakeDataEnabled),
```

5. Remplacer `console.warn/log` par `logger`:
```typescript
// AVANT
console.warn("User is not a member of any company");

// APRÈS
logger.warn("User is not a member of any company", { userId: user.id });
```

---

**Créé le:** 2026-01-23  
**Statut:** En cours  
**Prochaine action:** Compléter la migration des 5 hooks restants
