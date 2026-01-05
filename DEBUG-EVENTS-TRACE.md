# 🔍 DEBUG ÉVÉNEMENTS - TRACE FORCÉE

## 📋 OBJECTIF

Identifier **EXACTEMENT** quel champ contient la valeur `"events"` qui cause l'erreur `invalid input syntax for type uuid: 'events'`.

---

## 🚀 ÉTAPES DE DEBUG

### **1️⃣ Rafraîchir l'app**

1. **Rafraîchis l'app** (Cmd+R ou F5)
2. **Ouvre la console** (F12 ou Cmd+Option+I)

---

### **2️⃣ Créer un événement**

1. **Va dans le Calendrier**
2. **Clique sur "Créer un événement"**
3. **Remplis le formulaire** et soumets

---

### **3️⃣ Vérifier les logs dans la console**

Tu devrais voir ces logs dans l'ordre :

#### **Log 1 : DÉBUT**
```
🔵 [useCreateEvent] DÉBUT - Données reçues: {...}
```

#### **Log 2 : User ID**
```
✅ [useCreateEvent] User ID récupéré depuis auth.getUser(): {
  user_id: <uuid>,
  type: "string",
  length: 36,
  isString: true
}
```

**⚠️ VÉRIFIER ICI :** Si `user_id` = `"events"`, le problème vient de `auth.getUser()`.

---

#### **Log 3 : Company ID**
```
✅ [useCreateEvent] Company ID récupéré depuis company_users: {
  company_id: <uuid>,
  type: "string",
  length: 36,
  isString: true
}
```

**⚠️ VÉRIFIER ICI :** Si `company_id` = `"events"`, le problème vient de `company_users`.

---

#### **Log 4 : DEBUG EVENT PAYLOAD**
```
🔍 [DEBUG EVENT PAYLOAD] Valeurs AVANT insertion: {
  user_id: <uuid>,
  company_id: <uuid>,
  title: "...",
  start_date: "...",
  ...
}
```

**⚠️ VÉRIFIER ICI :** Quel champ contient `"events"` ?

---

#### **Log 5 : DEBUG EVENT VALUES**
```
🔍 [DEBUG EVENT VALUES] Types et validations: {
  user_id: {
    value: <uuid>,
    type: "string",
    isString: true,
    length: 36,
    isUUID: true,
    isEvents: false,
    containsEvents: false
  },
  company_id: {
    value: <uuid>,
    type: "string",
    isString: true,
    length: 36,
    isUUID: true,
    isEvents: false,
    containsEvents: false
  }
}
```

**⚠️ VÉRIFIER ICI :**
- Si `isEvents: true` → Le champ contient exactement `"events"`
- Si `containsEvents: true` → Le champ contient `"events"` quelque part
- Si `isUUID: false` → Le champ n'est pas un UUID valide

---

#### **Log 6 : Validation UUID**
```
✅ Validation UUID réussie
```

OU

```
❌ [useCreateEvent] VALIDATION UUID ÉCHOUÉE - user_id: {...}
```

**⚠️ SI ERREUR ICI :** Le champ problématique est identifié dans le log.

---

## 🎯 IDENTIFIER LE CHAMP PROBLÉMATIQUE

### **Si `user_id` = `"events"` :**

**Problème :** `auth.getUser()` retourne `"events"` au lieu d'un UUID.

**Solution :**
1. Vérifier la session Supabase
2. Se déconnecter et se reconnecter
3. Vérifier que l'utilisateur est bien authentifié

---

### **Si `company_id` = `"events"` :**

**Problème :** La table `company_users` contient `"events"` au lieu d'un UUID.

**Solution :**
1. Vérifier la table `company_users` dans Supabase
2. Exécuter cette requête SQL :
   ```sql
   SELECT * FROM company_users WHERE company_id = 'events';
   ```
3. Corriger les données si nécessaire

---

### **Si un autre champ contient `"events"` :**

**Problème :** Un autre champ (title, type, etc.) contient `"events"` et est confondu avec un UUID.

**Solution :**
1. Vérifier le formulaire `EventForm`
2. Vérifier que les données du formulaire sont correctes

---

## 📊 RÉSULTAT ATTENDU

Après avoir identifié le champ problématique :

1. **Le log montre exactement quel champ contient `"events"`**
2. **L'insertion est BLOQUÉE** avant d'atteindre Supabase
3. **Un message d'erreur clair** indique le champ problématique

---

## 🆘 SI LE PROBLÈME PERSISTE

1. **Copie TOUS les logs** de la console
2. **Note quel log montre `"events"`**
3. **Envoie-moi les logs** pour que je puisse identifier la source exacte

---

**🔥 CRÉE UN ÉVÉNEMENT ET VÉRIFIE LES LOGS DANS LA CONSOLE ! 🔥**
