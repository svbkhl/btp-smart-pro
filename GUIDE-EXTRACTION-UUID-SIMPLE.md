# Guide Simple : Extraction d'UUID pour Récupération de Devis

## ⚠️ Problème avec `match()[0]`

Le code suivant peut **échouer** si le match retourne `null` :

```javascript
// ❌ DANGEREUX : Peut causer une erreur si match retourne null
const validUuid = rawId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)[0]
// TypeError: Cannot read property '0' of null
```

## ✅ Solution Robuste

### Option 1 : Utiliser la fonction utilitaire (Recommandé)

```typescript
import { extractUUID } from '@/utils/uuidExtractor';

const rawId = "0e74a1bf-0178-4d8d-ad4f-a6e1297bae6b-mixads3x";
const validUuid = extractUUID(rawId);

if (!validUuid) {
  console.error('Format d\'ID invalide');
  return;
}

// Utiliser validUuid pour la requête Supabase
const { data } = await supabase
  .from('ai_quotes')
  .select('*')
  .eq('id', validUuid)
  .single();
```

### Option 2 : Version inline avec gestion d'erreur

```javascript
// ✅ SÉCURISÉ : Vérifie que match ne retourne pas null
const uuidMatch = rawId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
const validUuid = uuidMatch ? uuidMatch[0] : null;

if (!validUuid) {
  console.error('Impossible d\'extraire l\'UUID');
  return;
}
```

### Option 3 : Utiliser `slice()` (Plus simple mais moins robuste)

```javascript
// ✅ SIMPLE : Extrait les 36 premiers caractères
// Mais ne valide pas le format UUID
const validUuid = rawId.length >= 36 ? rawId.slice(0, 36) : null;

// Vérifier le format après extraction
if (!validUuid || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(validUuid)) {
  console.error('Format UUID invalide');
  return;
}
```

## Exemple Complet

```typescript
import { createClient } from '@supabase/supabase-js';
import { extractUUID } from '@/utils/uuidExtractor';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rawId = "0e74a1bf-0178-4d8d-ad4f-a6e1297bae6b-mixads3x";

// ✅ Extraction robuste
const validUuid = extractUUID(rawId);

if (!validUuid) {
  console.error('❌ Format d\'ID invalide');
  return;
}

// Récupérer le devis
async function getQuote() {
  const { data, error } = await supabase
    .from('ai_quotes')
    .select('*')
    .eq('id', validUuid) // Utiliser l'UUID extrait
    .single();

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log('✅ Devis récupéré:', data);
}

getQuote();
```

## Avantages de la Fonction `extractUUID()`

1. ✅ **Robuste** : Gère tous les cas (avec/sans suffixe, format invalide)
2. ✅ **Validé** : Vérifie le format UUID
3. ✅ **Sécurisé** : Ne plante jamais (retourne `null` si invalide)
4. ✅ **Réutilisable** : Fonction centralisée dans `src/utils/uuidExtractor.ts`
5. ✅ **Testé** : Utilisée dans tout le projet

## Scripts Disponibles

- `scripts/get-quote-simple.ts` - Version TypeScript avec gestion d'erreur complète
- `scripts/get-quote-simple.js` - Version JavaScript standalone
- `scripts/get-quote-example.ts` - Version avec exemples avancés (pagination, etc.)

## Notes Importantes

- ⚠️ **Ne jamais** utiliser `match()[0]` sans vérifier si `match()` retourne `null`
- ✅ **Toujours** utiliser `extractUUID()` ou vérifier le résultat de `match()`
- ✅ **Toujours** valider que l'UUID extrait n'est pas `null` avant de l'utiliser
- ✅ **Toujours** gérer les erreurs si l'UUID est invalide





