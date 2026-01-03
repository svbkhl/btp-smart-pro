# ⚡ Quick Fix : Supprimer l'Utilisateur Bloqué

## 🎯 Action Rapide (2 minutes)

### Étape 1 : Ouvrir Supabase SQL Editor

👉 https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

### Étape 2 : Copier-Coller et Exécuter

**Option A : Script Complet (Recommandé)**

1. **Ouvrez** : `supabase/VERIFIER-ET-SUPPRIMER-USER-BLOQUE.sql`
2. **Copiez TOUT** (Cmd+A puis Cmd+C)
3. **Collez** dans Supabase SQL Editor
4. **Cliquez** : **Run**
5. **Regardez** les résultats

**Option B : Étapes Manuelles**

#### 1️⃣ Vérifier l'utilisateur

```sql
SELECT id, email, created_at 
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';
```

**Si résultat** → Passez à l'étape 2  
**Si vide** → L'utilisateur n'existe pas, le problème vient d'ailleurs

#### 2️⃣ Supprimer (si l'utilisateur existe)

**IMPORTANT** : Identities d'abord, puis users

```sql
-- 1. Supprimer les identités
DELETE FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com'
   OR user_id IN (
     SELECT id FROM auth.users WHERE email ILIKE 'sabbg.du73100@gmail.com'
   );

-- 2. Supprimer l'utilisateur
DELETE FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com';
```

#### 3️⃣ Vérifier

```sql
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
WHERE email ILIKE 'sabbg.du73100@gmail.com'

UNION ALL

SELECT 
  'auth.identities' as table_name,
  COUNT(*) as count
FROM auth.identities
WHERE identity_data->>'email' ILIKE 'sabbg.du73100@gmail.com';
```

**Résultat attendu** : Les deux `count` = 0

---

## ✅ Après Suppression

1. **Attendez** 5-10 secondes (cache Supabase)
2. **Testez l'invitation** depuis l'application
3. **Vérifiez les logs** Supabase → Edge Functions → send-invitation → Logs

**Résultat attendu** :
```
✅ Invitation sent successfully to: sabbg.du73100@gmail.com
```

---

## 🚨 Si ça ne fonctionne toujours pas

1. **Vérifiez** que les deux compteurs sont bien à 0
2. **Vérifiez** que vous avez aussi exécuté `FIX-HANDLE-NEW-USER-TRIGGER.sql`
3. **Partagez** les nouveaux logs Supabase

---

## 📋 Checklist Rapide

- [ ] Script SQL exécuté dans Supabase
- [ ] Vérification : les deux compteurs sont à 0
- [ ] Test d'invitation effectué
- [ ] Plus d'erreur 500







