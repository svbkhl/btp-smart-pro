# 🔢 Système de Numérotation Automatique

## 📋 Vue d'ensemble

Le système génère automatiquement des numéros uniques pour tous vos documents (devis et factures) selon un format clair et professionnel.

## ✨ Format des numéros

### Devis
```
DEVIS-ANNÉE-NUMÉRO
```
**Exemples** :
- `DEVIS-2024-001` → Premier devis de 2024
- `DEVIS-2024-042` → 42ème devis de 2024
- `DEVIS-2025-001` → Premier devis de 2025 (compteur repart à 1)

### Factures
```
FACTURE-ANNÉE-NUMÉRO
```
**Exemples** :
- `FACTURE-2024-001` → Première facture de 2024
- `FACTURE-2024-123` → 123ème facture de 2024
- `FACTURE-2025-001` → Première facture de 2025 (compteur repart à 1)

## 🎯 Fonctionnement

### Génération automatique
✅ **Devis** : Numéro généré automatiquement lors de la création d'un devis IA
✅ **Factures** : Numéro généré automatiquement lors de la création d'une facture

### Compteurs indépendants
- Les devis et factures ont des **compteurs séparés**
- Le compteur repart à **001** chaque nouvelle année
- Chaque utilisateur a ses **propres numéros**

### Exemple de séquence annuelle

**Année 2024** :
```
DEVIS-2024-001
DEVIS-2024-002
FACTURE-2024-001
DEVIS-2024-003
FACTURE-2024-002
FACTURE-2024-003
...
```

**Passage à 2025** :
```
DEVIS-2025-001    ← Repart à 1
FACTURE-2025-001  ← Repart à 1
DEVIS-2025-002
...
```

## 🔧 Implémentation technique

### Fichier principal
```
src/utils/documentNumbering.ts
```

### Fonctions disponibles

#### Générer un numéro de devis
```typescript
import { generateQuoteNumber } from '@/utils/documentNumbering';

const quoteNumber = await generateQuoteNumber(userId);
// Résultat: "DEVIS-2025-001"
```

#### Générer un numéro de facture
```typescript
import { generateInvoiceNumber } from '@/utils/documentNumbering';

const invoiceNumber = await generateInvoiceNumber(userId);
// Résultat: "FACTURE-2024-001"
```

#### Valider un numéro
```typescript
import { validateDocumentNumber } from '@/utils/documentNumbering';

const isValid = validateDocumentNumber("DEVIS-2024-001", "DEVIS");
// Résultat: true
```

#### Parser un numéro
```typescript
import { parseDocumentNumber } from '@/utils/documentNumbering';

const info = parseDocumentNumber("DEVIS-2024-042");
// Résultat: { type: "DEVIS", year: 2024, sequence: 42 }
```

## 📊 Intégration dans les hooks

### Hook de création de factures
**Fichier** : `src/hooks/useInvoices.ts`

```typescript
// Le numéro est généré automatiquement
const invoiceNumber = await generateInvoiceNumber(user.id);
console.log("📄 Numéro de facture généré:", invoiceNumber);

// Insertion avec le numéro
await supabase.from("invoices").insert({
  invoice_number: invoiceNumber,
  // ... autres champs
});
```

### Hook de création de devis
**Fichier** : À implémenter dans le service IA

```typescript
// Le numéro est généré automatiquement
const quoteNumber = await generateQuoteNumber(user.id);

// Insertion avec le numéro
await supabase.from("ai_quotes").insert({
  quote_number: quoteNumber,
  // ... autres champs
});
```

## 🔒 Gestion des erreurs

### En cas d'erreur de base de données
Si le système ne peut pas récupérer le dernier numéro :
```
DEVIS-2024-123456
```
- Utilise un numéro basé sur le timestamp
- Garantit l'unicité même en cas de problème

### En cas de doublon (peu probable)
- Le système interroge toujours la base avant de générer
- Incrémente automatiquement depuis le dernier numéro
- Pas de risque de collision

## ✅ Avantages du système

### 1. **Clarté**
- Format facile à lire et à comprendre
- Type de document visible immédiatement
- Année visible pour l'archivage

### 2. **Organisation**
- Compteurs séparés par type et par année
- Facilite le suivi et les statistiques
- Simplifie la comptabilité

### 3. **Professionnalisme**
- Numéros normalisés
- Format professionnel
- Conformité avec les bonnes pratiques

### 4. **Automatisation**
- Aucune intervention manuelle requise
- Pas de risque d'erreur de saisie
- Génération instantanée

## 📈 Statistiques possibles

Grâce au format structuré, vous pouvez facilement :
- **Compter** les devis par année
- **Analyser** le volume d'activité
- **Comparer** les années
- **Prévoir** le nombre de documents à venir

**Exemple** :
```sql
-- Compter les devis de 2024
SELECT COUNT(*) FROM ai_quotes 
WHERE quote_number LIKE 'DEVIS-2024-%';

-- Récupérer le dernier numéro
SELECT quote_number FROM ai_quotes 
WHERE quote_number LIKE 'DEVIS-2024-%'
ORDER BY created_at DESC LIMIT 1;
```

## 🎨 Affichage dans l'interface

Les numéros s'affichent automatiquement dans :
- ✅ Liste des devis
- ✅ Liste des factures
- ✅ Détail d'un document
- ✅ PDF générés
- ✅ Emails envoyés

## 🔄 Migration des anciens documents

Si vous avez des documents existants sans numéro :
1. Le système détecte l'absence de numéro
2. Génère un numéro au format correct
3. Commence la séquence à partir du dernier numéro existant

## 📞 Support

En cas de question sur le système de numérotation :
1. Vérifiez ce document
2. Consultez le code : `src/utils/documentNumbering.ts`
3. Vérifiez les logs dans la console (F12)

## 🚀 Évolutions futures

Fonctionnalités envisagées :
- [ ] Personnalisation du préfixe (ex: "DEV" au lieu de "DEVIS")
- [ ] Export des numéros utilisés
- [ ] Réservation de numéros
- [ ] Numéros avec préfixe entreprise

