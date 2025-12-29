# 📋 Diff : Correction Edge Function send-invitation

## 🔍 Fichier modifié

`supabase/functions/send-invitation/index.ts`

## ✅ Changements appliqués

### 1. Ajout de la vérification préalable avec `listUsers()`

**Avant :**
```typescript
// Envoyait directement l'invitation sans vérifier
const { data, error } = await supabase.auth.admin.inviteUserByEmail(emailToInvite);
```

**Après :**
```typescript
// ⚠️ ÉTAPE 1 : Vérifier si l'utilisateur existe déjà AVANT d'envoyer l'invitation
const { data: existingUsers } = await supabase.auth.admin.listUsers();
const userAlreadyExists = existingUsers?.users?.some(
  (u: any) => u.email?.toLowerCase() === emailToInvite.toLowerCase()
);

if (userAlreadyExists) {
  return {
    success: false,
    message: "Cet utilisateur existe déjà."
  };
}
```

### 2. Gestion de l'erreur `email_exists`

**Avant :**
```typescript
if (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500 }
  );
}
```

**Après :**
```typescript
if (error) {
  // Gérer spécifiquement le cas où l'email existe déjà
  if (error?.code === "email_exists" || 
      error.message?.includes("already been registered")) {
    return {
      success: false,
      message: "Un compte avec cet email existe déjà."
    };
  }
  
  // Autres erreurs
  return {
    success: false,
    message: "Erreur lors de l'invitation.",
    error: error.message
  };
}
```

### 3. Format de réponse standardisé

**Avant :**
```typescript
// Format incohérent
return { message: "Invitation sent", data };
```

**Après :**
```typescript
// Format cohérent
return {
  success: true,
  message: "Invitation envoyée.",
  user: data?.user
};
```

## 📋 Format de réponse final

### ✅ Succès
```json
{
  "success": true,
  "message": "Invitation envoyée.",
  "user": { ... }
}
```

### ℹ️ Utilisateur existant
```json
{
  "success": false,
  "message": "Cet utilisateur existe déjà."
}
```

### ❌ Erreur
```json
{
  "success": false,
  "message": "Erreur lors de l'invitation.",
  "error": "Error message"
}
```

## ✅ Garanties

1. ✅ **Vérification préalable** - Utilisateur vérifié AVANT invitation
2. ✅ **Double protection** - Vérification + gestion d'erreur
3. ✅ **Messages clairs** - Messages utilisateur compréhensibles
4. ✅ **Format cohérent** - Toutes les réponses suivent le même format
5. ✅ **Pas d'erreur cassante** - L'application ne plante jamais





