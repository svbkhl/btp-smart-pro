# ✅ CORRECTION InviteUserDialog.tsx

## 🔍 PROBLÈMES DANS LE CODE FOURNI

Le code fourni a plusieurs problèmes :

1. ❌ **Manque les champs requis** : `company_id`, `role`, `invited_by`
2. ❌ **Utilise `createClient` directement** au lieu du client Supabase existant
3. ❌ **Manque l'authentification** : Pas de `user.id` pour `invited_by`
4. ❌ **Utilise `JSON.stringify()`** : Supabase le fait automatiquement
5. ❌ **Manque les validations** : Email, companyId, user
6. ❌ **Manque les composants UI** : Dialog, etc.

## ✅ CODE CORRIGÉ

### Différences principales :

1. ✅ **Utilise le client Supabase existant** :
```typescript
import { supabase } from '@/integrations/supabase/client';
```

2. ✅ **Inclut TOUS les champs requis** :
```typescript
const requestBody = {
  email: email.trim().toLowerCase(),
  company_id: companyId.trim(),      // ✅ Ajouté
  role: (role || 'member').trim(),    // ✅ Ajouté
  invited_by: user.id,                // ✅ Ajouté
};
```

3. ✅ **Utilise `useAuth()` pour obtenir l'utilisateur** :
```typescript
const { user } = useAuth();
```

4. ✅ **Ne PAS utiliser `JSON.stringify()`** :
```typescript
// ❌ MAUVAIS
body: JSON.stringify(payload),

// ✅ BON
body: requestBody,  // Supabase sérialise automatiquement
```

5. ✅ **Validation complète** :
```typescript
if (!isCompanyIdReady) { ... }
if (!email || !email.includes('@')) { ... }
if (!user || !user.id) { ... }
```

6. ✅ **Gestion d'erreurs détaillée** :
```typescript
if (data.error) {
  errorMsg = data.error;
  if (data.details) {
    errorMsg += `: ${data.details}`;
  }
  if (data.suggestion) {
    errorMsg += ` (${data.suggestion})`;
  }
}
```

## 📋 STRUCTURE COMPLÈTE

### Props requises :
```typescript
interface InviteUserDialogProps {
  companyId: string;        // ✅ Requis
  companyName: string;      // ✅ Requis
  defaultRole?: 'owner' | 'admin' | 'member';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}
```

### Body envoyé à la fonction :
```typescript
{
  email: string,           // ✅ Requis
  company_id: string,      // ✅ Requis
  role: string,            // ✅ Requis ('owner' | 'admin' | 'member')
  invited_by: string      // ✅ Requis (user.id)
}
```

## 🚀 UTILISATION

```tsx
<InviteUserDialog
  companyId={company.id}
  companyName={company.name}
  defaultRole="owner"
  trigger={
    <Button>
      Inviter dirigeant
    </Button>
  }
  onSuccess={() => {
    // Rafraîchir la liste
  }}
/>
```

## ⚠️ POINTS IMPORTANTS

1. **Ne PAS utiliser `JSON.stringify()`** : Supabase le fait automatiquement
2. **Ne PAS ajouter les headers manuellement** : Supabase ajoute `Authorization` et `Content-Type` automatiquement
3. **`invited_by` DOIT être `user.id`** : La policy RLS vérifie que `invited_by = auth.uid()`
4. **Tous les champs sont requis** : email, company_id, role, invited_by

## ✅ RÉSULTAT

Le code corrigé :
- ✅ Envoie tous les champs requis
- ✅ Utilise le client Supabase existant
- ✅ Gère l'authentification correctement
- ✅ Affiche les erreurs détaillées
- ✅ Utilise les composants UI existants












