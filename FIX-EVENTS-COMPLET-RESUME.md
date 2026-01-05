# 🔧 FIX COMPLET - ERREUR "events" comme UUID

## 📋 PROBLÈME IDENTIFIÉ

**Erreur :** `invalid input syntax for type uuid: 'events'` (code 22P02)

**Cause probable :** La valeur `"events"` (nom de la table) est injectée dans un champ UUID (`user_id`, `company_id`, etc.)

---

## ✅ CORRECTIONS APPLIQUÉES

### **1. Logs ultra-détaillés**

Ajout de **2 logs critiques** juste avant l'insertion Supabase :

#### **Log 1 : TRACE ABSOLUE - Payload Final**
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

#### **Log 2 : Payload Final Nettoyé**
```javascript
🚨 [TRACE ABSOLUE] PAYLOAD FINAL NETTOYÉ: {
  payload_final: {...},
  payload_stringified: "...",
  champs_supprimes: ['id', 'created_by', 'calendar_id']
}
```

**Ces logs montrent EXACTEMENT quel champ contient `"events"`.**

---

### **2. Validation UUID stricte**

**Avant l'insertion, TOUS les champs UUID sont vérifiés :**

- ✅ `user_id` - Vérifié strictement
- ✅ `company_id` - Vérifié strictement
- ✅ `project_id` - Vérifié strictement
- ✅ `id` - Supprimé du payload (auto-généré)
- ✅ `created_by` - Supprimé du payload
- ✅ `calendar_id` - Supprimé du payload

**Pour chaque champ UUID :**
1. ✅ Vérifie que ce n'est pas `"events"`, `"calendar"`, `"event"`
2. ✅ Vérifie que c'est un UUID valide (regex strict)
3. ✅ **BLOQUE l'insertion** si invalide avec message d'erreur clair

---

### **3. Origine forcée des UUID**

- ✅ **`user_id`** : UNIQUEMENT depuis `auth.getUser().data.user.id`
- ✅ **`company_id`** : UNIQUEMENT depuis `company_users` (DB)
- ✅ **Aucun fallback**, contexte, route ou paramètre

---

### **4. Payload nettoyé**

**Avant l'insertion, le payload est nettoyé :**
- ✅ Suppression de `id` (auto-généré par PostgreSQL)
- ✅ Suppression de `created_by` (non utilisé)
- ✅ Suppression de `calendar_id` (non utilisé)

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

Dans la console, tu verras ces logs dans l'ordre :

1. `🔵 [useCreateEvent] DÉBUT` - Données reçues
2. `✅ [useCreateEvent] User ID récupéré` - UUID utilisateur
3. `✅ [useCreateEvent] Company ID récupéré` - UUID entreprise
4. `🔍 [DEBUG EVENT PAYLOAD]` - Toutes les valeurs
5. `🔍 [DEBUG EVENT VALUES]` - Types et validations
6. **`🚨 [TRACE ABSOLUE] PAYLOAD FINAL`** - **PAYLOAD COMPLET**
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

## 🔒 SÉCURITÉ

### **Triple validation**

1. ✅ **Frontend** : Validation avant construction de `insertData`
2. ✅ **Validation finale** : Vérification de tous les champs UUID
3. ✅ **Backend** : Trigger SQL (si Script 25 exécuté)

### **Origine forcée**

- ✅ `user_id` : UNIQUEMENT depuis `auth.getUser()`
- ✅ `company_id` : UNIQUEMENT depuis `company_users`
- ✅ Aucune valeur depuis contexte, route ou paramètre

---

## 📊 RÉSULTAT ATTENDU

Après avoir créé un événement :

- ✅ **Les logs montrent exactement quel champ contient `"events"`** (si présent)
- ✅ **L'insertion est BLOQUÉE** avant d'atteindre Supabase si UUID invalide
- ✅ **Un message d'erreur clair** indique le champ problématique
- ✅ **Plus d'erreur `22P02`** car l'insertion est bloquée en amont

---

## 🆘 SI LE PROBLÈME PERSISTE

1. **Copie TOUS les logs** de la console (surtout `🚨 [TRACE ABSOLUE]`)
2. **Note quel log montre `"events"`**
3. **Envoie-moi les logs** pour que je puisse identifier la source exacte

---

## 📝 CAUSE EXACTE DU BUG

**Hypothèse principale :**

Le bug est probablement causé par :
1. **Une valeur `"events"` dans la table `company_users`** (company_id = "events")
2. **Ou une valeur `"events"` retournée par `auth.getUser()`** (user_id = "events")

**Les logs `🚨 [TRACE ABSOLUE]` identifieront exactement la source.**

---

## 🔧 CORRECTION APPLIQUÉE

1. ✅ **Logs ultra-détaillés** pour identifier le champ problématique
2. ✅ **Validation UUID stricte** avant insertion
3. ✅ **Blocage** si UUID invalide détecté
4. ✅ **Payload nettoyé** (suppression de id, created_by, calendar_id)
5. ✅ **Origine forcée** des UUID (auth.getUser() + company_users)

---

**🔥 CRÉE UN ÉVÉNEMENT ET VÉRIFIE LES LOGS `🚨 [TRACE ABSOLUE]` DANS LA CONSOLE ! 🔥**

