# ⚡ Démarrage Rapide : Permissions Personnalisées

## 🚀 3 étapes pour activer le système

### ✅ Étape 1 : Migrations SQL (2 minutes)

**Via Supabase Dashboard :**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **SQL Editor** → **New Query**
4. Copiez le contenu de **CHAQUE fichier ci-dessous** et exécutez-les **UN PAR UN** :

#### Migration 1 : Créer la table
```
📁 supabase/migrations/20260201000001_add_user_permissions.sql
```
→ Cliquez **Run** (Cmd+Enter)

#### Migration 2 : Insérer les permissions
```
📁 supabase/migrations/20260201000002_insert_base_permissions.sql
```
→ Cliquez **Run** (Cmd+Enter)

---

### ✅ Étape 2 : Redémarrer l'app (30 secondes)

```bash
# Arrêtez le serveur (Ctrl+C)
# Relancez
npm run dev
```

---

### ✅ Étape 3 : Tester ! (2 minutes)

#### Test en tant que Patron :

1. **Connectez-vous** avec un compte patron
2. Allez sur la page **"Employés"**
3. Vous voyez le bouton **"Permissions"** ⚙️ pour chaque employé
4. Cliquez dessus
5. **Cochez les permissions** souhaitées
6. **Enregistrer**

#### Test en tant qu'Employé :

1. **Déconnectez-vous**
2. **Connectez-vous** avec un compte employé
3. La sidebar affiche **uniquement** les sections autorisées
4. Essayez d'accéder aux différentes pages

---

## 🎯 Permissions disponibles (à cocher)

### 📋 Menu simplifié

Le patron peut cocher :

```
Clients
  ☐ Voir les clients
  ☐ Créer des clients
  ☐ Modifier les clients
  ☐ Supprimer les clients

Projets
  ☐ Voir les projets
  ☐ Créer des projets
  ☐ Modifier les projets
  ☐ Supprimer les projets

Devis
  ☐ Voir les devis
  ☐ Créer des devis
  ☐ Modifier les devis
  ☐ Supprimer les devis

Factures
  ☐ Voir les factures
  ☐ Créer des factures
  ☐ Envoyer les factures

Employés
  ☐ Inviter des employés
  ☐ Voir les employés

Paramètres
  ☐ Gérer les paramètres de l'entreprise
```

---

## 🎭 Exemples de configurations

### Configuration 1 : Employé de terrain
```
✅ Voir les projets
✅ Voir son planning
(Rien d'autre)
```

### Configuration 2 : Commercial
```
✅ Voir/Créer/Modifier les clients
✅ Voir/Créer les devis
(Pas d'accès factures ni projets)
```

### Configuration 3 : Responsable
```
✅ Toutes les permissions clients
✅ Toutes les permissions projets
✅ Toutes les permissions devis
✅ Voir les factures
✅ Voir les employés
(Pas de gestion paramètres entreprise)
```

---

## ❓ Questions fréquentes

### Q: Le bouton "Permissions" n'apparaît pas
**R:** Assurez-vous d'être connecté en tant que **patron** (owner)

### Q: Les permissions ne s'appliquent pas
**R:** Déconnectez-vous et reconnectez-vous pour rafraîchir le cache

### Q: Erreur "permission_id does not exist"
**R:** Vérifiez que vous avez bien exécuté **les 2 migrations SQL**

---

## 📚 Documentation complète

Pour plus de détails :
- **RECAP-SYSTEME-PERMISSIONS-PERSONNALISEES.md** → Vue d'ensemble complète
- **GUIDE-TEST-PERMISSIONS-EMPLOYEES.md** → Guide de test détaillé
- **APPLY-USER-PERMISSIONS-MIGRATION.md** → Guide migration SQL

---

## ✅ C'est tout !

En 3 étapes simples, vous avez maintenant un **système de permissions granulaires** où le patron contrôle précisément ce que chaque employé peut voir et faire ! 🎉

**Durée totale : ~5 minutes**
