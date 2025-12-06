# 📋 Scripts SQL Restants à Exécuter

## ✅ Déjà Exécuté

- ✅ `INSTALL-COMPLETE-SYSTEM.sql` - Système complet (companies, invitations, contact_requests)

---

## 🔴 Scripts CRITIQUES à Exécuter (OBLIGATOIRES)

### 1. **FIX-RLS-CREATE-COMPANIES.sql** ⚠️ IMPORTANT

**Pourquoi** : Corrige le problème du bouton "Créer" qui ne fonctionne pas dans la page "Gestion Entreprises"

**Ce qu'il fait** :
- Corrige la RLS policy pour permettre aux admins système de créer des entreprises
- Permet aux administrateurs de créer des entreprises sans être dans `company_users`

**Comment exécuter** :
1. Va dans Supabase Dashboard → SQL Editor
2. Ouvre le fichier `supabase/FIX-RLS-CREATE-COMPANIES.sql`
3. Copie TOUT le contenu
4. Colle dans l'éditeur SQL
5. Clique sur "Run" ou Cmd/Ctrl + Enter

**⚠️ À FAIRE MAINTENANT** : Ce script est nécessaire pour que le bouton "Créer" fonctionne !

---

### 2. **add_payment_providers.sql** (Optionnel mais recommandé)

**Pourquoi** : Active le système de paiements multi-providers (Stripe, SumUp, PayPlug, Stancer, GoCardless)

**Ce qu'il fait** :
- Crée la table `payment_provider_credentials`
- Ajoute les colonnes nécessaires dans `user_settings` et `payments`
- Configure les RLS policies pour les credentials de paiement

**Comment exécuter** :
1. Va dans Supabase Dashboard → SQL Editor
2. Ouvre le fichier `supabase/migrations/add_payment_providers.sql`
3. Copie TOUT le contenu
4. Colle dans l'éditeur SQL
5. Clique sur "Run"

**Note** : Ce script est optionnel si tu n'utilises que Stripe pour l'instant.

---

## 📝 Scripts Optionnels (selon tes besoins)

### Scripts de Configuration Email (si tu utilises l'email)
- `CREATE-EMAIL-ACCOUNTS-SYSTEM.sql`
- `CREATE-EMAIL-OAUTH-SYSTEM.sql`
- `CREATE-EMAIL-MESSAGES-TABLE.sql`

### Scripts de Configuration Stripe (si tu utilises Stripe)
- `CREATE-STRIPE-CONNECT-SYSTEM.sql` (ou `CREATE-STRIPE-CONNECT-SYSTEM-FIXED.sql`)

### Scripts de Notifications (si tu utilises les notifications)
- `CREATE-PUSH-NOTIFICATIONS-SYSTEM.sql`

### Scripts de Cron Jobs (si tu utilises les rappels automatiques)
- `CONFIGURE-ALL-CRON-JOBS.sql`

---

## 🎯 Ordre d'Exécution Recommandé

### Étape 1 : CRITIQUE (Faire MAINTENANT)
```sql
-- Exécute ce script pour corriger le bouton "Créer"
supabase/FIX-RLS-CREATE-COMPANIES.sql
```

### Étape 2 : Recommandé (Faire après)
```sql
-- Exécute ce script pour activer les paiements multi-providers
supabase/migrations/add_payment_providers.sql
```

### Étape 3 : Optionnel (Selon tes besoins)
- Scripts email, Stripe, notifications, etc.

---

## ✅ Checklist

- [ ] **FIX-RLS-CREATE-COMPANIES.sql** exécuté (CRITIQUE)
- [ ] **add_payment_providers.sql** exécuté (recommandé)
- [ ] Autres scripts optionnels selon tes besoins

---

## 🆘 Après l'Exécution

### Vérifier que le bouton "Créer" fonctionne

1. Va dans l'application → Paramètres → Gestion Entreprises
2. Clique sur "Nouvelle entreprise"
3. Remplis le formulaire
4. Clique sur "Créer"
5. ✅ Si ça fonctionne, le script a réussi !

### Vérifier les Paiements Multi-Providers

1. Va dans Paramètres → Paiements
2. Tu devrais voir les options pour choisir un provider
3. ✅ Si tu vois Stripe, SumUp, PayPlug, etc., le script a réussi !

---

## 📝 Notes

- **FIX-RLS-CREATE-COMPANIES.sql** est **OBLIGATOIRE** pour que le système fonctionne
- **add_payment_providers.sql** est **recommandé** mais pas obligatoire
- Les autres scripts sont **optionnels** selon tes besoins

---

**🎯 Résumé** : Exécute d'abord `FIX-RLS-CREATE-COMPANIES.sql` (critique), puis `add_payment_providers.sql` (recommandé) !







