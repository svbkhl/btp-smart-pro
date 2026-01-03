# 📝 Instructions pour Exécuter le SQL dans Supabase

## ⚠️ IMPORTANT

**Ne copie PAS le SQL dans le terminal !** 

Le SQL doit être exécuté dans **Supabase SQL Editor** (interface web).

---

## ✅ Méthode Correcte

### Étape 1 : Ouvrir Supabase SQL Editor

1. Va sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new**
2. Tu verras un éditeur SQL avec un grand champ de texte

### Étape 2 : Copier le Script SQL

1. Ouvre le fichier : `supabase/DIAGNOSTIC-ET-CORRECTION-COMPANIES.sql`
2. **Sélectionne TOUT** (Cmd+A ou Ctrl+A)
3. **Copie** (Cmd+C ou Ctrl+C)

### Étape 3 : Coller dans Supabase

1. **Colle** dans le grand champ de texte de Supabase (Cmd+V ou Ctrl+V)
2. Tu devrais voir tout le script SQL dans l'éditeur

### Étape 4 : Exécuter

1. **Clique sur le bouton "Run"** (en bas à droite, ou appuie sur Cmd+Enter / Ctrl+Enter)
2. **Attends** quelques secondes
3. **Regarde les résultats** en bas de l'écran

---

## 🔧 Pour Te Donner le Rôle Admin

### Étape 1 : Ouvrir Supabase SQL Editor

1. Va sur : **https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new**

### Étape 2 : Copier ce Script

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrateur' 
FROM auth.users 
WHERE email = 'sabri.khalfallah6@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Vérification
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'administrateur';
```

### Étape 3 : Coller et Exécuter

1. **Colle** le script dans l'éditeur SQL de Supabase
2. **Clique sur "Run"**
3. **Vérifie** que tu vois ton email avec `role = 'administrateur'` dans les résultats

---

## 📸 À Quoi Ça Ressemble

```
┌─────────────────────────────────────────┐
│  Supabase SQL Editor                     │
├─────────────────────────────────────────┤
│                                          │
│  [Grand champ de texte pour le SQL]     │
│                                          │
│  CREATE TABLE IF NOT EXISTS...          │
│  ...                                     │
│                                          │
├─────────────────────────────────────────┤
│  [Run] [Save] [Clear]                   │
└─────────────────────────────────────────┘
```

---

## ❌ Ce qu'il NE FAUT PAS Faire

- ❌ Copier le SQL dans le terminal (zsh, bash, etc.)
- ❌ Essayer d'exécuter avec `psql` ou autre commande
- ❌ Utiliser la ligne de commande

## ✅ Ce qu'il FAUT Faire

- ✅ Ouvrir Supabase Dashboard dans le navigateur
- ✅ Aller dans SQL Editor
- ✅ Coller le script
- ✅ Cliquer sur "Run"

---

## 🎯 Résumé

1. **Ouvre** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
2. **Colle** le script SQL dans l'éditeur
3. **Clique** sur "Run"
4. **C'est tout !** ✅















