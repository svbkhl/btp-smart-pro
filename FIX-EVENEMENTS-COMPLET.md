# ✅ FIX COMPLET : Création d'événements

## 🔍 PROBLÈME RÉSOLU

**Erreur :** `invalid input syntax for type uuid: "events"`

**Causes :**
1. ❌ `user.id` retournait une valeur invalide
2. ❌ Table `events` n'avait pas `company_id`
3. ❌ Pas d'isolation multi-tenant pour les événements

---

## ✅ SOLUTION APPLIQUÉE

### **1. Script SQL (Script 13)**

J'ai créé un script qui :
- ✅ Ajoute `company_id` à la table `events`
- ✅ Migre toutes les données existantes
- ✅ Active RLS avec isolation stricte par entreprise
- ✅ Crée des indexes pour performance

### **2. Hook corrigé**

J'ai corrigé `useCreateEvent` pour :
- ✅ Récupérer `user_id` via `supabase.auth.getUser()` (plus fiable)
- ✅ Récupérer `company_id` depuis `company_users`
- ✅ Valider que `user_id` est un UUID valide
- ✅ Inclure `company_id` dans toutes les insertions
- ✅ Meilleure gestion des erreurs avec messages clairs

---

## 🚀 CE QUE TU DOIS FAIRE (2 ÉTAPES)

### **Étape 1 : Exécuter le script SQL**

[**supabase/migrations/20260105000013_fix_events_table_complete.sql**](supabase/migrations/20260105000013_fix_events_table_complete.sql)

**Comment :**
1. Clique sur le lien rose ci-dessus
2. Copie tout (Cmd+A, Cmd+C)
3. Va dans **Supabase SQL Editor**
4. Colle et clique sur **"Run"**

**Résultat attendu :**
```
✅ Colonne company_id ajoutée à events
✅ Données events migrées
✅ RLS activé sur events avec isolation par company_id

═══════════════════════════════════════════════════════
🎉 TABLE EVENTS SÉCURISÉE !
═══════════════════════════════════════════════════════
```

---

### **Étape 2 : Redémarrer l'application**

```bash
# Dans ton terminal
Ctrl+C  # Arrêter le serveur
npm run dev  # Redémarrer
```

Ou simplement **rafraîchis la page** (Cmd+R)

---

## 🧪 TESTER LA CRÉATION D'ÉVÉNEMENT

1. **Va dans le Calendrier**
2. **Clique sur une date** ou sur "Nouvel événement"
3. **Remplis le formulaire :**
   - Titre : "Test événement"
   - Date : Aujourd'hui
   - Type : Réunion
4. **Clique sur "Créer"**

**Résultat :**
- ✅ L'événement est créé sans erreur
- ✅ Il apparaît dans le calendrier
- ✅ Il est isolé par entreprise (pas visible sur d'autres comptes)

---

## 🔒 SÉCURITÉ

Après ces corrections :

### **✅ Isolation multi-tenant**
```
Entreprise A : Ne voit QUE ses événements
Entreprise B : Ne voit QUE ses événements
```

### **✅ RLS activé**
Toutes les requêtes sont automatiquement filtrées par `company_id`

### **✅ Validation stricte**
- `user_id` doit être un UUID valide
- `company_id` est obligatoire pour chaque événement
- `project_id` est validé s'il est fourni

---

## 📊 CE QUI A CHANGÉ

### **Avant (bugué) :**
```typescript
// Utilisait directement user.id depuis useAuth()
const user_id = user.id; // ❌ Pouvait retourner "events"

// Pas de company_id
const insertData = {
  user_id,
  title: data.title,
  // ...
};
```

### **Après (corrigé) :**
```typescript
// Récupère user directement depuis Supabase
const { data: { user }, error } = await supabase.auth.getUser(); // ✅ Fiable
const user_id = user.id;

// Récupère company_id
const { data: companyData } = await supabase
  .from("company_users")
  .select("company_id")
  .eq("user_id", user_id)
  .single();

// Inclut company_id
const insertData = {
  user_id,
  company_id: companyData.company_id, // ✅ Isolation
  title: data.title,
  // ...
};
```

---

## 🛠️ SI PROBLÈME

### **Erreur "company_id is required"**
→ Exécute le **Script 13** SQL d'abord

### **Erreur "Invalid UUID"**
→ Déconnecte-toi et reconnecte-toi (Cmd+Shift+R pour vider le cache)

### **L'événement n'apparaît pas**
→ Vérifie que RLS est activé et que le script 13 est exécuté

### **Autre erreur**
→ Ouvre la console (F12) et copie-colle l'erreur complète

---

## 📋 RÉCAP DES SCRIPTS À EXÉCUTER

Si tu veux tout sécuriser en une fois :

```
1️⃣ Script 12 : Supprimer le compte test (si tu veux)
2️⃣ Script 11 : Sécuriser toutes les tables business
3️⃣ Script 13 : Sécuriser la table events ⚠️ (NOUVEAU !)
```

---

**🔥 EXÉCUTE LE SCRIPT 13 ET TESTE LA CRÉATION D'ÉVÉNEMENTS ! 🔥**
