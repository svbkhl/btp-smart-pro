# 🔍 DIAGNOSTIC BUG ÉVÉNEMENTS - "events" comme UUID

## 📋 PROBLÈME

Erreur Supabase : `invalid input syntax for type uuid: 'events'` (code 22P02)

**Hypothèse :** La valeur `"events"` (nom de la table) est injectée dans un champ UUID (`user_id`, `company_id`, etc.)

---

## 🔍 LOGS DE DEBUG AJOUTÉS

### **Log 1 : TRACE ABSOLUE - Payload Final**

Juste avant l'insertion Supabase, un log ultra-détaillé est ajouté :

```javascript
🚨 [TRACE ABSOLUE] PAYLOAD FINAL AVANT INSERTION SUPABASE: {
  payload_complet: {...},
  payload_stringified: "...",
  verification_uuid_fields: {
    user_id: { value, isUUID, isEvents, type },
    company_id: { value, isUUID, isEvents, type },
    project_id: { value, isUUID, isEvents, type },
  },
  toutes_les_valeurs: [
    { key, value, type, isEvents, containsEvents },
    ...
  ]
}
```

**Ce log montre :**
- ✅ Toutes les valeurs du payload
- ✅ Si `user_id` = `"events"`
- ✅ Si `company_id` = `"events"`
- ✅ Si `project_id` = `"events"`
- ✅ Si n'importe quel champ contient `"events"`

---

### **Log 2 : Payload Final Nettoyé**

Après suppression des champs inutiles :

```javascript
🚨 [TRACE ABSOLUE] PAYLOAD FINAL NETTOYÉ: {
  payload_final: {...},
  payload_stringified: "...",
  champs_supprimes: ['id', 'created_by', 'calendar_id']
}
```

---

## 🛡️ VALIDATION RENFORCÉE

### **Vérification de TOUS les champs UUID**

Avant l'insertion, tous les champs UUID sont vérifiés :

- `user_id`
- `company_id`
- `project_id`
- `id` (supprimé du payload)
- `created_by` (supprimé du payload)
- `calendar_id` (supprimé du payload)

**Pour chaque champ UUID :**
1. ✅ Vérifie que ce n'est pas `"events"`, `"calendar"`, `"event"`
2. ✅ Vérifie que c'est un UUID valide
3. ✅ **BLOQUE l'insertion** si invalide

---

## 🚀 COMMENT UTILISER

### **Étape 1 : Rafraîchir l'app**

1. **Rafraîchis l'app** (Cmd+R ou F5)
2. **Ouvre la console** (F12 ou Cmd+Option+I)

---

### **Étape 2 : Créer un événement**

1. **Va dans le Calendrier**
2. **Clique sur "Créer un événement"**
3. **Remplis le formulaire** et soumets

---

### **Étape 3 : Vérifier les logs**

Dans la console, tu verras :

1. `🔵 [useCreateEvent] DÉBUT` - Données reçues
2. `✅ [useCreateEvent] User ID récupéré` - UUID utilisateur
3. `✅ [useCreateEvent] Company ID récupéré` - UUID entreprise
4. `🔍 [DEBUG EVENT PAYLOAD]` - Toutes les valeurs
5. `🔍 [DEBUG EVENT VALUES]` - Types et validations
6. **`🚨 [TRACE ABSOLUE] PAYLOAD FINAL`** - **PAYLOAD COMPLET AVANT INSERTION**
7. **`🚨 [TRACE ABSOLUE] PAYLOAD FINAL NETTOYÉ`** - **PAYLOAD NETTOYÉ**

**Si "events" est détecté :**
```
❌ [useCreateEvent] ERREUR CRITIQUE - Champ UUID invalide: {
  field: "user_id" ou "company_id",
  value: "events",
  full_payload: {...}
}
```

**Le log indique exactement quel champ contient `"events"`.**

---

## 🎯 IDENTIFIER LA CAUSE

### **Si `user_id` = `"events"` :**

**Cause :** `auth.getUser()` retourne `"events"` au lieu d'un UUID.

**Solution :**
1. Vérifier la session Supabase
2. Se déconnecter et se reconnecter
3. Vérifier que l'utilisateur est bien authentifié

---

### **Si `company_id` = `"events"` :**

**Cause :** La table `company_users` contient `"events"` au lieu d'un UUID.

**Solution :**
1. Vérifier la table `company_users` dans Supabase
2. Exécuter cette requête SQL :
   ```sql
   SELECT * FROM company_users WHERE company_id = 'events';
   ```
3. Corriger les données si nécessaire

---

### **Si un autre champ contient `"events"` :**

**Cause :** Un autre champ (project_id, etc.) contient `"events"`.

**Solution :**
1. Vérifier le formulaire `EventForm`
2. Vérifier que les données du formulaire sont correctes

---

## 🔧 CORRECTIONS APPLIQUÉES

1. ✅ **Log ultra-détaillé** avant insertion
2. ✅ **Validation stricte** de tous les champs UUID
3. ✅ **Blocage** si UUID invalide détecté
4. ✅ **Suppression** de `id`, `created_by`, `calendar_id` du payload
5. ✅ **Vérification** que `user_id` vient de `auth.getUser()`
6. ✅ **Vérification** que `company_id` vient de `company_users`

---

## 📊 RÉSULTAT ATTENDU

Après avoir créé un événement :

1. **Les logs montrent exactement quel champ contient `"events"`** (si présent)
2. **L'insertion est BLOQUÉE** avant d'atteindre Supabase si UUID invalide
3. **Un message d'erreur clair** indique le champ problématique

---

## 🆘 SI LE PROBLÈME PERSISTE

1. **Copie TOUS les logs** de la console (surtout `🚨 [TRACE ABSOLUE]`)
2. **Note quel log montre `"events"`**
3. **Envoie-moi les logs** pour que je puisse identifier la source exacte

---

**🔥 CRÉE UN ÉVÉNEMENT ET VÉRIFIE LES LOGS `🚨 [TRACE ABSOLUE]` DANS LA CONSOLE ! 🔥**

