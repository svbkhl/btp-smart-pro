# 🧪 Guide de Test - Génération PDF Devis

## 📋 Comment Tester la Génération PDF

### 1. Via l'Interface IA (Recommandé)

1. **Allez sur** : `/ai` ou `/dashboard` → Section IA
2. **Générez un devis** :
   - Sélectionnez un client
   - Remplissez : Type de travaux, Surface, Région
   - Cliquez sur **"Générer le devis"**
3. **Attendez** que l'IA génère le devis (quelques secondes)
4. **Cliquez sur** **"Exporter PDF"**
5. **Vérifiez** :
   - ✅ Le PDF se télécharge
   - ✅ Le nom du fichier est correct (Devis_NomClient_Date.pdf)
   - ✅ Le PDF s'ouvre correctement
   - ✅ Toutes les sections sont présentes
   - ✅ Les tableaux sont bien formatés
   - ✅ Les montants sont en euros
   - ✅ La pagination fonctionne (si plusieurs pages)

### 2. Via la Page Devis

1. **Allez sur** : `/quotes`
2. **Sélectionnez un devis** existant
3. **Cliquez sur** **"Exporter PDF"**
4. **Vérifiez** le PDF généré

### 3. Test avec Données Manquantes

**Test 1 : Sans logo**
- ✅ Le PDF doit s'afficher sans logo
- ✅ Le nom de l'entreprise doit être visible

**Test 2 : Sans description IA**
- ✅ Le PDF doit s'afficher sans section description
- ✅ Les tableaux doivent être présents

**Test 3 : Sans signature**
- ✅ Un placeholder "Signature et date" doit apparaître

**Test 4 : Sans conditions générales**
- ✅ Le PDF doit s'afficher sans section CGV

---

## ✅ Checklist de Vérification

### Structure
- [ ] En-tête avec logo (si disponible)
- [ ] Nom de l'entreprise visible
- [ ] Coordonnées entreprise complètes
- [ ] Numéro de devis affiché
- [ ] Date d'émission correcte
- [ ] Informations client complètes
- [ ] Détails des travaux présents
- [ ] Description prestations (si générée par IA)
- [ ] Tableau prestations formaté
- [ ] Tableau matériaux formaté
- [ ] Total HT calculé
- [ ] TVA (20%) calculée
- [ ] Total TTC en grand
- [ ] Recommandations (si disponibles)
- [ ] Conditions générales (si disponibles)
- [ ] Signature ou placeholder

### Mise en Page
- [ ] Format portrait A4
- [ ] Marges correctes (15mm)
- [ ] Police Inter chargée (ou fallback)
- [ ] Titres en gras et bien dimensionnés
- [ ] Alignements corrects (gauche/droite/centre)
- [ ] Espacement cohérent
- [ ] Pas de débordement
- [ ] Pagination si plusieurs pages
- [ ] Numéro de page en bas

### Qualité
- [ ] Images nettes (logo, signature)
- [ ] Texte lisible
- [ ] Couleurs professionnelles
- [ ] Tableaux bien formatés
- [ ] Montants formatés en euros
- [ ] Pas de caractères bizarres

### Performance
- [ ] Génération rapide (< 5 secondes)
- [ ] Poids raisonnable (< 2 Mo généralement)
- [ ] Pas d'erreur dans la console
- [ ] Téléchargement fonctionne

---

## 🐛 Problèmes Potentiels et Solutions

### Problème : PDF ne se télécharge pas

**Causes possibles** :
- Erreur dans la génération HTML
- Erreur html2canvas
- Erreur jsPDF

**Solution** :
1. Ouvrir la console (F12)
2. Vérifier les logs `[PDF Service]`
3. Vérifier les erreurs affichées

### Problème : PDF vide ou incomplet

**Causes possibles** :
- Données manquantes
- Erreur dans le calcul des prix
- Timeout html2canvas

**Solution** :
1. Vérifier que `result` contient les données
2. Vérifier que `companyInfo` est rempli
3. Augmenter le timeout si nécessaire

### Problème : Images floues

**Causes possibles** :
- Qualité JPEG trop faible
- Images non optimisées

**Solution** :
- La qualité est à 90% par défaut
- Les images sont optimisées automatiquement

### Problème : PDF trop lourd (> 5 Mo)

**Causes possibles** :
- Images trop grandes
- Trop de pages

**Solution** :
- Les images sont automatiquement redimensionnées
- Un avertissement s'affiche en console si > 5 Mo

---

## 📊 Données de Test Recommandées

### Devis Simple
```javascript
{
  result: {
    estimatedCost: 5000,
    workSteps: [
      { step: "Préparation", description: "Préparation du chantier", cost: 500 },
      { step: "Travaux", description: "Exécution des travaux", cost: 4000 },
      { step: "Finitions", description: "Finitions et nettoyage", cost: 500 }
    ],
    materials: [
      { name: "Peinture", quantity: "10", unitCost: 25 },
      { name: "Pinceaux", quantity: "5", unitCost: 15 }
    ],
    recommendations: ["Ventiler pendant 48h", "Protéger les meubles"],
    estimatedDuration: "5 jours"
  },
  companyInfo: {
    company_name: "BTP Smart Pro",
    address: "123 Rue Example",
    postal_code: "75001",
    city: "Paris",
    siret: "12345678901234",
    vat_number: "FR12345678901",
    phone: "01 23 45 67 89",
    email: "contact@btpsmartpro.fr"
  },
  clientInfo: {
    name: "Jean Dupont",
    email: "jean@example.com",
    phone: "06 12 34 56 78",
    location: "Paris, 75001"
  },
  surface: "50",
  workType: "Rénovation complète",
  region: "Île-de-France",
  quoteDate: new Date(),
  quoteNumber: "DEV-2024-001"
}
```

---

## 🎯 Résultat Attendu

Un PDF **professionnel, complet et prêt à être envoyé** avec :
- ✅ Structure claire et professionnelle
- ✅ Toutes les informations nécessaires
- ✅ Formatage impeccable
- ✅ Qualité optimale
- ✅ Poids raisonnable

---

**Bon test !** 🚀

