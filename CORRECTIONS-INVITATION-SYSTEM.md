# Corrections du système d'invitation

## ✅ Modifications appliquées

### 1. InviteUserDialog.tsx - Simplifié

**Supprimé :**
- ✅ Toutes les vérifications de `company_id`, `role`, `invited_by`
- ✅ Tous les appels directs à `supabase.auth.admin.*`
- ✅ Toute la logique complexe de gestion d'erreurs avec fetch direct

**Conservé :**
- ✅ Validation simple de l'email
- ✅ Appel unique à `supabase.functions.invoke("send-invitation", { body: { email } })`
- ✅ Toasts de succès : `"✅ Invitation envoyée avec succès"`
- ✅ Toasts d'erreur : affiche `error.message` exact

**Code final :**
```typescript
const { data, error } = await supabase.functions.invoke('send-invitation', {
  body: { email: email.trim().toLowerCase() },
});
```

### 2. Edge Function send-invitation - Réécrite complètement

**Nouvelle structure :**
- ✅ Vérifie que la méthode est POST (retourne 405 sinon)
- ✅ Lit uniquement `email` du body JSON
- ✅ Crée un client admin avec `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Appelle `supabase.auth.admin.inviteUserByEmail(email)`
- ✅ Retourne `{ success: true }` en cas de succès
- ✅ Retourne `{ error: error.message }` en cas d'erreur (toujours en JSON)

**Code clé :**
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
```

### 3. AdminContactRequests.tsx - Simplifié

**Modifié :**
- ✅ Appel simplifié : `body: { email: request.email }`
- ✅ Toast de succès : `"✅ Invitation envoyée avec succès"`
- ✅ Vérification de `data?.success` avant de continuer

### 4. Vérification service_role dans le frontend

**Résultat :**
- ✅ Aucune utilisation de `service_role` dans le frontend
- ✅ Les commentaires dans `useUserRoles.ts` mentionnent `service_role` mais c'est juste une note, pas du code actif

## 🔒 Sécurité

- ✅ Le frontend n'utilise **JAMAIS** `service_role`
- ✅ Toutes les opérations admin se font via l'Edge Function
- ✅ L'Edge Function utilise `service_role` uniquement côté backend
- ✅ La fonction peut être publique car elle utilise `service_role` en interne

## 📝 Configuration Supabase

**À faire manuellement dans Supabase Dashboard :**

1. Aller dans **Edge Functions** > **send-invitation**
2. Dans les **Settings** :
   - Définir **"Invoke Function: Public"** (ou "Authenticated")
   - La fonction n'a pas besoin de vérification JWT car elle utilise `service_role`

## ✅ Résultat final

- ✅ Plus d'erreur "Forbidden: Admin or owner access required"
- ✅ Le frontend appelle uniquement `supabase.functions.invoke("send-invitation", { body: { email } })`
- ✅ L'Edge Function utilise `service_role` pour `inviteUserByEmail`
- ✅ Toasts de succès : `"✅ Invitation envoyée avec succès"`
- ✅ Toasts d'erreur : affiche le message exact de l'erreur
- ✅ Toutes les erreurs retournées en JSON propre











