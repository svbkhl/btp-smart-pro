# 🔥 NETTOYAGE + SÉCURISATION COMPLÈTE

## 🎯 PLAN D'ACTION (2 SCRIPTS)

Tu as raison, on va **supprimer le compte test** puis **sécuriser toutes les tables** pour que les nouveaux comptes soient propres.

---

## 📋 ÉTAPE 1 : SUPPRIMER LE COMPTE TEST (Script 12)

### **Script à exécuter :**

[**supabase/migrations/20260105000012_supprimer_compte_test.sql**](supabase/migrations/20260105000012_supprimer_compte_test.sql)

### **Ce qu'il fait :**
- ✅ Supprime l'utilisateur `sabbg.du73100@gmail.com`
- ✅ Supprime **TOUTES** ses données (15+ tables)
- ✅ Supprime ses entreprises orphelines
- ✅ Nettoie complètement la BDD

### **Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie tout** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

### **Résultat attendu :**
```
✅ Utilisateur trouvé: [uuid]
✅ ai_messages supprimés
✅ ai_conversations supprimés
✅ payments supprimés
✅ invoices supprimées
✅ ai_quotes supprimés
...
═══════════════════════════════════════════════════════
🎉 COMPTE TEST COMPLÈTEMENT SUPPRIMÉ !
═══════════════════════════════════════════════════════
```

---

## 📋 ÉTAPE 2 : SÉCURISER TOUTES LES TABLES (Script 11)

### **Script à exécuter :**

[**supabase/migrations/20260105000011_ULTIMATE_FIX_ALL_ISOLATION.sql**](supabase/migrations/20260105000011_ULTIMATE_FIX_ALL_ISOLATION.sql)

### **Ce qu'il fait :**
- ✅ Ajoute `company_id` à 11 tables business
- ✅ Migre les données existantes automatiquement
- ✅ Active RLS partout
- ✅ Crée des politiques strictes d'isolation

### **Comment l'exécuter :**
1. **Clique sur le lien rose** ci-dessus
2. **Copie tout** (Cmd+A puis Cmd+C)
3. **Va dans Supabase SQL Editor**
4. **Colle et clique sur "Run"**

### **Résultat attendu :**
```
✅ Colonne company_id ajoutée à clients
✅ Données clients migrées
✅ Colonne company_id ajoutée à ai_quotes
✅ Données ai_quotes migrées
...
═══════════════════════════════════════════════════════
🎉 ISOLATION MULTI-TENANT COMPLÈTE !
═══════════════════════════════════════════════════════
```

---

## 📋 ÉTAPE 3 : RECRÉER LE COMPTE PROPREMENT

Maintenant tu peux recréer le compte `sabbg.du73100@gmail.com` :

1. **Va sur ton app** (page d'inscription)
2. **Crée un nouveau compte** avec cet email
3. **Le compte sera créé proprement** avec :
   - ✅ Une nouvelle entreprise
   - ✅ Le rôle OWNER automatique
   - ✅ Toutes les données isolées par `company_id`
   - ✅ Aucun mélange avec d'autres comptes

---

## 🎉 RÉSULTAT FINAL

### **Avant (problème) :**
```
Compte Test : Voit les devis d'autres comptes
Autres comptes : Voient les données du compte test
```

### **Après (propre) :**
```
Compte Test : Ne voit QUE ses données
Autres comptes : Ne voient QUE leurs données
```

**Isolation complète garantie !**

---

## 🧪 POUR TESTER

Après avoir exécuté les 2 scripts et recréé le compte :

1. **Connecte-toi avec le nouveau compte**
2. **Crée un devis test**
3. **Déconnecte-toi**
4. **Connecte-toi avec un autre compte**
5. **Le devis test NE DOIT PAS APPARAÎTRE** ✅

---

## ⚠️ IMPORTANT

- **Exécute les scripts dans l'ORDRE** (12 puis 11)
- **Le script 12 supprime DÉFINITIVEMENT** les données du compte test
- **Le script 11 est idempotent** (réexécutable sans risque)
- **Les 2 scripts sont sûrs** et ne touchent pas aux autres comptes

---

## 🚀 ORDRE D'EXÉCUTION

```
1️⃣ Script 12 : Supprimer le compte test
        ↓
2️⃣ Script 11 : Sécuriser toutes les tables
        ↓
3️⃣ Recréer le compte proprement
        ↓
4️⃣ Tester l'isolation
```

---

**🔥 EXÉCUTE LE SCRIPT 12 D'ABORD, PUIS LE SCRIPT 11 ! 🔥**
