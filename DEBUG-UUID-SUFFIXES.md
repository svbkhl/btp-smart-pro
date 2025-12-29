# 🔍 Guide de débogage : UUID avec suffixes

## Problème

L'erreur `invalid input syntax for type uuid: "f1255228-15bc-40f2-ae42-01d5549418fa-mixp7l1v"` indique qu'un ID avec suffixe est utilisé directement dans une requête Supabase.

## ✅ Corrections appliquées

1. **`src/hooks/useQuotes.ts`** : Utilise `extractUUID` partout
2. **`src/services/statusTrackingService.ts`** : Utilise `extractUUID` partout
3. **`src/utils/uuidExtractor.ts`** : Ajout de logs pour détecter les IDs avec suffixe

## 🔍 Comment déboguer

### 1. Ouvrez la console du navigateur

Quand l'erreur se produit, vous devriez voir des logs comme :
- `⚠️ [extractUUID] ID avec suffixe détecté:` - Indique qu'un ID avec suffixe a été détecté
- `❌ [useQuote] Impossible d'extraire l'UUID de:` - Indique qu'un ID invalide a été passé

### 2. Vérifiez la stack trace

Les logs incluent maintenant une `stackTrace` qui vous indique d'où vient l'ID avec suffixe.

### 3. Vérifiez le Network tab

Dans l'onglet Network de la console, cherchez la requête qui échoue :
- URL : `https://renmjmqlmafqjzldmsgs.supabase.co/rest/v1/ai_quotes?select=*&id=eq.XXX`
- Si `XXX` contient un suffixe (ex: `uuid-mixxxxx`), c'est là le problème

### 4. Points à vérifier

1. **Composants qui utilisent `useQuote`** : Vérifiez qu'ils passent bien l'ID extrait
2. **Composants qui font des requêtes Supabase directes** : Vérifiez qu'ils utilisent `extractUUID`
3. **URLs avec IDs** : Vérifiez que les IDs dans les URLs sont extraits avant utilisation

## 🎯 Si l'erreur persiste

1. **Copiez le log complet** de la console (avec stack trace)
2. **Identifiez le composant** qui fait la requête (via stack trace)
3. **Vérifiez que ce composant utilise `extractUUID`** avant de faire la requête

## 📝 Fichiers à vérifier

- `src/hooks/useQuotes.ts` ✅ (utilise extractUUID)
- `src/services/statusTrackingService.ts` ✅ (utilise extractUUID)
- `src/pages/SignatureQuote.tsx` ✅ (utilise extractUUID)
- `src/pages/QuotePage.tsx` ✅ (utilise extractUUID)
- `src/pages/SignaturePage.tsx` ✅ (utilise extractUUID)
- `src/pages/PaymentPage.tsx` ✅ (utilise extractUUID)

Si l'erreur persiste, les logs vous indiqueront exactement d'où vient le problème.





