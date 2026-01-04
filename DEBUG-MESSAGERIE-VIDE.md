# 🔍 DEBUG : Messagerie vide

## ⚠️ PROBLÈME

Tu as déployé les fonctions mais la Messagerie est vide dans l'onglet "Envoyés".

---

## 🔎 CAUSES POSSIBLES

### 1. Mode démo activé ❌

La page Messagerie vérifie si le **mode fake data** est activé. Si oui, elle affiche des faux emails au lieu des vrais.

**Solution :**
- Va sur n'importe quelle page
- Ouvre la console (F12)
- Tape :
```javascript
localStorage.removeItem('fake-data-enabled')
```
- Rafraîchis la page (F5)

---

### 2. Aucun email envoyé encore ❓

Si tu n'as pas encore envoyé d'email depuis l'app, la table est vide.

**Solution :**
- Envoie un lien de paiement avec email
- Ou envoie un devis par email
- Attends 5-10 secondes
- Rafraîchis Messagerie

---

### 3. Table email_messages vide 📊

Vérifie si des emails sont dans la base de données.

**Solution :**

```sql
-- Exécute dans Supabase SQL Editor
SELECT COUNT(*) FROM email_messages;
```

Si le résultat est `0`, aucun email n'a été enregistré.

---

### 4. Problème RLS (permissions) 🔒

Les policies RLS peuvent bloquer la lecture.

**Solution :**

```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'email_messages';

-- Si besoin, recréer la policy
DROP POLICY IF EXISTS "Users can view their own email messages" ON email_messages;

CREATE POLICY "Users can view their own email messages"
  ON email_messages
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## ✅ VÉRIFICATIONS À FAIRE

### Étape 1 : Vérifier le mode démo

1. **Ouvre l'app** : https://www.btpsmartpro.com
2. **Ouvre la console** : F12
3. **Tape** :
```javascript
console.log('Mode démo:', localStorage.getItem('fake-data-enabled'))
```

Si le résultat est `"true"` → **C'est le problème !**

**Désactive le mode démo :**
```javascript
localStorage.removeItem('fake-data-enabled')
```

Puis rafraîchis (F5).

---

### Étape 2 : Vérifier la base de données

1. **Va sur** : https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/editor
2. **Click** "SQL Editor"
3. **Copie-colle** le script `VERIFIER-EMAILS-MESSAGERIE.sql`
4. **Click** "Run"

Tu verras :
- ✅ Nombre total d'emails
- ✅ Emails par type
- ✅ Emails récents
- ✅ Structure de la table

---

### Étape 3 : Envoyer un email de test

1. **Va sur** : https://www.btpsmartpro.com/facturation
2. **Onglet "Paiements"**
3. **Créer et envoyer un lien de paiement**
4. **Attends "✅ Email envoyé"**
5. **Ouvre la console** (F12)
6. **Vérifie les logs** :
```
✅ Email enregistré dans email_messages
```

Si tu ne vois pas ce log → L'enregistrement a échoué.

---

### Étape 4 : Vérifier dans Messagerie

1. **Va sur** : https://www.btpsmartpro.com/messaging
2. **Click** onglet "Envoyés"
3. **Ouvre la console** (F12)
4. **Vérifie les logs** :
```javascript
// Tu devrais voir :
📧 [SendPaymentLinkModal] Email trouvé...
// Et aussi :
{data: [...], count: X}
```

Si `data: []` → Aucun email trouvé.

---

### Étape 5 : Forcer le rafraîchissement

Dans la console (F12) :

```javascript
// Invalider le cache des emails
queryClient.invalidateQueries({ queryKey: ["email_messages"] })

// Rafraîchir
location.reload()
```

---

## 🛠️ SOLUTION RAPIDE

**Exécute ces commandes dans la console (F12) :**

```javascript
// 1. Désactiver mode démo
localStorage.removeItem('fake-data-enabled')

// 2. Vérifier si des emails existent
const { data } = await supabase
  .from('email_messages')
  .select('*')
  .order('sent_at', { ascending: false })
  .limit(10)

console.log('Emails trouvés:', data)

// 3. Rafraîchir
location.reload()
```

---

## 📊 VÉRIFIER EN SQL

**Copie-colle dans Supabase SQL Editor :**

```sql
-- Vérifier les emails récents
SELECT 
  id,
  recipient_email,
  subject,
  email_type,
  status,
  sent_at,
  created_at
FROM email_messages
WHERE user_id = 'TON_USER_ID' -- Remplace par ton user_id
ORDER BY sent_at DESC NULLS LAST
LIMIT 20;

-- Pour trouver ton user_id :
SELECT id, email FROM auth.users WHERE email = 'TON_EMAIL';
```

---

## 🎯 RÉSULTAT ATTENDU

Quand tout fonctionne, dans Messagerie → Envoyés :

```
┌────────────────────────────────────────┐
│ 📧 Emails envoyés (3)                  │
│                                        │
│ 💳 Votre lien de paiement - DEVIS-001 │
│ À: client@example.com                  │
│ Il y a 5 minutes                       │
│                                        │
│ ✍️ Votre devis à signer - DEVIS-001   │
│ À: client@example.com                  │
│ Il y a 2 heures                        │
└────────────────────────────────────────┘
```

---

## 🆘 SI TOUJOURS VIDE

**Partage-moi :**

1. **Résultat de la requête SQL** :
```sql
SELECT COUNT(*) FROM email_messages;
```

2. **Console logs** (F12) quand tu es sur Messagerie :
```
Copie tout ce qui contient "email" ou "messages"
```

3. **Mode démo actif ?** :
```javascript
localStorage.getItem('fake-data-enabled')
```

Je pourrai alors identifier le problème exact ! 🔍

