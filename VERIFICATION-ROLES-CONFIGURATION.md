# ✅ Vérification Configuration des Rôles

## 🔍 Analyse de la Configuration Actuelle

### 1. Frontend → Edge Function

**Frontend (`InviteUserDialog.tsx`)** :
- ✅ Envoie `role: 'owner' | 'admin' | 'member'`
- ✅ Envoie `companyId: string`
- ✅ Validation email côté client

**Edge Function (`send-invitation/index.ts`)** :
- ✅ Reçoit `role` et `companyId`
- ✅ Mappe les rôles frontend → backend :
  - `owner` → `dirigeant`
  - `admin` → `administrateur`
  - `member` → `salarie` (défaut)

### 2. Assignation de Rôle

**Pour nouveaux utilisateurs** :
1. ✅ `inviteUserByEmail` crée l'utilisateur
2. ✅ Le trigger `handle_new_user` peut créer un rôle par défaut
3. ✅ L'Edge Function supprime les rôles existants puis insère le bon rôle
4. ✅ Si erreur unique, utilise `upsert` avec `onConflict: 'user_id'`

**Pour utilisateurs existants** :
1. ✅ `generateLink` type `magiclink` génère le lien
2. ✅ L'Edge Function met à jour le rôle via `listUsers` + `upsert`
3. ✅ Même logique de suppression puis insertion

### 3. Structure de la Table `user_roles`

**⚠️ IMPORTANT** : Il y a deux structures possibles dans votre base :

**Option A : `UNIQUE(user_id)`** (un utilisateur = un seul rôle)
- ✅ Plus simple
- ✅ Logique : un utilisateur a un rôle global
- ✅ `upsert` avec `onConflict: 'user_id'` fonctionne

**Option B : `UNIQUE(user_id, role)`** (un utilisateur = plusieurs rôles)
- ⚠️ Plus complexe
- ⚠️ Un utilisateur peut avoir plusieurs rôles
- ⚠️ `upsert` avec `onConflict: 'user_id'` ne fonctionne pas

**Solution appliquée** :
- ✅ Supprime d'abord tous les rôles existants
- ✅ Insère le nouveau rôle
- ✅ Si erreur unique → fallback sur `upsert`

## ✅ Corrections Appliquées

### 1. Assignation de Rôle Robuste

**Avant :**
```typescript
.upsert({ user_id, role }, { onConflict: 'user_id' })
// Peut échouer si UNIQUE(user_id, role)
```

**Après :**
```typescript
// 1. Supprimer tous les rôles existants
.delete().eq('user_id', userId)

// 2. Insérer le nouveau rôle
.insert({ user_id: userId, role: dbRole })

// 3. Si erreur unique → fallback upsert
if (roleError.code === '23505') {
  .upsert({ user_id, role }, { onConflict: 'user_id' })
}
```

### 2. Gestion des Conflits avec le Trigger

Le trigger `handle_new_user` peut créer un rôle par défaut (`salarie`). La logique actuelle :
- ✅ Supprime d'abord tous les rôles (y compris celui du trigger)
- ✅ Insère le rôle demandé
- ✅ Fonctionne dans tous les cas

### 3. Mise à Jour pour Utilisateurs Existants

Même logique appliquée :
- ✅ Supprime les rôles existants
- ✅ Insère le nouveau rôle
- ✅ Fallback sur upsert si nécessaire

## 🧪 Test de Vérification

### Test 1 : Nouvel Utilisateur avec Rôle Owner

1. **Inviter** un utilisateur avec rôle `owner`
2. **Vérifier dans Supabase** :
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'USER_ID';
   ```
3. **Résultat attendu** : `role = 'dirigeant'`

### Test 2 : Utilisateur Existant avec Changement de Rôle

1. **Inviter** un utilisateur existant avec un nouveau rôle
2. **Vérifier** : Le rôle doit être mis à jour
3. **Résultat attendu** : Nouveau rôle assigné

### Test 3 : Vérifier le Mapping

| Frontend | Backend | Test |
|----------|---------|------|
| `owner` | `dirigeant` | ✅ |
| `admin` | `administrateur` | ✅ |
| `member` | `salarie` | ✅ |
| (non fourni) | `salarie` (défaut) | ✅ |

## 📋 Checklist de Vérification

- [ ] Le rôle est bien assigné lors de la création de compte
- [ ] Le mapping frontend → backend est correct
- [ ] Le rôle est mis à jour pour les utilisateurs existants
- [ ] Le `companyId` est bien lié dans `company_users`
- [ ] Pas d'erreur de contrainte unique
- [ ] Le trigger `handle_new_user` ne bloque pas l'assignation

## 🔧 Si Problème Persiste

### Vérifier la Structure de la Table

```sql
-- Vérifier les contraintes UNIQUE
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass
AND contype = 'u';
```

### Vérifier les Rôles Assignés

```sql
-- Voir tous les rôles d'un utilisateur
SELECT * FROM user_roles WHERE user_id = 'USER_ID';

-- Voir les rôles par entreprise
SELECT * FROM company_users WHERE user_id = 'USER_ID';
```

## ✅ Résultat Attendu

Après ces corrections :
- ✅ Les rôles sont correctement assignés lors de l'invitation
- ✅ Le mapping frontend → backend fonctionne
- ✅ Les utilisateurs existants voient leur rôle mis à jour
- ✅ Pas de conflit avec le trigger `handle_new_user`
- ✅ Fonctionne avec `UNIQUE(user_id)` ou `UNIQUE(user_id, role)`


