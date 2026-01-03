# ✅ Guide de Vérification - Lien de Signature

## 📋 Vérifications Automatiques

### 1️⃣ Edge Function `send-email`

**Fichier** : `supabase/functions/send-email/index.ts`

**Vérifications** :
- ✅ Génère le lien avec le format : `${APP_URL}/sign/${quote_id}`
- ✅ Utilise `APP_URL` ou `VITE_APP_URL` depuis les variables d'environnement
- ✅ Ajoute le bouton de signature dans le HTML si `quote_id` est fourni
- ✅ Ajoute le lien dans la version texte si `quote_id` est fourni

**Code vérifié** :
```typescript
// Ligne 175-181
if (quote_id) {
  const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL") || "https://btpsmartpro.com";
  signatureUrl = `${APP_URL}/sign/${quote_id}`;
  console.log("📝 [send-email] Lien de signature généré:", signatureUrl);
}
```

### 2️⃣ Route React

**Fichier** : `src/App.tsx`

**Vérifications** :
- ✅ Route `/sign/:quoteId` ajoutée
- ✅ Import de `SignaturePage` présent
- ✅ Route placée dans les routes publiques

**Code vérifié** :
```tsx
// Ligne 65
<Route path="/sign/:quoteId" element={<SignaturePage />} />
```

### 3️⃣ Page de Signature

**Fichier** : `src/pages/SignaturePage.tsx`

**Vérifications** :
- ✅ Utilise `useParams()` pour récupérer `quoteId`
- ✅ Charge le devis depuis `ai_quotes` avec `quoteId`
- ✅ Affiche le bouton "Signer"
- ✅ Met à jour `ai_quotes` avec `signed = true` et `signed_at = now()`
- ✅ Gère les cas d'erreur (devis introuvable, déjà signé)

**Code vérifié** :
```typescript
// Récupération du quoteId
const { quoteId } = useParams<{ quoteId: string }>();

// Mise à jour après signature
await supabase
  .from("ai_quotes")
  .update({
    signed: true,
    signed_at: new Date().toISOString(),
    status: "signed",
  })
  .eq("id", quoteId);
```

---

## 🧪 Tests à Effectuer

### Test 1 : Génération du Lien

1. Envoyez un email avec `quote_id` via l'Edge Function `send-email`
2. Vérifiez les logs : `📝 [send-email] Lien de signature généré: https://btpsmartpro.com/sign/QUOTE_ID`
3. Vérifiez que le HTML contient le bouton de signature

### Test 2 : Accès à la Page

1. Ouvrez le lien : `https://btpsmartpro.com/sign/QUOTE_ID`
2. Vérifiez que la page se charge sans erreur 404
3. Vérifiez que le devis s'affiche correctement

### Test 3 : Signature

1. Cliquez sur "Signer le devis"
2. Vérifiez que `ai_quotes.signed = true`
3. Vérifiez que `ai_quotes.signed_at` est renseigné
4. Vérifiez que le message de confirmation s'affiche

### Test 4 : Déjà Signé

1. Ouvrez un lien de devis déjà signé
2. Vérifiez que le message "Document déjà signé" s'affiche
3. Vérifiez que le bouton de signature est désactivé

---

## 🔧 Configuration Requise

### Variables d'Environnement

Dans **Supabase Dashboard → Settings → Edge Functions → Secrets** :

```
APP_URL = https://btpsmartpro.com
```

Ou :

```
VITE_APP_URL = https://btpsmartpro.com
```

---

## ✅ Checklist Finale

- [ ] Edge Function génère le lien avec `/sign/:quoteId`
- [ ] Route `/sign/:quoteId` ajoutée dans `App.tsx`
- [ ] `SignaturePage.tsx` créée et fonctionnelle
- [ ] Variable `APP_URL` configurée dans Supabase Secrets
- [ ] Test d'envoi d'email réussi
- [ ] Test d'accès à la page réussi (pas de 404)
- [ ] Test de signature réussi
- [ ] Test de devis déjà signé réussi

---

**Une fois toutes les vérifications effectuées, le système de signature devrait fonctionner sans erreur 404 !** 🎉











