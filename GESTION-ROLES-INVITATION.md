# ✅ Gestion des Rôles dans les Invitations

## 🔧 Corrections Appliquées

### 1. ✅ Envoi du Rôle depuis le Frontend

**Avant :**
```typescript
const requestBody = { email: emailToSend };
// Le rôle n'était pas envoyé
```

**Après :**
```typescript
const requestBody = { 
  email: emailToSend,
  role: role, // 'owner' | 'admin' | 'member'
  companyId: companyId
};
```

### 2. ✅ Validation du Rôle dans l'Edge Function

**Schema Zod mis à jour :**
```typescript
export const sendInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member']).optional(),
  companyId: uuidSchema.optional(),
});
```

### 3. ✅ Mapping des Rôles Frontend → Backend

**Mapping automatique :**
```typescript
const roleMapping = {
  owner: 'dirigeant',        // Frontend → Backend
  admin: 'administrateur',   // Frontend → Backend
  member: 'salarie'          // Frontend → Backend
};
```

### 4. ✅ Assignation du Rôle après Invitation

**Pour nouveaux utilisateurs :**
- Après `inviteUserByEmail` réussi
- Insertion dans `user_roles` avec le rôle mappé
- Si `companyId` fourni → insertion dans `company_users`

**Pour utilisateurs existants :**
- Après `generateLink` type "magiclink" réussi
- Mise à jour du rôle dans `user_roles` (via `listUsers` pour trouver l'utilisateur)
- Si `companyId` fourni → mise à jour dans `company_users`

## 📋 Rôles Disponibles

### Frontend (Interface)
- `owner` → **Propriétaire (Owner)**
- `admin` → **Administrateur (Admin)**
- `member` → **Membre (Member)**

### Backend (Base de données)
- `dirigeant` → Équivalent à `owner`
- `administrateur` → Équivalent à `admin`
- `salarie` → Équivalent à `member`
- `client` → Rôle client (non utilisé dans les invitations)

## 🔄 Flux Complet

```
1. Utilisateur sélectionne un rôle dans l'interface
   └─> Frontend envoie { email, role, companyId }

2. Edge Function reçoit la requête
   └─> Validation Zod
   └─> Mapping role frontend → role backend

3. Tentative d'invitation
   ├─> Nouvel utilisateur
   │   └─> inviteUserByEmail()
   │   └─> Assignation rôle dans user_roles
   │   └─> Si companyId → insertion dans company_users
   │
   └─> Utilisateur existant (email_exists)
       └─> generateLink(type: 'magiclink')
       └─> Mise à jour rôle dans user_roles
       └─> Si companyId → mise à jour dans company_users
```

## ✅ Résultat

- ✅ Le rôle sélectionné est bien envoyé à l'Edge Function
- ✅ Le rôle est mappé correctement (frontend → backend)
- ✅ Le rôle est assigné après l'invitation (nouveaux utilisateurs)
- ✅ Le rôle est mis à jour pour les utilisateurs existants
- ✅ L'utilisateur est lié à l'entreprise si `companyId` est fourni

## 🧪 Test

1. **Inviter un nouvel utilisateur avec rôle "Propriétaire"**
   - Vérifier dans `user_roles` : rôle = `dirigeant`
   - Si `companyId` fourni : vérifier dans `company_users`

2. **Inviter un utilisateur existant avec rôle "Administrateur"**
   - Vérifier que le rôle est mis à jour à `administrateur`
   - Vérifier que `company_users` est mis à jour si `companyId` fourni


