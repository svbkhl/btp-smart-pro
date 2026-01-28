# 🎯 SYSTÈME DE GESTION D'ERREURS STANDARDISÉ

## ✅ CE QUI A ÉTÉ CRÉÉ

### 1. **`src/utils/errors.ts`** - Système d'Erreurs Centralisé

#### Classes et Types
```typescript
// Types d'erreurs
export type AppErrorType = 
  | 'AUTH'           // Erreurs d'authentification
  | 'PERMISSION'     // Erreurs de permissions
  | 'NOT_FOUND'      // Ressource introuvable
  | 'VALIDATION'     // Validation de données
  | 'NETWORK'        // Erreurs réseau
  | 'DATABASE'       // Erreurs base de données
  | 'UNKNOWN';       // Erreurs inconnues

// Classe d'erreur principale
export class AppError extends Error {
  readonly type: AppErrorType;
  readonly userMessage: string;
  readonly technicalMessage?: string;
  readonly originalError?: Error;
}
```

#### Fonctions Principales

1. **`handleSupabaseError(error, context)`**
   - Transforme automatiquement les erreurs Supabase en AppError
   - Détecte le type d'erreur (auth, permission, validation, etc.)
   - Génère un message utilisateur en français
   - Log les détails techniques pour le debugging

2. **`showErrorToast(error, toast)`**
   - Affiche un toast adapté au type d'erreur
   - Message en français, clair pour l'utilisateur
   - Jamais de détails techniques exposés

3. **Fonctions Helper**
   - `createValidationError(message)` - Erreurs de validation
   - `createPermissionError(message)` - Erreurs de permissions
   - `createAuthError(message)` - Erreurs d'authentification
   - `createNotFoundError(resourceType)` - Ressources introuvables

---

### 2. **`src/hooks/useClients.ts`** - Refactorisé avec Gestion d'Erreurs

#### Avant (❌ Ancien Code)
```typescript
if (error) {
  console.error("Supabase error:", error);
  throw new Error(error.message || "Impossible de créer le client");
}

// Problèmes:
// ❌ Messages techniques exposés à l'utilisateur
// ❌ Pas de typage d'erreurs
// ❌ Gestion incohérente
// ❌ Pas de logs de sécurité
```

#### Après (✅ Nouveau Code)
```typescript
if (error) {
  throw handleSupabaseError(error, "la création du client");
}

// Avantages:
// ✅ Messages en français pour l'utilisateur
// ✅ Erreurs typées (AppError)
// ✅ Logs automatiques
// ✅ Logs de sécurité pour les permissions
```

---

## 🎯 CARACTÉRISTIQUES CLÉS

### 1. Messages Utilisateur en Français

| Type d'Erreur | Message Utilisateur |
|---------------|---------------------|
| AUTH | "Votre session a expiré. Veuillez vous reconnecter." |
| PERMISSION | "Vous n'avez pas la permission d'effectuer cette action." |
| NOT_FOUND | "La ressource demandée n'existe pas." |
| VALIDATION | "Tous les champs obligatoires doivent être remplis." |
| NETWORK | "Problème de connexion. Vérifiez votre connexion internet." |
| DATABASE | "Erreur serveur. Veuillez réessayer." |

### 2. Détection Automatique des Erreurs Supabase

Le système détecte automatiquement:
- ✅ Erreurs JWT / Token expirés → `AUTH`
- ✅ Erreurs RLS / Permissions → `PERMISSION` + log sécurité
- ✅ Erreurs 404 / Not Found → `NOT_FOUND`
- ✅ Contraintes unique / foreign key → `VALIDATION`
- ✅ Erreurs réseau / timeout → `NETWORK`

### 3. Logs de Sécurité

Toutes les erreurs de permission sont automatiquement loggées:
```typescript
logger.security('Permission denied error detected', { error, context });
```

### 4. Validation des Données

Toutes les mutations ont des validations explicites:
```typescript
// Validation avant requête
if (!clientData.name || clientData.name.trim().length === 0) {
  throw createValidationError("Le nom du client est obligatoire.");
}
```

---

## 📋 CHANGEMENTS DANS `useClients.ts`

### Hook `useClients`
- ✅ Throw `AppError` si non authentifié
- ✅ Gestion d'erreurs via `handleSupabaseError`
- ✅ `throwOnError: false` (géré dans l'UI)

### Hook `useClient`
- ✅ Throw `AppError` si ID manquant
- ✅ Throw `createNotFoundError` si client introuvable
- ✅ Messages d'erreur en français

### Hook `useCreateClient`
- ✅ Validation explicite des données
- ✅ Vérification UUID user_id
- ✅ Messages d'erreur clairs
- ✅ `onError: showErrorToast` standardisé

### Hook `useUpdateClient`
- ✅ Validation ID et company_id
- ✅ Throw `createNotFoundError` si inexistant
- ✅ `onError: showErrorToast` standardisé

### Hook `useDeleteClient`
- ✅ Vérifications de sécurité multi-tenant
- ✅ Logs de sécurité pour tentatives non autorisées
- ✅ Messages d'erreur explicites
- ✅ `onError: showErrorToast` standardisé

---

## 🔒 SÉCURITÉ RENFORCÉE

### Logs de Sécurité Automatiques

Toutes les erreurs de permission déclenchent un log:
```typescript
logger.security('Unauthorized delete attempt', {
  clientId: id,
  clientCompanyId: existingClient.company_id,
  userCompanyId: companyId
});
```

### Validation Multi-Tenant

Vérifications systématiques:
1. ✅ Client appartient à l'entreprise de l'utilisateur
2. ✅ Aucun client dupliqué entre entreprises
3. ✅ Exactement 1 client sera supprimé
4. ✅ company_id est toujours validé

---

## 📊 EXEMPLE D'UTILISATION

### Créer une Erreur
```typescript
// Erreur de validation
throw createValidationError("Le nom du client est obligatoire.");

// Erreur de permission
throw createPermissionError("Vous n'avez pas accès à cette ressource.");

// Erreur not found
throw createNotFoundError("Client");

// Transformer erreur Supabase
throw handleSupabaseError(error, "la création du client");
```

### Afficher un Toast d'Erreur
```typescript
onError: (error: unknown) => {
  showErrorToast(error, toast);
}
```

---

## 🚀 PROCHAINES ÉTAPES

### Appliquer à Tous les Hooks

Le même pattern doit être appliqué à:
- [ ] `src/hooks/useProjects.ts`
- [ ] `src/hooks/useInvoices.ts`
- [ ] `src/hooks/useQuotes.ts`
- [ ] `src/hooks/useEmployees.ts`
- [ ] `src/hooks/useNotifications.ts`
- [ ] `src/hooks/useUserStats.ts`
- [ ] Tous les autres hooks

### Pattern de Migration

Pour chaque hook:

1. **Importer le système d'erreurs:**
```typescript
import {
  handleSupabaseError,
  showErrorToast,
  createValidationError,
  createPermissionError,
  createNotFoundError,
} from "@/utils/errors";
```

2. **Remplacer les throw Error():**
```typescript
// AVANT
if (error) throw new Error(error.message);

// APRÈS
if (error) throw handleSupabaseError(error, "l'opération");
```

3. **Standardiser onError:**
```typescript
onError: (error: unknown) => {
  showErrorToast(error, toast);
}
```

4. **Ajouter des validations:**
```typescript
if (!user) {
  throw createValidationError("Vous devez être connecté.");
}
```

---

## 🎯 AVANTAGES FINAUX

### Pour les Développeurs
- ✅ **Code cohérent** - Tous les hooks utilisent le même pattern
- ✅ **Typage fort** - AppError avec types explicites
- ✅ **Debugging facile** - Logs automatiques avec contexte
- ✅ **Maintenance simple** - Un seul point de contrôle

### Pour les Utilisateurs
- ✅ **Messages clairs** - Toujours en français
- ✅ **Pas de jargon technique** - Messages adaptés
- ✅ **Actions suggérées** - "Veuillez vous reconnecter", etc.
- ✅ **Expérience cohérente** - Même format partout

### Pour la Sécurité
- ✅ **Logs de sécurité** - Toutes les tentatives non autorisées
- ✅ **Pas de fuite d'infos** - Détails techniques cachés
- ✅ **Traçabilité** - Chaque erreur est loggée
- ✅ **Audit** - Facile de suivre les problèmes de permissions

---

**Créé le:** 2026-01-23  
**Statut:** ✅ Terminé pour `useClients.ts`  
**Prochaine action:** Appliquer aux autres hooks
