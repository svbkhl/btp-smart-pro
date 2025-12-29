# Guide d'Extraction d'UUID pour les Devis

## Problème

Les liens de signature dans les emails contiennent un UUID suivi d'un suffixe de sécurité :
```
https://www.btpsmartpro.com/sign/63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d
```

L'UUID réel stocké dans Supabase est toujours les **36 premiers caractères** :
```
63bd2333-b130-4bf2-b25f-c7e194e588e8
```

Le suffixe `-mix72c7d` est ajouté pour la sécurité (ID public non devinable).

## Solution : Fonction d'Extraction Robuste

### Méthode Simple (Non Recommandée)

```javascript
// ❌ Fragile : suppose que le suffixe commence toujours par "-mix"
const validUuid = rawId.split('-mix')[0];
```

**Problèmes :**
- Ne fonctionne que si le suffixe commence par `-mix`
- Échoue si le format du suffixe change
- Ne valide pas le format UUID

### Méthode Robuste (Recommandée)

```javascript
/**
 * Extrait l'UUID d'un ID qui peut contenir un suffixe de sécurité
 * Format accepté: "uuid" ou "uuid-suffix"
 */
function extractUUID(rawId) {
  if (!rawId) return null;
  
  // Méthode 1: Extraire les 36 premiers caractères (format UUID standard)
  if (rawId.length >= 36) {
    const uuid = rawId.slice(0, 36);
    // Vérifier que c'est un UUID valide
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return uuid;
    }
  }
  
  // Méthode 2: Utiliser une regex pour trouver l'UUID dans la chaîne
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    return uuidMatch[0];
  }
  
  // Si aucune méthode ne fonctionne, retourner l'ID original s'il est un UUID valide
  return rawId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawId) 
    ? rawId 
    : null;
}
```

**Avantages :**
- ✅ Fonctionne avec n'importe quel suffixe
- ✅ Valide le format UUID
- ✅ Supporte les UUID propres (sans suffixe)
- ✅ Retourne `null` pour les IDs invalides

## Utilisation

### Dans le Frontend (React/TypeScript)

```typescript
import { extractUUID } from '@/utils/uuidExtractor';

const { quoteId: rawQuoteId } = useParams<{ quoteId: string }>();
const quoteId = rawQuoteId ? extractUUID(rawQuoteId) : null;

if (!quoteId) {
  // Gérer l'erreur : format invalide
  return <ErrorPage message="Format d'ID invalide" />;
}

// Utiliser quoteId pour la requête Supabase
const { data } = await supabase
  .from('ai_quotes')
  .select('*')
  .eq('id', quoteId)
  .single();
```

### Dans les Edge Functions (Deno)

```typescript
function extractUUID(rawId: string): string | null {
  if (!rawId) return null;
  
  if (rawId.length >= 36) {
    const uuid = rawId.slice(0, 36);
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return uuid;
    }
  }
  
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
  return uuidMatch?.[0] || null;
}

// Dans la fonction
const body = await req.json();
let { quote_id } = body;

if (quote_id) {
  const extractedUUID = extractUUID(quote_id);
  if (extractedUUID) {
    quote_id = extractedUUID;
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid quote_id format' }),
      { status: 400 }
    );
  }
}
```

### Script de Test

Un script de test est disponible dans `scripts/test-quote-extraction.js` :

```bash
# Avec Node.js
VITE_SUPABASE_ANON_KEY=your_key node scripts/test-quote-extraction.js

# Ou avec TypeScript
npx tsx scripts/test-quote-extraction.ts
```

## Tests

La fonction `extractUUID` est testée avec :

1. ✅ UUID avec suffixe : `"63bd2333-b130-4bf2-b25f-c7e194e588e8-mix72c7d"` → `"63bd2333-b130-4bf2-b25f-c7e194e588e8"`
2. ✅ UUID propre : `"63bd2333-b130-4bf2-b25f-c7e194e588e8"` → `"63bd2333-b130-4bf2-b25f-c7e194e588e8"`
3. ✅ UUID avec suffixe différent : `"63bd2333-b130-4bf2-b25f-c7e194e588e8-abc123xyz"` → `"63bd2333-b130-4bf2-b25f-c7e194e588e8"`
4. ✅ ID invalide : `"invalid-id"` → `null`

## Où est Utilisée Cette Fonction ?

1. **`src/pages/SignaturePage.tsx`** - Page de signature publique
2. **`supabase/functions/get-public-document/index.ts`** - Edge Function pour récupérer les documents publics
3. **`supabase/functions/sign-quote/index.ts`** - Edge Function pour signer un devis

## Notes Importantes

- ⚠️ **Ne jamais** utiliser `split('-mix')[0]` - trop fragile
- ✅ **Toujours** utiliser la fonction `extractUUID()` robuste
- ✅ **Toujours** valider que l'UUID extrait n'est pas `null` avant de l'utiliser
- ✅ **Toujours** gérer les erreurs si l'UUID est invalide





