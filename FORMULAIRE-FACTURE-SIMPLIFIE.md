# ✅ FORMULAIRE FACTURE SIMPLIFIÉ (MODE TTC)

## 🎯 CE QUI A CHANGÉ

Le formulaire de création de facture est maintenant **identique au formulaire de devis** : simple et direct !

### ❌ AVANT (Complexe)
```
┌─────────────────────────────────────┐
│ 💰 Montant HT: [____] €             │
│ 📊 Taux TVA: [20%] ▼                │
│                                     │
│ ╔═══════════════════════════════╗   │
│ ║ 🧮 Aperçu des totaux          ║   │
│ ║ Montant HT:      1 666,67 €   ║   │
│ ║ TVA (20%):         333,33 €   ║   │
│ ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║   │
│ ║ Total TTC:       2 000,00 €   ║   │
│ ╚═══════════════════════════════╝   │
└─────────────────────────────────────┘
```

### ✅ MAINTENANT (Simple)
```
┌─────────────────────────────────────┐
│ 💰 Montant TTC (€): [____]          │
│ 📊 Taux TVA (%): [20%] ▼            │
│ 📅 Date d'échéance: [____]          │
│                                     │
│ [Créer la facture]                  │
└─────────────────────────────────────┘
```

---

## 🔧 CHANGEMENTS TECHNIQUES

### 1️⃣ Imports modifiés
```typescript
// ❌ Avant
import { Calculator, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ✅ Maintenant
import { Plus } from "lucide-react";
import { calculateFromTTC } from "@/utils/priceCalculations";
import { useToast } from "@/hooks/use-toast";
```

### 2️⃣ Schéma de validation
```typescript
// ❌ Avant
const invoiceSchema = z.object({
  amount_ht: z.string().optional(),
  // ...
});

// ✅ Maintenant
const invoiceSchema = z.object({
  amount_ttc: z.string().min(1, "Le montant TTC est requis"),
  // ...
});
```

### 3️⃣ Calculs automatiques
```typescript
// ✅ MODE TTC FIRST
const ttcAmount = parseFloat(data.amount_ttc);
const vatRateValue = parseFloat(data.vat_rate || "20");
const prices = calculateFromTTC(ttcAmount, vatRateValue);

// Le système calcule automatiquement:
// prices.total_ht   → Montant HT
// prices.vat_amount → Montant TVA
// prices.total_ttc  → Source de vérité
```

### 4️⃣ Interface simplifiée
```typescript
// ❌ Avant: Aperçu des totaux (supprimé)
<div className="p-4 bg-muted/50 rounded-lg space-y-2">
  <Calculator />
  <div>Montant HT: {totalHt}€</div>
  <div>TVA: {vatAmount}€</div>
  <div>Total TTC: {totalTtc}€</div>
</div>

// ✅ Maintenant: Juste le champ TTC
<Input
  id="amount_ttc"
  type="number"
  placeholder="0.00"
  className="[appearance:textfield] ..." // Pas de spinners
/>
```

### 5️⃣ Notifications
```typescript
// ❌ Avant
alert("Veuillez entrer un montant HT valide");

// ✅ Maintenant
toast({
  title: "Erreur",
  description: "Veuillez entrer un montant TTC valide",
  variant: "destructive",
});
```

---

## 📋 STRUCTURE DU FORMULAIRE

### Champs dans l'ordre:
1. **Client** (sélection ou nouveau)
2. **Devis associé** (optionnel)
3. **Description des travaux** *
4. **Montant TTC (€)** *
5. **Taux de TVA (%)** (défaut: 20%)
6. **Date d'échéance**

**\* = Champ requis**

---

## 🎨 COHÉRENCE VISUELLE

### Tous les formulaires similaires:
- ✅ Devis → Montant TTC
- ✅ Facture → Montant TTC
- ✅ Paiements → Montant TTC
- ✅ Signature → Montant TTC

### Règle unique:
> **Le prix saisi est TOUJOURS le prix TTC final.**  
> Le système calcule HT et TVA pour information uniquement.

---

## 🧪 TESTER (2 MINUTES)

### Étape 1: Ouvrir Facturation
https://www.btpsmartpro.com/facturation

### Étape 2: Cliquer "Nouvelle facture"
Dans l'onglet "Factures"

### Étape 3: Remplir
```
Client: Khalfallah
Description: Travaux de rénovation
Montant TTC: 2000
TVA: 20%
```

### Étape 4: Créer
✅ Facture créée avec:
- TTC = 2000 €
- HT = 1666.67 € (calculé)
- TVA = 333.33 € (calculé)

---

## 🔍 EXEMPLE DE CALCUL

### Exemple: 2400 € TTC avec 20% de TVA

```javascript
const prices = calculateFromTTC(2400, 20);

// Résultat:
{
  total_ttc: 2400.00,  // ← Saisi par l'utilisateur
  total_ht: 2000.00,   // ← Calculé: 2400 - 400
  vat_amount: 400.00,  // ← Calculé: 2400 × (20/120)
  vat_rate: 20         // ← Taux de référence
}
```

**Formule TVA:**  
`TVA = TTC × (taux / (100 + taux))`

**Formule HT:**  
`HT = TTC - TVA`

---

## 📁 FICHIERS MODIFIÉS

### Principal
```
✅ src/components/invoices/CreateInvoiceDialog.tsx
```

### Ligne de code clé
```typescript
const prices = calculateFromTTC(ttcAmount, vatRateValue);
```

### Utility utilisé
```
✅ src/utils/priceCalculations.ts
```

---

## 🎯 BÉNÉFICES

### Pour l'utilisateur:
- ✅ **Simple**: Un seul prix à saisir (TTC)
- ✅ **Rapide**: Moins de clics, pas d'aperçu
- ✅ **Cohérent**: Identique aux devis
- ✅ **Intuitif**: Le prix affiché = le prix payé

### Pour le développeur:
- ✅ **Maintenable**: Une seule logique de calcul
- ✅ **Testable**: Fonction `calculateFromTTC()` isolée
- ✅ **Réutilisable**: Utilisée partout (devis, factures, paiements)
- ✅ **Type-safe**: TypeScript + Zod validation

---

## 🚀 PROCHAINE ÉTAPE

**Attendre Vercel** (~2 minutes)  
→ Email "Deployment ready"  
→ Tester sur https://www.btpsmartpro.com

---

## 💡 RAPPEL: MODE TTC FIRST

```
┌─────────────────────────────────────┐
│ 🎯 RÈGLE MÉTIER FONDAMENTALE        │
│                                     │
│ Le prix saisi par l'entreprise      │
│ est TOUJOURS un prix TTC.           │
│                                     │
│ La TVA est calculée pour            │
│ information uniquement,             │
│ JAMAIS ajoutée.                     │
└─────────────────────────────────────┘
```

**✨ Formulaire facture maintenant identique aux devis ! 🎉**

