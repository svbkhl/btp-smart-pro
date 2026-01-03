# 🧪 TESTER MAINTENANT - Guide Rapide

## ⏰ ATTENDRE 1 MINUTE

L'Edge Function `get-public-document` a été redéployée il y a quelques secondes.  
**Attends 30-60 secondes** avant de tester.

---

## 🎯 TEST #1 : PAGE DE SIGNATURE

### Étapes
1. **Rafraîchis la page** de signature (Ctrl+F5 ou Cmd+Shift+R)
2. **Ouvre le lien de signature** à nouveau
3. **Ouvre la console** du navigateur (F12)

### Logs Attendus (Maintenant)

```
🔍 [SignaturePage] Chargement du devis: 
  rawQuoteId: f1b5ef74-7c1f-44db-9f2c-373ab88eeaa3-mjw1x5fh
  extractedUUID: f1b5ef74-7c1f-44db-9f2c-373ab88eeaa3

📡 [SignaturePage] Réponse Edge Function: 
  status: 200 ✅  (au lieu de 404 !)
  statusText: OK
  ok: true

✅ Devis chargé avec succès!
```

### Si ça fonctionne ✅
- Le devis s'affiche
- Tu peux voir les détails
- Le canvas de signature est visible
- Tu peux signer

### Si ça ne fonctionne pas ❌
Copie-moi EXACTEMENT :
```
status: ???
errorData: ???
```

---

## 🎯 TEST #2 : ENVOI D'EMAIL

### Étapes
1. Va sur https://btpsmartpro.com/quotes
2. Ouvre un devis
3. Clique sur "Envoyer au client"
4. Remplis l'email et clique "Envoyer"

### Résultat Attendu

Tu dois voir un toast qui dit :
```
✅ Email envoyé avec succès
Le devis DEV-XXX a été envoyé avec succès à 
email@example.com (PDF inclus)
```

Le toast doit rester visible pendant **5 secondes**.

---

## 🎯 TEST #3 : STRIPE CONNECT

### Étapes
1. Va sur https://btpsmartpro.com/settings
2. Clique sur l'onglet **Stripe**
3. Vérifie que tu vois un **bouton** "Connecter mon compte Stripe" (pas de champs pour clés API)
4. Clique sur le bouton
5. Vérifie que tu es redirigé vers Stripe.com

### Résultat Attendu
- ✅ Bouton OAuth visible (pas de champs input)
- ✅ Redirection vers Stripe.com
- ✅ Login avec email/mot de passe Stripe
- ✅ Onboarding guidé
- ✅ Retour sur l'app avec statut "Connecté"

---

## 📋 CHECKLIST

- [ ] Attendre 1 minute ⏰
- [ ] Test page de signature
- [ ] Test envoi d'email
- [ ] Test Stripe Connect
- [ ] Tous les tests passent ✅

---

## 🆘 SI PROBLÈME

**Copie-moi** :
- Les logs de la console (F12)
- Le statut (200 ou 404)
- L'errorData (si erreur)

---

**Temps estimé** : 5 minutes ⏱️  
**Priorité** : Page de signature d'abord 🎯

