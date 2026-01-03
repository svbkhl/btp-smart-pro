# 🔍 Clarification : Erreurs 500 vs Configuration Vercel

## ❌ Les Erreurs 500 ne sont PAS liées à Vercel

Les erreurs 500 que tu vois :
```
GET .../rest/v1/projects?... 500 (Internal Server Error)
GET .../rest/v1/ai_quotes?... 500 (Internal Server Error)
GET .../rest/v1/clients?... 500 (Internal Server Error)
```

**Ces erreurs viennent de Supabase**, pas de Vercel.

---

## 🔍 Cause Réelle des Erreurs 500

### Problème Principal : Table `companies` manquante

Quand l'application essaie de :
1. Charger les projets → Erreur 500
2. Charger les devis → Erreur 500
3. Charger les clients → Erreur 500
4. Créer une entreprise → Erreur 500

**Pourquoi ?**

Les tables `projects`, `clients`, `ai_quotes` ont probablement une colonne `company_id` qui référence la table `companies`. Si cette table n'existe pas, les requêtes échouent avec une erreur 500.

---

## ✅ Solution Immédiate

### Exécuter le Script SQL (2 minutes)

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Ouvre le fichier** : `supabase/CREER-TOUT-LE-SYSTEME-COMPANIES.sql`
3. **Copie TOUT** (Cmd+A, Cmd+C)
4. **Colle dans SQL Editor** (Cmd+V)
5. **Clique sur "Run"** (Cmd+Enter)

**✅ Après ça, les erreurs 500 disparaîtront !**

---

## 🌐 Vercel et NDD (À faire demain)

### Ce qui reste à faire pour Vercel/NDD :

1. **Configuration DNS** pour le domaine `amen.fr`
   - Configurer les enregistrements DNS dans amen.fr
   - Pointer vers Vercel

2. **Mise à jour de PUBLIC_URL** dans Supabase
   - Une fois le domaine configuré, mettre à jour `PUBLIC_URL` dans Supabase Secrets
   - Changer de `https://ton-app.vercel.app` vers `https://amen.fr`

### ⚠️ Important

**Vercel/NDD n'affecte PAS les erreurs 500 actuelles.**

Les erreurs 500 sont des erreurs **serveur Supabase**, pas des erreurs de déploiement.

---

## 📋 Checklist

### À faire MAINTENANT (pour corriger les erreurs 500) :
- [ ] Exécuter `CREER-TOUT-LE-SYSTEME-COMPANIES.sql` dans Supabase
- [ ] Vérifier que la table `companies` existe
- [ ] Recharger l'application
- [ ] Vérifier que les erreurs 500 ont disparu

### À faire DEMAIN (pour finir Vercel/NDD) :
- [ ] Configurer les DNS dans amen.fr
- [ ] Mettre à jour `PUBLIC_URL` dans Supabase
- [ ] Tester que le domaine fonctionne

---

## 🎯 Résumé

- **Erreurs 500** = Problème Supabase (table `companies` manquante)
- **Vercel/NDD** = Configuration DNS (à faire demain)
- **Les deux sont indépendants** ✅

**Exécute le script SQL maintenant pour corriger les erreurs 500, et on finira Vercel/NDD demain !**















