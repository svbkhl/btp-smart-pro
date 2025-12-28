# 🧪 Plan de Tests - Production Ready

_Date : 27/12/2024_  
_Application : BTP SMART PRO_  
_Environnement : Production (https://btpsmartpro.com)_

---

## 📋 CHECKLIST PRÉ-TESTS

Avant de commencer les tests, vérifier que :

- [x] Build local réussit sans erreurs
- [x] Tous les commits sont poussés vers GitHub
- [x] Vercel a déployé la dernière version
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Edge Functions déployées sur Supabase
- [ ] Base de données Supabase configurée

---

## 🔍 TESTS MANUELS CRITIQUES

### 1. TEST ROUTES PUBLIQUES - Accès Direct

**Objectif** : Vérifier qu'aucune route publique ne retourne une 404

| Route | Test | Attendu | Status | Notes |
|-------|------|---------|--------|-------|
| `/` | Ouvrir dans navigateur privé | Landing page s'affiche | ⏳ | |
| `/auth` | Accès direct | Page login s'affiche | ⏳ | |
| `/auth/callback` | Accès direct + query params | Page AuthCallback ou redirect | ⏳ | |
| `/accept-invitation` | Accès direct | Page AcceptInvitation s'affiche | ⏳ | |
| `/sign/test-uuid` | Accès direct | SignaturePage ou erreur propre | ⏳ | |
| `/signature/public/test-token` | Accès direct | PublicSignature ou erreur propre | ⏳ | |
| `/signature/document/test-id` | Accès direct | Signature ou erreur propre | ⏳ | |
| `/payment/quote/test-uuid` | Accès direct | PaymentPage ou erreur propre | ⏳ | |
| `/payment/success` | Accès direct | Page success s'affiche | ⏳ | |
| `/demo` | Accès direct | Demo page s'affiche | ⏳ | |

**Procédure** :
```bash
1. Ouvrir fenêtre navigation privée
2. Taper chaque URL manuellement
3. Vérifier : pas de 404, page charge
4. F5 (refresh) : page recharge correctement
5. F12 Console : pas d'erreur critique
```

---

### 2. TEST FLOW INVITATION COMPLÈTE

**Objectif** : Vérifier que l'invitation fonctionne de bout en bout

#### Étape 1 : Envoyer Invitation (Admin)

```bash
URL: https://btpsmartpro.com/admin/companies
Actions:
1. Se connecter en tant qu'admin
2. Aller sur "Demandes de contact"
3. Créer une nouvelle invitation
4. Email: test+[timestamp]@example.com
5. Cliquer "Envoyer l'invitation"

Attendu:
✅ Toast "Invitation envoyée avec succès !"
✅ Pas d'erreur console
✅ Email reçu dans la boîte test
```

#### Étape 2 : Recevoir Email

```bash
Vérifier:
✅ Email reçu (max 2min)
✅ Lien dans email présent
✅ Lien ne contient PAS "localhost"
✅ Lien format: https://btpsmartpro.com/auth/callback?code=...
   OU https://btpsmartpro.com/accept-invitation?token=...
```

#### Étape 3 : Cliquer sur Lien Email

```bash
Actions:
1. Cliquer sur le lien dans l'email
2. Vérifier redirection

Attendu:
✅ Redirect vers /auth/callback OU /accept-invitation
✅ AUCUNE erreur 404
✅ AUCUN message "Connexion au serveur impossible"
✅ Page charge correctement
```

#### Étape 4 : Créer Compte (si /accept-invitation)

```bash
Actions:
1. Remplir formulaire :
   - Nom: Test
   - Prénom: User
   - Mot de passe: TestPass123!
   - Confirmation: TestPass123!
2. Cliquer "Créer mon compte"

Attendu:
✅ Compte créé
✅ Redirect vers /dashboard OU /complete-profile
✅ Utilisateur connecté
```

#### Étape 5 : Vérifier Session

```bash
Actions:
1. F12 Console
2. Taper: await supabase.auth.getSession()
3. Vérifier l'objet session

Attendu:
✅ session.user.email = email de l'invitation
✅ session.access_token présent
✅ Pas d'erreur
```

**Status Global Flow Invitation** : ⏳ À tester

---

### 3. TEST FLOW SIGNATURE COMPLÈTE

**Objectif** : Vérifier que la signature fonctionne de bout en bout

#### Étape 1 : Créer Devis (Admin)

```bash
URL: https://btpsmartpro.com/quotes
Actions:
1. Se connecter
2. Créer un nouveau devis
3. Ajouter client, services, montant
4. Sauvegarder le devis
5. Noter l'UUID du devis

Attendu:
✅ Devis créé
✅ Status: draft ou pending
```

#### Étape 2 : Envoyer Devis par Email

```bash
Actions:
1. Sur la page du devis
2. Cliquer "Envoyer par email"
3. Cocher "Inclure lien de signature"
4. Email: test@example.com
5. Envoyer

Attendu:
✅ Email envoyé
✅ Lien signature dans email
✅ Format: https://btpsmartpro.com/sign/[uuid]
   OU https://btpsmartpro.com/signature/public/[token]
```

#### Étape 3 : Accéder au Lien Signature

```bash
Actions:
1. Ouvrir fenêtre privée
2. Cliquer sur le lien dans l'email

Attendu:
✅ Page SignaturePage charge
✅ AUCUNE erreur 404
✅ Devis affiché
✅ Canvas de signature visible
```

#### Étape 4 : Signer le Devis

```bash
Actions:
1. Dessiner une signature sur le canvas
2. Cliquer "Signer"

Attendu:
✅ Signature enregistrée
✅ Toast "Document signé !"
✅ Statut devis → "signed"
✅ Pas d'erreur console
```

#### Étape 5 : Vérifier Verrouillage

```bash
Actions:
1. Retourner sur page admin du devis
2. Essayer de modifier le devis

Attendu:
✅ Devis en lecture seule
✅ Boutons modification désactivés
✅ Message "Ce devis est signé"
```

#### Étape 6 : Vérifier Base de Données

```bash
SQL:
SELECT * FROM ai_quotes WHERE id = '[uuid]';

Attendu:
✅ signed_at IS NOT NULL
✅ signature_data présent
✅ status = 'signed' ou équivalent
```

**Status Global Flow Signature** : ⏳ À tester

---

### 4. TEST FLOW PAIEMENT COMPLÈTE

**Objectif** : Vérifier que le paiement ne fonctionne QUE après signature

#### Étape 1 : Essayer Paiement SANS Signature

```bash
Actions:
1. Créer devis (non signé)
2. Obtenir UUID du devis
3. Ouvrir: https://btpsmartpro.com/payment/quote/[uuid]

Attendu:
✅ Message d'erreur affiché
✅ "Ce document doit être signé avant de pouvoir être payé"
✅ AUCUN bouton paiement visible
✅ Pas de crash, gestion propre
```

#### Étape 2 : Signer le Devis

```bash
Actions:
1. Signer le devis (cf. Flow Signature)
2. Vérifier status = signed

Attendu:
✅ Devis signé
```

#### Étape 3 : Accéder au Lien Paiement

```bash
Actions:
1. Ouvrir: https://btpsmartpro.com/payment/quote/[uuid]
   OU cliquer sur le lien dans l'email

Attendu:
✅ Page PaymentPage charge
✅ Devis affiché
✅ Montant affiché
✅ Bouton "Payer" visible
```

#### Étape 4 : Créer Session Paiement

```bash
Actions:
1. Cliquer "Payer"

Attendu:
✅ Redirect vers Stripe Checkout
   OU provider de paiement configuré
✅ Session créée
✅ Pas d'erreur
```

#### Étape 5 : Simuler Paiement (Test)

```bash
Si Stripe Test Mode:
1. Utiliser carte test: 4242 4242 4242 4242
2. Date: 12/34
3. CVC: 123
4. Valider

Attendu:
✅ Paiement accepté (test)
✅ Redirect vers /payment/success
✅ Statut devis → "paid"
```

#### Étape 6 : Vérifier Double Paiement Impossible

```bash
Actions:
1. Retourner sur /payment/quote/[uuid]

Attendu:
✅ Message "Déjà payé"
✅ AUCUN bouton paiement
✅ Ou redirect automatique vers /payment/success
```

**Status Global Flow Paiement** : ⏳ À tester

---

### 5. TEST CAS D'ERREUR

**Objectif** : Vérifier que les erreurs sont gérées proprement

#### Test 1 : UUID Invalide

```bash
Routes à tester:
- /sign/invalid-uuid
- /payment/quote/invalid-uuid
- /signature/document/invalid-uuid

Attendu pour chaque:
✅ Message d'erreur clair
✅ PAS de crash
✅ PAS de 404 inattendue
✅ UI reste fonctionnelle
```

#### Test 2 : Token Invalide

```bash
Routes:
- /accept-invitation?token=invalid
- /signature/public/invalid-token

Attendu:
✅ Message "Token invalide"
✅ Pas de crash
✅ UI propre
```

#### Test 3 : Session Expirée

```bash
Actions:
1. Se connecter
2. Attendre expiration session (ou forcer dans console)
3. Faire une action protégée

Attendu:
✅ Redirect vers /auth
✅ Message "Session expirée"
✅ Pas de crash
```

#### Test 4 : Network Error

```bash
Actions:
1. Ouvrir DevTools
2. Throttling → Offline
3. Essayer d'envoyer invitation

Attendu:
✅ Message "Erreur réseau"
✅ Pas de crash
✅ Toast d'erreur
```

**Status Tests d'Erreur** : ⏳ À tester

---

### 6. TEST REFRESH NAVIGATEUR

**Objectif** : S'assurer que les routes survivent au refresh

```bash
Pour CHAQUE route publique:
1. Charger la page
2. Appuyer sur F5 (refresh)
3. Vérifier que la page recharge correctement

Routes prioritaires:
✅ /auth/callback?code=xxx
✅ /accept-invitation?token=xxx
✅ /sign/[uuid]
✅ /payment/quote/[uuid]
✅ /signature/public/[token]
```

**Attendu pour toutes** :
- Page recharge sans 404
- Pas de redirect inattendu
- État préservé (si applicable)

**Status Test Refresh** : ⏳ À tester

---

### 7. TEST CONSOLE LOGS

**Objectif** : Vérifier qu'il n'y a pas d'erreurs en production

```bash
Pour chaque test:
1. F12 → Console
2. Effacer la console
3. Effectuer l'action
4. Vérifier les logs

Attendu:
✅ AUCUNE erreur rouge
✅ AUCUN "Uncaught Error"
✅ AUCUN "404 Error: User attempted to access"
✅ Logs clairs et structurés
⚠️ Warnings OK (non bloquants)
```

**Status Test Logs** : ⏳ À tester

---

## 📊 TABLEAU RÉCAPITULATIF

| Test | Priorité | Status | Temps Estimé | Notes |
|------|----------|--------|--------------|-------|
| Routes publiques accès direct | 🔴 CRITIQUE | ⏳ | 15min | |
| Flow invitation complète | 🔴 CRITIQUE | ⏳ | 20min | |
| Flow signature complète | 🔴 CRITIQUE | ⏳ | 20min | |
| Flow paiement complète | 🔴 CRITIQUE | ⏳ | 20min | |
| Cas d'erreur | 🟠 IMPORTANT | ⏳ | 15min | |
| Refresh navigateur | 🟠 IMPORTANT | ⏳ | 10min | |
| Console logs | 🟠 IMPORTANT | ⏳ | 5min | |
| **TOTAL** | | | **~2h** | |

---

## ✅ CRITÈRES DE VALIDATION

Pour considérer l'application "Production-Ready", TOUS les critères suivants doivent être remplis :

### Critères Bloquants (MUST HAVE)

- [ ] ✅ AUCUNE route publique ne retourne 404
- [ ] ✅ Flow invitation : de l'envoi à la création de compte
- [ ] ✅ Flow signature : de l'email au devis signé et verrouillé
- [ ] ✅ Flow paiement : bloqué sans signature, fonctionne après
- [ ] ✅ Tous les liens email fonctionnent (PAS de localhost)
- [ ] ✅ Refresh navigateur fonctionne sur toutes les routes
- [ ] ✅ Aucune erreur console critique

### Critères Non-Bloquants (SHOULD HAVE)

- [ ] ⚠️ Messages d'erreur clairs et user-friendly
- [ ] ⚠️ Gestion propre des UUID invalides
- [ ] ⚠️ Gestion propre des tokens expirés
- [ ] ⚠️ Logs structurés et exploitables
- [ ] ⚠️ UI responsive sur mobile
- [ ] ⚠️ Performance acceptable (<3s chargement)

---

## 🚨 EN CAS D'ÉCHEC

Si un test échoue :

1. **Noter** : Route, Action, Erreur exacte
2. **Screenshot** : Capturer l'écran + console
3. **Reproduire** : Essayer 2-3 fois
4. **Documenter** : Créer un fichier `BUG-[date]-[description].md`
5. **Prioriser** : Bloquant = fix immédiat, Non-bloquant = backlog

---

## 📝 RAPPORT DE TEST

Après avoir effectué tous les tests, remplir :

```markdown
# Rapport de Test - [DATE]

## Résumé
- Tests effectués : X/7
- Tests réussis : X
- Tests échoués : X
- Blockers : X

## Détails
[Pour chaque test, indiquer : ✅ OK, ❌ FAIL, ⚠️ PARTIAL]

## Bugs Identifiés
1. [Description]
2. [Description]

## Recommandations
- [Action 1]
- [Action 2]

## Conclusion
- [ ] Application PRÊTE pour production
- [ ] Corrections REQUISES avant production
```

---

## 🎯 PROCHAINES ÉTAPES

1. **Avant tests** : Push Git + attendre déploiement Vercel
2. **Pendant tests** : Suivre ce plan ligne par ligne
3. **Après tests** : Créer rapport + corriger bugs bloquants
4. **Production** : Monitoring + alertes

---

_Plan créé le 27/12/2024_  
_Durée estimée : 2h_  
_Prêt à être exécuté_
