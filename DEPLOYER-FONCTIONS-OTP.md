# 🚀 DÉPLOYER LES FONCTIONS OTP - URGENT

## ❗ PROBLÈME

Les fonctions OTP existent dans le code **MAIS ne sont pas déployées** sur Supabase !

C'est pour ça que le workflow OTP ne marche pas et que tu as juste la "signature normale".

---

## ✅ SOLUTION : DÉPLOYER LES 3 FONCTIONS

### Étape 1 : Ouvrir le Terminal

Ouvre un terminal dans le dossier du projet :
```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
```

---

### Étape 2 : Déployer les 3 fonctions

**Copie et colle ces 3 commandes une par une :**

```bash
npx supabase functions deploy send-signature-otp --no-verify-jwt
```

```bash
npx supabase functions deploy verify-signature-otp --no-verify-jwt
```

```bash
npx supabase functions deploy send-signature-confirmation --no-verify-jwt
```

---

### ⚠️ Si tu as une erreur de permissions npm

Si tu vois cette erreur :
```
npm error code EPERM
npm error Your cache folder contains root-owned files
```

**Exécute d'abord cette commande :**
```bash
sudo chown -R $(whoami) "/Users/sabrikhalfallah/.npm"
```

Puis réessaye les 3 commandes de déploiement.

---

## ✅ VÉRIFIER QUE ÇA A MARCHÉ

### Option A - Supabase Dashboard

1. Va dans **Supabase Dashboard**
2. Edge Functions
3. Tu devrais voir :
   - ✅ `send-signature-otp`
   - ✅ `verify-signature-otp`
   - ✅ `send-signature-confirmation`

---

### Option B - Tester directement

1. Va sur un lien de signature : `https://www.btpsmartpro.com/sign/{quote_id}`
2. **Click "Continuer"**
3. **Click "Envoyer le code par email"**
4. **Tu devrais voir :**
   ```
   📧 Code envoyé !
   Un code de vérification a été envoyé à xxx@email.com
   ```
5. **Si tu es en DEV** : Un toast apparaît avec le code OTP !
6. **Sinon** : Regarde la console browser (F12) → Le code OTP s'affiche
7. **Colle le code** → Click "Vérifier"
8. ✅ **"Code vérifié !"** → Signature possible !

---

## 🎯 RÉSULTAT ATTENDU

**AVANT le déploiement :**
- ❌ Click "Continuer" → Erreur ou rien ne se passe
- ❌ Pas de workflow OTP
- ❌ Juste une signature "normale"

**APRÈS le déploiement :**
- ✅ Click "Continuer" → Choix méthode signature (Tracer / Taper)
- ✅ Click "Envoyer code" → Code OTP envoyé par email
- ✅ Saisir code → Vérification
- ✅ Tracer/Taper signature → Finaliser
- ✅ Message de confirmation + Email de confirmation

---

## 📋 CHECKLIST

- [ ] Exécuter `npx supabase functions deploy send-signature-otp --no-verify-jwt`
- [ ] Exécuter `npx supabase functions deploy verify-signature-otp --no-verify-jwt`
- [ ] Exécuter `npx supabase functions deploy send-signature-confirmation --no-verify-jwt`
- [ ] Vérifier dans Supabase Dashboard que les 3 fonctions sont là
- [ ] Tester sur un lien de signature
- [ ] Workflow OTP fonctionne ! ✅

---

## 🎉 UNE FOIS DÉPLOYÉ

**Ton workflow de signature sera complet :**

1. Client ouvre le lien de signature
2. Click "Continuer"
3. **Choix : Tracer signature OU Taper son nom** 🆕
4. **Click "Envoyer le code par email"** 🆕
5. **Code OTP envoyé + affiché dans toast (dev)** 🆕
6. **Client saisit le code OTP** 🆕
7. **Vérification du code** 🆕
8. **Tracer/Taper la signature** 🆕
9. **Click "Finaliser la signature"** 🆕
10. ✅ **Signature enregistrée + Email confirmation** 🆕

---

**DÉPLOIE LES 3 FONCTIONS MAINTENANT ! 🚀**
