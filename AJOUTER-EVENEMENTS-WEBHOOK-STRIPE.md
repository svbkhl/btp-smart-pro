# 🎯 AJOUTER LES ÉVÉNEMENTS AU WEBHOOK STRIPE

## 📋 Étapes Ultra-Simples (1 min)

### 1️⃣ Sur la page Webhooks

Tu es déjà sur : https://dashboard.stripe.com/webhooks

Tu vois ton webhook **"BTP Smart Pro"**

### 2️⃣ Clique sur le webhook

Clique sur la ligne **"BTP Smart Pro"** pour ouvrir les détails

### 3️⃣ Clique sur "..." (3 points)

En haut à droite, tu verras **3 petits points** (...)

Clique dessus

### 4️⃣ Sélectionne "Update details"

Dans le menu qui s'ouvre, clique sur **"Update details"** ou **"Modifier les détails"**

### 5️⃣ Descends jusqu'à "Events to send"

Sur la page qui s'ouvre, descends jusqu'à la section **"Events to send"** ou **"Événements à envoyer"**

### 6️⃣ Clique sur "+ Select events" ou "Add events"

Tu verras un bouton pour ajouter des événements

### 7️⃣ Recherche et coche les 3 événements

**Dans la barre de recherche qui apparaît** :

1. **Tape** : `checkout.session.completed`
   - ✅ **Coche la case**

2. **Tape** : `payment_intent.succeeded`
   - ✅ **Coche la case**

3. **Tape** : `payment_intent.payment_failed`
   - ✅ **Coche la case**

### 8️⃣ Clique sur "Add events" en bas

En bas de la fenêtre, clique sur **"Add events"** pour valider

### 9️⃣ Clique sur "Update endpoint"

En bas de la page, clique sur **"Update endpoint"** ou **"Mettre à jour"**

---

## ✅ C'EST FAIT !

Tu devrais voir :
- ✅ **3 événements** dans la section "Listening to"
- ✅ Webhook toujours **"Actif"**

---

## 🔄 ALTERNATIVE : Créer un Nouveau Webhook

Si tu n'arrives vraiment pas à modifier l'ancien, **supprime-le et crée-en un nouveau** :

### Supprimer l'ancien :
1. Sur la page du webhook → **"..."** → **"Delete"**
2. Confirme

### Créer le nouveau :
1. **Clique** : **"+ Add endpoint"** (bouton en haut à droite)

2. **URL** :
   ```
   https://renmjmqlmafqjzldmsgs.supabase.co/functions/v1/stripe-invoice-webhook
   ```

3. **Clique** : **"+ Select events"**

4. **Recherche et coche** :
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

5. **Clique** : **"Add events"**

6. **Clique** : **"Add endpoint"**

7. **Copie le "Signing secret"** (`whsec_...`)

8. **Ajoute-le dans Supabase** :
   - https://supabase.com/dashboard/project/renmjmqlmafqjzldmsgs/settings/vault
   - "Add new secret"
   - Nom : `STRIPE_WEBHOOK_SECRET`
   - Valeur : colle le `whsec_...`

---

## 🎯 RÉSULTAT ATTENDU

Ton webhook devrait afficher :
```
Listening to:
✅ checkout.session.completed
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
```

---

**Dis-moi si ça bloque quelque part, je t'aiderai ! 💪**

