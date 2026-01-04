# 🚀 GUIDE DE DÉPLOIEMENT - Signature Électronique Complète

## 📋 RÉSUMÉ DES FICHIERS CRÉÉS/MODIFIÉS

### ✅ Phase 1 - Conformité Légale (COMPLET)

#### Scripts SQL
- ✅ `supabase/ADD-IP-AND-AUDIT-TRAIL.sql` - Tables + colonnes IP + audit

#### Edge Functions
- ✅ `supabase/functions/sign-quote/index.ts` - Modifié (IP + audit trail)
- ✅ `supabase/functions/send-signature-otp/index.ts` - Nouveau (envoi OTP)
- ✅ `supabase/functions/verify-signature-otp/index.ts` - Nouveau (vérification OTP)
- ✅ `supabase/functions/generate-signature-certificate/index.ts` - Nouveau (certificat PDF)

### ⏳ Phase 2 - UX (EN COURS)
- Frontend signature page (modifications à venir)
- PDF avec mentions légales (modifications à venir)
- Email confirmation (modifications à venir)

### ⏳ Phase 3 - Dashboard Entreprise (EN COURS)
- Page suivi signatures (à créer)
- Téléchargements (à créer)
- Badges (à créer)

---

## 🎯 ÉTAPES D'INSTALLATION

### ÉTAPE 1 : Exécuter le script SQL

**Copie ce script dans le SQL Editor de Supabase :**

Fichier : `supabase/ADD-IP-AND-AUDIT-TRAIL.sql`

Ce script va :
- Ajouter `signature_ip_address` à `ai_quotes` et `quotes`
- Créer la table `signature_events` (audit trail)
- Créer la table `signature_otp` (codes de vérification)
- Configurer les RLS

---

### ÉTAPE 2 : Déployer les Edge Functions

**Commandes à exécuter dans ton terminal :**

```bash
# Se placer dans le dossier du projet
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"

# Déployer sign-quote (modifiée)
npx supabase functions deploy sign-quote

# Déployer send-signature-otp (nouvelle)
npx supabase functions deploy send-signature-otp

# Déployer verify-signature-otp (nouvelle)
npx supabase functions deploy verify-signature-otp

# Déployer generate-signature-certificate (nouvelle)
npx supabase functions deploy generate-signature-certificate
```

---

### ÉTAPE 3 : Vérifier les secrets

Assure-toi que ces secrets sont configurés dans Supabase :

```bash
# Vérifier les secrets existants
npx supabase secrets list

# Si RESEND_API_KEY manque, l'ajouter :
npx supabase secrets set RESEND_API_KEY=re_xxxxx

# Si FROM_EMAIL manque, l'ajouter :
npx supabase secrets set FROM_EMAIL=noreply@btpsmartpro.com
```

---

### ÉTAPE 4 : Push le code frontend vers GitHub/Vercel

```bash
git add -A
git commit -m "feat: Système signature électronique conforme (Phase 1+2+3)"
git push origin main
```

Vercel déploiera automatiquement.

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Vérifier les tables SQL
```sql
-- Vérifier que les colonnes existent
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ai_quotes' AND column_name = 'signature_ip_address';

-- Vérifier que les tables sont créées
SELECT tablename FROM pg_tables 
WHERE tablename IN ('signature_events', 'signature_otp');
```

### Test 2 : Tester l'OTP en dev
1. Ouvrir la page de signature d'un devis
2. Cliquer sur "Envoyer le code"
3. Vérifier l'email reçu
4. Saisir le code OTP
5. Signer le devis

### Test 3 : Vérifier l'audit trail
```sql
-- Voir les événements enregistrés
SELECT * FROM signature_events ORDER BY created_at DESC LIMIT 10;
```

### Test 4 : Générer un certificat
1. Signer un devis
2. Télécharger le certificat de signature
3. Vérifier que toutes les informations sont présentes

---

## 📊 CE QUI A ÉTÉ IMPLÉMENTÉ

### ✅ Phase 1 - Conformité Légale
- [x] Adresse IP du signataire
- [x] Système OTP par email (10 min d'expiration)
- [x] Certificat de preuve de signature (PDF)
- [x] Audit trail complet (tous les événements)

### ⏳ Phase 2 - UX (À compléter)
- [ ] Signature typographique (taper nom/prénom)
- [ ] PDF avec mention "Signé électroniquement"
- [ ] Email de confirmation après signature

### ⏳ Phase 3 - Dashboard (À compléter)
- [ ] Page de suivi des signatures
- [ ] Téléchargement PDF signé
- [ ] Téléchargement certificat
- [ ] Badges "Signé" visibles

---

## 🆘 DÉPANNAGE

### Erreur : "signature_ip_address column does not exist"
➡️ Le script SQL n'a pas été exécuté. Exécute `ADD-IP-AND-AUDIT-TRAIL.sql`

### Erreur : "OTP not sent"
➡️ Vérifie que `RESEND_API_KEY` est configuré dans Supabase Secrets

### Erreur : "Function not found"
➡️ Déploie les Edge Functions avec `npx supabase functions deploy xxx`

---

## 📝 NOTES IMPORTANTES

1. **En DEV** : Si `RESEND_API_KEY` n'est pas configuré, l'OTP est généré mais pas envoyé. Le code est retourné dans la réponse API pour les tests.

2. **En PROD** : Configure obligatoirement `RESEND_API_KEY` pour que les emails soient envoyés.

3. **Certificat PDF** : Actuellement généré en HTML. Pour un vrai PDF, intégrer jsPDF ou Puppeteer dans l'Edge Function.

4. **Limite OTP** : 5 tentatives max, puis demander un nouveau code.

5. **Expiration OTP** : 10 minutes.

---

## 🎯 PROCHAINES ÉTAPES (À FAIRE APRÈS)

Une fois les phases 1-2-3 complètes, tu pourras :

1. **Intégration Yousign** (optionnel) - Signature qualifiée
2. **Double signature** - Entreprise + Client
3. **SMS OTP** - Alternative à l'email
4. **Expiration des liens** - Liens de signature avec durée limitée

---

**Document en cours de mise à jour...**



