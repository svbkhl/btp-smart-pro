# Rapport : Création de lien de paiement

## 1. Fonction réellement appelée

Le frontend appelle **deux** Edge Functions selon le type de paiement :

| Type de paiement | Fonction appelée | Fichier frontend |
|------------------|------------------|-------------------|
| **Total** ou **Acompte** | `create-payment-link` | `src/components/payments/CreatePaymentLinkDialog.tsx` |
| **En plusieurs fois** (installments) | `create-payment-link-v2` | `src/components/payments/CreatePaymentLinkDialog.tsx` |

**Nom de la fonction** : variable `functionName` = `paymentType === 'installments' ? 'create-payment-link-v2' : 'create-payment-link'`.

---

## 2. Contenu de CreatePaymentLinkDialog.tsx (ligne 136)

```tsx
// Lignes 119-121 : choix de la fonction
const functionName = paymentType === 'installments' 
  ? 'create-payment-link-v2' 
  : 'create-payment-link';

// Lignes 126-136 : URL et appel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// ...
const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  body: JSON.stringify(requestBody),
});
```

**URL appelée** : `https://<VITE_SUPABASE_URL>/functions/v1/create-payment-link` ou `.../functions/v1/create-payment-link-v2`.

---

## 3. Liste des Edge Functions (paiements et connexes)

Fonctions liées aux paiements dans `supabase/functions/` :

| Fonction | Rôle |
|----------|------|
| **create-payment-link** | Lien Stripe (total / acompte) – **appelée par le dialog** |
| **create-payment-link-v2** | Lien Stripe + échéances (installments) – **appelée par le dialog** |
| create-payment-session | Session de paiement |
| create-public-payment-session | Session publique |
| payment-webhook | Webhook Stripe |
| send-payment-link-email | Envoi email avec lien |
| send-payment-link-after-signature | Lien après signature |
| stripe-create-payment-link | Autre implémentation (utilisée par `emailTemplateService.ts`) |
| stripe-webhook | Webhook Stripe |
| stripe-connect-callback | Callback Stripe Connect |

Les deux fonctions **réellement utilisées** par `CreatePaymentLinkDialog.tsx` sont **create-payment-link** et **create-payment-link-v2**.

---

## 4. Corrections appliquées

### 4.1 Helper `getCompanyId()` (créé dans `_shared/auth.ts`)

- **Fichier** : `supabase/functions/_shared/auth.ts`
- **Rôle** : Retourne `company_id` à partir de `quote.company_id` si présent, sinon via la table `company_users` pour l’utilisateur.
- **Signature** : `getCompanyId(supabase, userId, quoteCompanyId?) => Promise<string | null>`

### 4.2 `create-payment-link`

- **Import** : `getCompanyId` ajouté depuis `../_shared/auth.ts`.
- **company_id** : Après récupération du devis, résolution de `company_id` avec `getCompanyId(supabaseClient, user.id, quote.company_id)`. Si `null`, réponse 400 "User has no company assigned".
- **Suppression** : Ancien bloc manuel (quote + company_users) remplacé par l’appel à `getCompanyId`.
- **CORS** : Bloc `catch` renforcé (`err: unknown`, accès sécurisés à `message`/`stack`) pour toujours renvoyer une réponse JSON avec en-têtes CORS, même en cas d’erreur.

### 4.3 `create-payment-link-v2`

- **Import** : `getCompanyId` depuis `../_shared/auth.ts`.
- **company_id** : Après vérification du devis signé, appel à `getCompanyId(supabaseClient, user.id, quote.company_id)`. Si `null`, réponse 400 "User has no company assigned".
- **Utilisation de `companyId`** :
  - Insert facture : `company_id: companyId`
  - RPC `generate_payment_schedule` : `p_company_id: companyId`
  - Insert paiement : `company_id: companyId`

---

## 5. Vérifications (syntaxe, imports, déploiement)

- **Syntaxe TypeScript** : Aucune erreur de lint sur les fichiers modifiés.
- **Imports** : `create-payment-link` et `create-payment-link-v2` importent `getCompanyId` depuis `../_shared/auth.ts` ; `_shared/auth.ts` importe `createClient` (pour le type du 1er argument de `getCompanyId`).
- **Déploiement** : À faire après ces changements :

```bash
# Déployer les deux fonctions
supabase functions deploy create-payment-link
supabase functions deploy create-payment-link-v2
```

Les deux fonctions partagent désormais la même logique `company_id` via `getCompanyId()`, ce qui évite les erreurs "null value in column company_id" et améliore la gestion des erreurs (réponse toujours renvoyée avec CORS).
