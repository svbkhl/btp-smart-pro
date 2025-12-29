# 🚨 URGENT : Exécuter le Script SQL

## ❌ Erreur Actuelle

```
Error: La table companies n'existe pas encore. 
Exécutez le script CREATE-COMPANIES-SYSTEM.sql dans Supabase.
```

## ✅ Solution Immédiate

### Étape 1 : Ouvrir Supabase (1 minute)

1. **Va sur** : https://supabase.com/dashboard
2. **Sélectionne ton projet** : `renmjmqlmafqjzldmsgs`
3. **Clique sur** : **SQL Editor** (menu de gauche, icône 💬)

### Étape 2 : Exécuter le Script (2 minutes)

1. **Clique sur** : **"New query"** (bouton en haut)
2. **Ouvre le fichier** : `supabase/CREER-TABLE-COMPANIES.sql`
3. **Sélectionne TOUT** (Cmd+A)
4. **Copie** (Cmd+C)
5. **Colle dans l'éditeur SQL** (Cmd+V)
6. **Clique sur** : **"Run"** (ou appuie sur Cmd+Enter)

### Étape 3 : Vérifier (30 secondes)

1. **Va dans** : **Table Editor** (menu de gauche)
2. **Tu devrais voir** : `companies` dans la liste
3. **Si tu vois `companies`** → ✅ C'est bon !
4. **Si tu ne vois pas `companies`** → Réessaye le script

---

## 🔄 Après avoir exécuté le script

1. **Recharge la page** de l'application (F5)
2. **Va dans** : "Paramètres" → "Gestion des Entreprises"
3. **Clique sur** : "Nouvelle entreprise"
4. **Remplis le formulaire**
5. **Clique sur** : "Créer"

**🎉 Ça devrait fonctionner maintenant !**

---

## 📋 Checklist

- [ ] Script SQL exécuté dans Supabase
- [ ] Table `companies` visible dans Table Editor
- [ ] Page rechargée
- [ ] Test de création d'entreprise réussi

---

## 🚨 Si ça ne marche toujours pas

### Vérifier que tu es admin

Exécute cette requête dans SQL Editor :

```sql
SELECT 
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'administrateur';
```

**Si tu n'apparais pas** → Exécute ce script (remplace `TON_USER_ID`) :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('TON_USER_ID', 'administrateur')
ON CONFLICT (user_id) DO UPDATE SET role = 'administrateur';
```

**Pour trouver ton user_id** :
- Va dans **Authentication** → **Users**
- Trouve ton email
- Copie l'UUID (l'ID)

---

**⚠️ IMPORTANT : Sans exécuter le script SQL, tu ne pourras PAS créer d'entreprises !**














