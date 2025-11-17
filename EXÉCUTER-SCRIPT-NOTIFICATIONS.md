# 🚀 Exécuter le Script Automatiquement

## ⚡ Méthode la Plus Simple

Je ne peux pas exécuter directement le SQL dans Supabase, mais voici la méthode la plus rapide :

### Option 1 : Copier-Coller Direct (30 secondes)

1. **Ouvrez le fichier** : `supabase/FORCER-CRÉATION-NOTIFICATIONS.sql`
2. **Sélectionnez TOUT** (Cmd+A)
3. **Copiez** (Cmd+C)
4. **Allez sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new
5. **Collez** (Cmd+V)
6. **Cliquez sur "Run"** (ou Cmd+Enter)

**C'est tout ! ✅**

---

## 📋 Contenu du Script

Le script `supabase/FORCER-CRÉATION-NOTIFICATIONS.sql` contient :

1. **Suppression** de l'ancienne table (si elle existe)
2. **Création** de la table `notifications`
3. **Création** des index
4. **Activation** de RLS
5. **Création** des 5 politiques RLS
6. **Création** de la fonction `create_notification()`
7. **Vérification** que tout est créé

---

## 🔗 Lien Direct vers SQL Editor

**Cliquez ici** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/sql/new

Puis copiez-collez le contenu de `supabase/FORCER-CRÉATION-NOTIFICATIONS.sql`

---

## ✅ Après l'Exécution

1. **Rechargez l'application** (F5)
2. **Vérifiez** que l'icône de notifications apparaît
3. **Testez** en créant un projet (cela devrait créer une notification)

---

**C'est la méthode la plus rapide !** ⚡

