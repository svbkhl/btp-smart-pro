# 🧪 Guide de Test - Onglet Paiements

## ❗ IMPORTANT : Pourquoi l'onglet Paiements est vide ?

L'onglet **Paiements** affiche la section orange "Devis signés en attente de paiement" **UNIQUEMENT** si tu as des devis qui sont :
1. ✅ **Signés** (colonne `signed = true`)
2. ⏳ **Sans paiement** (pas de `payment_status` ou `payment_status = 'pending'`)

**Si tu n'as pas de devis signé, la page affichera :**
- Les 4 KPIs à zéro
- Un message "Aucun paiement"

---

## 🚀 TEST COMPLET EN 5 MINUTES

### Étape 1 : Créer un devis (1 min)

1. Va dans **IA → Onglet "Devis"**
2. Remplis le formulaire :
   ```
   Client: Test Client
   Prestation: Rénovation test
   Surface: 50
   Prix TTC: 5000
   ```
3. Click **"Générer le devis"**
4. ✅ Le devis est créé

---

### Étape 2 : Récupérer le lien de signature (30 sec)

**Option A - Depuis l'interface (si disponible) :**
- Va dans **Facturation → Devis**
- Click sur le devis → Actions → Envoyer au client
- Copie le lien de signature

**Option B - Directement depuis la base :**

1. Va dans **Supabase Dashboard**
2. Ouvre l'éditeur SQL
3. Exécute cette requête :

```sql
SELECT 
  id, 
  quote_number, 
  client_name, 
  estimated_cost,
  signed,
  signed_at
FROM ai_quotes 
ORDER BY created_at DESC 
LIMIT 5;
```

4. Copie l'`id` du dernier devis créé
5. Le lien de signature est :
   ```
   https://www.btpsmartpro.com/sign/{ID_DU_DEVIS}
   ```

---

### Étape 3 : Signer le devis (2 min)

1. **Ouvre le lien de signature** (en mode incognito si tu veux tester comme un client)
2. La page de signature s'affiche avec le devis
3. Click **"Continuer"**
4. Click **"Envoyer le code par email"**
5. **Vérifie ton email** → Copie le code OTP (6 chiffres)
   - ⚠️ En DEV : Si pas reçu, regarde la **console browser (F12)** → Le code OTP s'affiche !
6. **Colle le code** → Click "Valider"
7. **Tracer une signature OU taper ton nom**
8. Click **"Finaliser la signature"**
9. ✅ **Message de confirmation** : "Merci pour votre signature"
10. ✅ **Email de confirmation reçu** (si configuré)

---

### Étape 4 : Vérifier dans Facturation → Paiements (30 sec)

1. **Retourne dans l'app** (connecte-toi si besoin)
2. Va dans **Facturation → Onglet "Paiements"**

**Tu devrais voir :**

```
┌────────────────────────────────────────────────┐
│ 💰 Total encaissé: 0 €                        │
│ ⏳ En attente: 0 €                            │
│ 📈 Taux de réussite: 0%                       │
│ ❌ Échecs: 0                                  │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 🟠 Devis signés en attente de paiement (1)   │
│                                                │
│ 📄 DEVIS-2024-XXX | Test Client | 5,000 €    │
│    Signé le XX/XX/XXXX                        │
│    [Créer lien de paiement] ← 🔥 CLICK ICI   │
└────────────────────────────────────────────────┘
```

---

### Étape 5 : Créer un lien de paiement (1 min)

1. **Click sur "Créer lien de paiement"**
2. **Un dialog s'ouvre avec 3 options :**
   - 💰 Paiement total (100%)
   - 💵 Paiement acompte
   - 📅 Paiement en plusieurs fois

3. **Choisis "Paiement total"**
4. Click **"Créer et copier le lien"**

**✅ Ce qui se passe :**
- Le lien est créé dans Stripe
- Le lien est **copié dans ton presse-papier**
- Un **email est envoyé au client** (si configuré)
- Le paiement apparaît dans la liste avec statut **"⏳ En attente"**

---

### Étape 6 : Voir le paiement dans la liste (30 sec)

**Descends dans la page "Paiements"**

Tu verras le paiement créé :

```
┌────────────────────────────────────────────────┐
│ 💵 5,000 €  ⏳ En attente  💰 Total           │
│ Paiement #xxxxx                                │
│                                                │
│ Date: XX déc 2024                              │
│ Méthode: card                                  │
│ Devis lié: [Voir le devis]                    │
│                                                │
│ 📋 ID Stripe Payment Intent                   │
│ pi_xxxxxxxxxxxxxxxxxxxxxxxx                    │
│                                                │
│ [Ouvrir le lien] [Copier] ← 🔥 Liens actifs   │
└────────────────────────────────────────────────┘
```

---

### Étape 7 (Optionnel) : Simuler un paiement (2 min)

1. **Colle le lien** dans un nouvel onglet
2. **Page Stripe Checkout s'ouvre**
3. **Utilise une carte test :**
   ```
   Numéro: 4242 4242 4242 4242
   Date: 12/34 (ou n'importe quelle date future)
   CVC: 123
   ```
4. **Valider le paiement**
5. **Retourne dans Paiements**

**✅ Le statut doit passer à "✓ Payé"**
**✅ Les KPIs se mettent à jour automatiquement**

---

## 🎯 RÉSUMÉ

**Si l'onglet Paiements est vide, c'est normal si :**
1. ❌ Tu n'as pas encore créé de devis
2. ❌ Ton devis n'est pas encore signé
3. ❌ Tu as déjà créé un paiement pour tous tes devis signés

**Pour voir la section orange :**
1. ✅ Crée un devis
2. ✅ Signe-le (avec le workflow OTP)
3. ✅ Retourne dans Paiements

**La section orange apparaît UNIQUEMENT pour les devis signés sans paiement.**

---

## 🆘 DÉPANNAGE

### Problème 1 : Le devis n'apparaît pas après signature

**Vérifier dans Supabase :**

```sql
SELECT id, quote_number, client_name, signed, signed_at, payment_status
FROM ai_quotes
WHERE signed = true
ORDER BY created_at DESC;
```

**Si `signed = false` :**
- La signature n'a pas été enregistrée correctement
- Vérifie les logs de la fonction Edge `sign-quote`

---

### Problème 2 : Erreur "Table ai_quotes doesn't have column signed"

**Exécuter dans Supabase Dashboard :**

```sql
-- Vérifier les colonnes existantes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_quotes';
```

**Si `signed` n'existe pas :**
- Réexécute le script `ADD-SIGNATURE-COLUMNS.sql`

```sql
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signature_ip_address TEXT;
```

---

### Problème 3 : Le lien de paiement ne se crée pas

**Vérifier dans les logs browser (F12) :**
- Cherche les erreurs de la fonction `create-payment-link`
- Vérifie que Stripe est bien configuré

**Vérifier les secrets Supabase :**

```bash
npx supabase secrets list
```

**Tu devrais voir :**
- `STRIPE_SECRET_KEY`
- `APP_URL`
- `RESEND_API_KEY`

---

## ✅ CHECKLIST AVANT DE TESTER

- [ ] Compte créé et connecté
- [ ] Au moins 1 devis créé
- [ ] Le devis est signé (via le lien de signature + OTP)
- [ ] Page Facturation → Paiements ouverte
- [ ] Rafraîchir la page si besoin (F5)

---

## 🎉 C'EST TOUT !

Si tu suis ces étapes, tu **verras forcément** la section orange avec ton devis signé !

**La page n'est pas cassée, elle est juste vide si tu n'as pas de devis signés. 😊**

---

**Besoin d'aide ? Regarde les logs browser (F12) et Supabase Edge Functions Logs !**


