# 📋 INSTRUCTIONS : Exécuter la Migration SQL

## ⚠️ ERREUR COURANTE

Si vous voyez cette erreur :
```
ERROR: 42601: syntax error at or near "{"
LINE 1: import { useQuery, useMutation, useQueryClient } ...
```

**Cela signifie que vous avez copié un fichier `.ts` au lieu du fichier `.sql` !**

---

## ✅ PROCÉDURE CORRECTE

### Étape 1 : Ouvrir le BON fichier

**Fichier à utiliser** : `supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql`

⚠️ **NE PAS utiliser** :
- ❌ `src/hooks/useClients.ts`
- ❌ `src/hooks/useProjects.ts`
- ❌ `src/hooks/useInvoices.ts`
- ❌ Tout fichier `.ts` ou `.tsx`

✅ **Utiliser uniquement** :
- ✅ `supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql`

---

### Étape 2 : Vérifier le contenu

Le fichier SQL doit commencer par :
```sql
-- =====================================================
-- MIGRATION CRITIQUE : Isolation stricte de TOUTES les données par entreprise
-- =====================================================
```

**Si vous voyez** `import { ... }` ou `export const ...`, **C'EST LE MAUVAIS FICHIER !**

---

### Étape 3 : Copier le contenu

1. Ouvrez `supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql` dans votre éditeur
2. Sélectionnez **TOUT** le contenu (Ctrl+A / Cmd+A)
3. Copiez (Ctrl+C / Cmd+C)

---

### Étape 4 : Coller dans Supabase Dashboard

1. Allez sur **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Cliquez sur **New Query**
5. Collez le contenu du fichier SQL
6. Cliquez sur **Run** (ou Ctrl+Enter)

---

### Étape 5 : Vérifier les résultats

Vous devriez voir des messages comme :
```
✅ Colonne company_id ajoutée à la table clients
✅ Foreign key ajoutée
✅ Trigger créé
✅ Policies RLS créées
```

Si vous voyez des erreurs, vérifiez que :
- ✅ Vous avez bien copié le fichier `.sql` et non un `.ts`
- ✅ Le fichier commence par `--` (commentaires SQL)
- ✅ Il n'y a pas de `import` ou `export` dans le fichier

---

## 🔍 COMMENT IDENTIFIER LE BON FICHIER

**Fichier SQL** (✅ BON) :
- Extension : `.sql`
- Commence par : `--` ou `CREATE` ou `DO $$`
- Contient : `CREATE TABLE`, `ALTER TABLE`, `CREATE FUNCTION`, etc.

**Fichier TypeScript** (❌ MAUVAIS) :
- Extension : `.ts` ou `.tsx`
- Commence par : `import` ou `export`
- Contient : `const`, `function`, `interface`, etc.

---

## 📁 CHEMIN COMPLET DU FICHIER

```
/Users/sabrikhalfallah/Downloads/BTP SMART PRO/supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql
```

Ou depuis la racine du projet :
```
supabase/FIX-ALL-TABLES-MULTI-TENANT-ISOLATION.sql
```

---

## 🆘 EN CAS DE PROBLÈME

Si vous avez toujours des erreurs après avoir vérifié le fichier :

1. **Vérifiez que vous êtes dans le bon projet Supabase**
2. **Vérifiez que les tables existent** (clients, projects, etc.)
3. **Exécutez d'abord** `supabase/FIX-CLIENTS-MULTI-TENANT-ISOLATION.sql` pour tester
4. **Contactez-moi** avec le message d'erreur complet
