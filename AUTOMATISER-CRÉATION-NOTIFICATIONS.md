# 🤖 Automatiser la Création de la Table Notifications

## ⚡ Méthode Automatique (Si vous avez la clé service_role)

### Prérequis

1. **Ajoutez la clé service_role dans `.env`** :
   ```
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   ```
   
   **Où trouver la clé** :
   - Supabase Dashboard → Settings → API
   - Copiez la **service_role key** (⚠️ gardez-la secrète !)

### Exécuter le Script

```bash
npm run create-notifications
```

**Note** : Cette méthode peut ne pas fonctionner car Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST standard.

---

## 🚀 Méthode Manuelle (Recommandée - 30 secondes)

### Étape 1 : Ouvrir SQL Editor

**Lien direct** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

### Étape 2 : Copier le Script

1. **Ouvrez le fichier** : `supabase/FORCER-CRÉATION-NOTIFICATIONS.sql`
2. **Sélectionnez TOUT** (Cmd+A)
3. **Copiez** (Cmd+C)

### Étape 3 : Coller et Exécuter

1. **Collez dans SQL Editor** (Cmd+V)
2. **Cliquez sur "Run"** (ou Cmd+Enter)
3. **Attendez** que le script se termine

### Étape 4 : Vérifier

Vous devriez voir :
- `✅ Table notifications créée`
- `column_count: 9`
- `policy_count: 5`

---

## ✅ Après l'Exécution

1. **Rechargez l'application** (F5)
2. **Vérifiez** que l'icône de notifications apparaît
3. **Testez** en créant un projet

---

## 🎯 Pourquoi la Méthode Manuelle ?

Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST standard pour des raisons de sécurité. La méthode manuelle est :
- ✅ Plus rapide (30 secondes)
- ✅ Plus fiable
- ✅ Plus sécurisée
- ✅ Vous voyez directement les résultats

---

**Utilisez la méthode manuelle, c'est la plus rapide !** ⚡

