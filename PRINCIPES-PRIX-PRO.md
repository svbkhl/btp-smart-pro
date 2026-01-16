# 🎯 PRINCIPES PRIX PRO - MOTEUR DE DEVIS

## ✅ IMPLÉMENTATION COMPLÈTE

### ORDRE DE PRIORITÉ (NON NÉGOCIABLE)

Lors de la résolution du prix d'une ligne de devis, le système suit **TOUJOURS** cet ordre :

1. **📚 BIBLIOTHÈQUE** (Prix déjà utilisé par l'entreprise)
   - Source : `quote_line_library.default_unit_price_ht`
   - Priorité absolue : Si l'entreprise a déjà utilisé ce prix, on le réutilise
   - Mise à jour : Chaque utilisation incrémente `times_used` et met à jour `last_used_at`

2. **📊 CATALOGUE INTERNE** (Prix moyens de référence)
   - Source : `materials_price_catalog.avg_unit_price_ht`
   - Recherche : D'abord company-specific, puis global
   - Uniquement pour : Matériaux (`category = 'material'`)
   - Stable : Pas de scraping web, prix indicatifs

3. **🤖 ESTIMATION IA** (Fallback uniquement)
   - Source : Estimation basique selon unité
   - Utilisation : Uniquement si bibliothèque ET catalogue n'ont rien
   - Conservatrice : Valeurs par défaut très basses (20€/m², 15€/ml, etc.)
   - Validation : L'utilisateur DOIT valider/modifier

4. **✏️ MANUEL** (Par défaut)
   - Si aucune source n'a fourni de prix
   - L'utilisateur saisit manuellement
   - Le prix saisi est ensuite mémorisé dans la bibliothèque

## 🔧 FONCTION CENTRALISÉE

**Fichier** : `src/utils/resolveLinePrice.ts`

```typescript
resolveLinePrice(
  label: string,
  category: "labor" | "material" | "service" | "other" | null,
  unit: string | null,
  userId: string,
  existingLibraryPrice?: number | null
): Promise<ResolvedPrice>
```

**Retourne** :
- `price`: Prix résolu (ou `null` si manuel requis)
- `source`: "library" | "catalog" | "ai_estimate" | "manual"
- `sourceDetails`: Détails de la source (ID bibliothèque, ID catalogue, etc.)

## 📍 UTILISATION

### 1. Création ligne depuis bibliothèque
```typescript
// QuoteLinesEditor.tsx - handleAddFromLibrary()
const resolvedPrice = await resolvePriceFromLibrary(libraryItem.id, user.id);
// Si pas de prix library, cherche dans catalogue/IA
if (!resolvedPrice?.price) {
  resolvedPrice = await resolveLinePrice(...);
}
```

### 2. Création ligne manuelle
```typescript
// QuoteLinesEditor.tsx - handleAddNewLine()
if (!finalPrice && newLine.label.trim()) {
  const resolved = await resolveLinePrice(
    newLine.label.trim(),
    newLine.category || null,
    newLine.unit || null,
    user.id
  );
  finalPrice = resolved.price;
  finalPriceSource = mapSource(resolved.source);
}
```

### 3. Génération IA (Edge Function)
```typescript
// generate-quote/index.ts
const resolvePriceForLine = async (line: any) => {
  // 1) Prix IA fourni → marquer comme ai_estimate
  if (line.unit_price_ht) return { price: line.unit_price_ht, source: 'ai_estimate' };
  
  // 2) Bibliothèque
  const libraryItem = await checkLibrary(...);
  if (libraryItem?.default_unit_price_ht) return { price: ..., source: 'library' };
  
  // 3) Catalogue (matériaux uniquement)
  if (line.category === 'material') {
    const catalogPrice = await checkCatalog(...);
    if (catalogPrice) return { price: ..., source: 'catalog' };
  }
  
  // 4) Fallback estimation basique
  return { price: defaultEstimate, source: 'ai_estimate' };
};
```

## 🎨 INDICATEURS VISUELS

Dans `QuoteLinesEditor`, chaque ligne affiche la source du prix :

- **📚 Bibliothèque** : Prix déjà utilisé par l'entreprise
- **📊 Catalogue** : Prix du catalogue interne
- **🤖 Estimation** : Estimation IA (fallback)
- **✏️ Manuel** : Prix saisi manuellement

Affichage sous le total HT de chaque ligne.

## 🔒 GARANTIES

✅ **Aucune dépendance API externe** : Tout est interne
✅ **Prix toujours modifiables** : L'utilisateur peut toujours éditer
✅ **Mémoire des prix** : Chaque prix utilisé est mémorisé
✅ **IA uniquement fallback** : Jamais source principale
✅ **Traçabilité** : Chaque prix a une source enregistrée
✅ **Stabilité** : Pas de recalcul automatique sans action utilisateur

## 📊 FLUX COMPLET

```
Utilisateur crée une ligne
    ↓
1. Chercher dans bibliothèque (company_id + label_normalized)
    ↓ (si trouvé)
   ✅ Utiliser prix bibliothèque (source: "library")
    ↓ (si non trouvé)
2. Chercher dans catalogue (si material + unit)
    ↓ (si trouvé)
   ✅ Utiliser prix catalogue (source: "catalog")
    ↓ (si non trouvé)
3. Estimation basique selon unité
    ↓
   ⚠️ Utiliser estimation (source: "ai_estimate")
   → L'utilisateur DOIT valider/modifier
    ↓ (si aucune source)
4. Prix manuel requis
    ↓
   ✏️ L'utilisateur saisit manuellement (source: "manual")
    ↓
5. Mémoriser dans bibliothèque
   → Incrémenter times_used
   → Mettre à jour last_used_at
```

## 🚫 CE QUI N'EST PAS FAIT

❌ Scraping web de prix
❌ API externe de pricing
❌ Recalcul automatique des prix existants
❌ IA comme source principale
❌ Prix non modifiables

## ✅ VALIDATION

- ✅ Fonction `resolveLinePrice()` implémentée
- ✅ Ordre de priorité respecté partout
- ✅ Edge Function utilise résolution prix
- ✅ QuoteLinesEditor utilise résolution prix
- ✅ Indicateurs visuels ajoutés
- ✅ Source du prix stockée en DB (`price_source`)
- ✅ Bibliothèque mémorise les prix utilisés

**STATUS** : ✅ **CONFORME AUX PRINCIPES PRO**
