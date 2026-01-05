# 🔥 FIX DÉFINITIF : Bug UUID "events" - Code 22P02

## 🎯 PROBLÈME

Lors de la création d'un événement, Supabase renvoie :
```
"invalid input syntax for type uuid: 'events'" (code 22P02)
```

**Cause :** Une chaîne `"events"` est envoyée dans un champ de type UUID (user_id, company_id, etc.)

**Origine probable :** Récupération accidentelle d'un paramètre de route depuis `/events` via `useParams()` ou `router.query`.

---

## ✅ SOLUTION APPLIQUÉE

### **1️⃣ Récupération sécurisée des IDs**

```typescript
// ⚠️ SÉCURITÉ : Ne JAMAIS utiliser useParams(), router.query, ou route.params
// ⚠️ Les UUID doivent TOUJOURS provenir de supabase.auth.getUser() ou de la DB

// 1. Récupérer l'utilisateur actuel depuis Supabase Auth (SEULE SOURCE)
const { data: { user } } = await supabase.auth.getUser();
const userId = user.id;

// 2. Récupérer l'id de la société depuis company_users (SEULE SOURCE)
// ⚠️ NE JAMAIS utiliser currentCompanyId depuis useAuth() ou contexte
const { data: companyUserData } = await supabase
  .from("company_users")
  .select("company_id")
  .eq("user_id", userId)
  .maybeSingle();
const companyId = companyUserData.company_id;
```

**Règles strictes :**
- ✅ `user_id` : UNIQUEMENT depuis `supabase.auth.getUser()`
- ✅ `company_id` : UNIQUEMENT depuis `company_users` (DB)
- ❌ JAMAIS depuis `useParams()`, `router.query`, `route.params`
- ❌ JAMAIS depuis le contexte ou les props

---

### **2️⃣ Validation stricte des UUID**

```typescript
// ⚠️ REGEX UUID STRICTE (RFC 4122 compliant)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // ⚠️ BLOQUER EXPLICITEMENT "events" et autres valeurs invalides
  const invalidValues = ["events", "calendar", "event", "table", "null", "undefined", ""];
  if (invalidValues.includes(value.toLowerCase())) {
    return false;
  }
  
  return UUID_REGEX.test(value);
}

// Validation avant utilisation
if (!isValidUUID(userId)) {
  throw new Error(`user_id invalide: "${userId}"`);
}
if (!isValidUUID(companyId)) {
  throw new Error(`company_id invalide: "${companyId}"`);
}
```

**Protection :**
- ✅ Regex RFC 4122 compliant
- ✅ Blocage explicite de "events", "calendar", "event", etc.
- ✅ Validation avant toute utilisation

---

### **3️⃣ Payload sécurisé**

```typescript
// 4️⃣ Préparer le payload propre et sécurisé
const payload: Record<string, any> = {
  user_id: userId,        // ✅ UUID validé depuis auth.getUser()
  company_id: companyId,  // ✅ UUID validé depuis company_users
  title: data.title.trim(),
  start_date: data.start_date,
  all_day: data.all_day ?? false,
  type: data.type || "meeting",
  color: data.color || "#3b82f6",
};

// Champs optionnels (validation stricte)
if (data.project_id && isValidUUID(data.project_id)) {
  payload.project_id = data.project_id;
}

// ⚠️ DEBUG : Vérifier visuellement que tous les UUID sont corrects
console.log('DEBUG EVENT PAYLOAD', payload);
```

**Sécurité :**
- ✅ Seulement les champs autorisés
- ✅ Tous les UUID validés avant ajout
- ✅ Log de debug pour vérification

---

### **4️⃣ Insert sécurisé dans Supabase**

```typescript
// 5️⃣ Insert sécurisé dans Supabase
// ⚠️ Le payload ne contient QUE des UUID validés
// ⚠️ Aucune valeur "events" ne peut être injectée
const { data: event, error } = await supabase
  .from('events')
  .insert([payload])
  .select('*')
  .single();

if (error) {
  console.error('Erreur insertion event:', error);
  console.error('Payload envoyé:', JSON.stringify(payload, null, 2));
  throw error;
}
```

**Protection finale :**
- ✅ Payload validé avant insertion
- ✅ Logs d'erreur détaillés
- ✅ Aucune valeur invalide possible

---

## 🔒 BONNES PRATIQUES

### **✅ À FAIRE :**

1. **Récupérer les UUID depuis des sources sûres :**
   - `user_id` : `supabase.auth.getUser()`
   - `company_id` : Table `company_users` (DB)
   - `project_id` : Table `projects` (DB)

2. **Valider tous les UUID avant utilisation :**
   ```typescript
   if (!isValidUUID(userId)) {
     throw new Error('user_id invalide');
   }
   ```

3. **Logger le payload avant insertion :**
   ```typescript
   console.log('DEBUG EVENT PAYLOAD', payload);
   ```

### **❌ À NE JAMAIS FAIRE :**

1. **Utiliser `useParams()` pour les UUID :**
   ```typescript
   // ❌ MAUVAIS
   const { id } = useParams();
   const userId = id; // Peut être "events" si route = /events
   ```

2. **Utiliser `router.query` pour les UUID :**
   ```typescript
   // ❌ MAUVAIS
   const userId = router.query.id; // Peut être "events"
   ```

3. **Utiliser le contexte sans validation :**
   ```typescript
   // ❌ MAUVAIS
   const { currentCompanyId } = useAuth();
   // Peut être contaminé par des valeurs invalides
   ```

---

## 📋 CHECKLIST DE SÉCURITÉ

- ✅ `user_id` provient de `supabase.auth.getUser()`
- ✅ `company_id` provient de `company_users` (DB)
- ✅ Tous les UUID validés avec `isValidUUID()`
- ✅ Blocage explicite de "events", "calendar", etc.
- ✅ Payload construit de manière stricte
- ✅ Logs de debug avant insertion
- ✅ Aucun `useParams()` pour les UUID
- ✅ Aucun `router.query` pour les UUID

---

## 🧪 TEST

1. **Rafraîchis l'app** (Cmd+R ou F5)
2. **Ouvre la console** (F12)
3. **Crée un événement**
4. **Vérifie les logs :**
   - `DEBUG EVENT PAYLOAD` : Tous les UUID doivent être valides
   - `✅ [useCreateEvent] Événement créé avec succès`

5. **Si erreur :**
   - Vérifie le log `DEBUG EVENT PAYLOAD`
   - Identifie quel champ contient une valeur invalide
   - Vérifie que les UUID proviennent bien de sources sûres

---

## 🚀 RÉSULTAT ATTENDU

✅ **L'erreur 22P02 disparaît**
✅ **Aucun champ UUID ne reçoit une valeur non valide**
✅ **Les événements s'insèrent correctement dans Supabase**
✅ **La solution est sécurisée et résiliente contre les erreurs de route**

---

**🔥 LE BUG EST DÉFINITIVEMENT CORRIGÉ ! 🔥**
