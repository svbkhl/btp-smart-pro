# 🚀 DÉPLOYER SEND-EMAIL MAINTENANT

## ❌ PROBLÈME

L'email n'apparaît pas dans la messagerie car la fonction `send-email-from-user` **n'est pas déployée** !

---

## ✅ SOLUTION (2 ÉTAPES)

### Étape 1: Corriger npm permissions

Copie-colle **EXACTEMENT** cette commande dans ton terminal :

```bash
sudo chown -R $(whoami) ~/.npm
```

**Il va demander ton mot de passe** → Tape-le (les caractères ne s'affichent pas, c'est normal)

### Étape 2: Déployer la fonction

Après avoir corrigé les permissions, copie-colle **EXACTEMENT** :

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO" && npx supabase functions deploy send-email-from-user --no-verify-jwt
```

**Attends que ça finisse** (peut prendre 1-2 minutes)

Tu dois voir à la fin :
```
✅ Deployed Function send-email-from-user
```

---

## 🧪 TESTER APRÈS DÉPLOIEMENT

### 1. Créer un nouveau devis
```
IA → Nouveau devis IA
Client: Test Email
Email: ton-email@gmail.com
→ Créer
```

### 2. Envoyer le devis
```
Click sur le devis → Page détail
Click "Envoyer"
→ Envoyer par email
```

### 3. Vérifier messagerie
```
Messagerie → Envoyés
→ L'email DOIT apparaître maintenant ! ✅
```

---

## 🔍 VÉRIFIER EN SQL SI PAS D'EMAIL

Si après déploiement l'email n'apparaît toujours pas :

### Ouvrir SQL Editor Supabase
https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

### Query 1: Vérifier si l'email est enregistré
```sql
SELECT 
  created_at,
  email_type,
  recipient_email,
  subject,
  status
FROM email_messages
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

**Si 0 résultats** → La fonction ne s'est pas exécutée correctement

**Si résultats visibles** → Problème d'affichage dans la messagerie

---

## 🐛 SI L'EMAIL N'APPARAÎT TOUJOURS PAS

### Vérifier les logs de la fonction

1. Aller sur Supabase Dashboard
2. Edge Functions → send-email-from-user
3. Logs
4. Chercher les erreurs

---

## 📋 COMMANDES COMPLÈTES À EXÉCUTER

Copie-colle **dans l'ordre** :

```bash
# 1. Corriger permissions npm
sudo chown -R $(whoami) ~/.npm

# 2. Aller dans le projet
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# 3. Déployer send-email-from-user
npx supabase functions deploy send-email-from-user --no-verify-jwt

# 4. Vérifier que c'est déployé
npx supabase functions list
```

**Tu dois voir `send-email-from-user` dans la liste !**

---

## 💡 POURQUOI L'EMAIL N'APPARAISSAIT PAS ?

```
Envoi devis
    ↓
send-email-from-user appelée
    ↓
❌ Fonction pas déployée
    ↓
❌ Fallback vers ancien système
    ↓
❌ Pas d'enregistrement dans email_messages
    ↓
❌ Messagerie vide
```

**Après déploiement :**

```
Envoi devis
    ↓
send-email-from-user appelée ✅
    ↓
Email envoyé via Resend ✅
    ↓
INSERT dans email_messages ✅
    ↓
Visible dans Messagerie → Envoyés ✅
```

---

**🚀 EXÉCUTE LES COMMANDES MAINTENANT ! 🚀**

**Puis renvoie un devis de test et vérifie la messagerie !**
