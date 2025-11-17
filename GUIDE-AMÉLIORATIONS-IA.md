# 🚀 Guide des Améliorations IA - BTP Smart Pro

## 📋 Vue d'ensemble

Ce guide documente toutes les améliorations IA apportées à BTP Smart Pro pour rendre la plateforme plus intelligente, efficace et ergonomique.

---

## ✅ ÉTAPE 1 : Informations d'Entreprise (TERMINÉE)

### Fichiers créés/modifiés :
- ✅ `supabase/EXTEND-USER-SETTINGS-COMPANY.sql` - Script SQL pour étendre la table
- ✅ `src/hooks/useUserSettings.ts` - Interface TypeScript mise à jour
- ✅ `src/pages/Settings.tsx` - Page Settings complète avec tous les champs

### Actions requises :
1. **Exécuter le script SQL dans Supabase** :
   - Ouvrir Supabase Dashboard → SQL Editor
   - Copier-coller le contenu de `supabase/EXTEND-USER-SETTINGS-COMPANY.sql`
   - Exécuter le script

2. **Remplir les informations d'entreprise** :
   - Aller dans Paramètres
   - Remplir tous les champs (nom, logo, SIRET, TVA, etc.)
   - Ces informations seront automatiquement utilisées dans les devis

### Champs ajoutés :
- Logo de l'entreprise
- SIRET (14 chiffres, validé)
- TVA intracommunautaire (validé)
- Ville, Code postal, Pays
- Conditions générales de vente

---

## 🚧 ÉTAPE 2 : Devis IA Amélioré (v2) - EN COURS

### Fonctionnalités à implémenter :
1. **Prix manuel** : Possibilité de saisir un prix global
2. **Calcul automatique** : L'IA calcule selon surface, type travaux, matériaux, région, saison
3. **Validation IA** : Alerte si prix anormalement bas/haut
4. **Génération PDF** : Export professionnel avec logo, infos entreprise, signature

### Fichiers à créer/modifier :
- `src/components/ai/AIQuoteGenerator.tsx` - Améliorer le composant
- `src/services/aiService.ts` - Ajouter fonctions de validation et calcul
- `src/services/pdfService.ts` - Nouveau service pour génération PDF
- `supabase/functions/generate-quote/index.ts` - Améliorer l'Edge Function

---

## 🚧 ÉTAPE 3 : Génération PDF Professionnelle

### Bibliothèque recommandée :
- `jspdf` + `jspdf-autotable` pour les tableaux
- Ou `react-pdf` pour un rendu React

### Contenu du PDF :
- En-tête avec logo et infos entreprise
- Coordonnées client
- Détails des travaux (tableau)
- Matériaux et quantités
- Total HT, TVA, TTC
- Conditions générales
- Signature électronique (optionnelle)

---

## 🚧 ÉTAPE 4 : Assistant IA Contextuel Amélioré

### Fonctionnalités :
1. **Compréhension de phrases libres** :
   - "Fais-moi un devis pour la rénovation d'une toiture de 85 m² avec tuiles à Lyon"
   - L'IA remplit automatiquement les champs

2. **Génération de texte de devis** :
   - Salutation professionnelle
   - Détails formatés
   - Remerciements

### Fichiers à modifier :
- `src/components/ai/AIAssistant.tsx`
- `supabase/functions/ai-assistant/index.ts`

---

## 🚧 ÉTAPE 5 : Analyse IA Intelligente

### Fonctionnalités :
1. **Détection de risques** :
   - Dépassement de budget probable
   - Délais serrés
   - Matériaux manquants

2. **Tableau récapitulatif** :
   - Liste des devis IA
   - État : estimé / en cours / validé / dépassé
   - Alertes visuelles

### Fichiers à créer :
- `src/components/ai/QuoteAnalysis.tsx`
- `src/services/analysisService.ts`

---

## 🚧 ÉTAPE 6 : IA Prédictive

### Fonctionnalités :
1. **Durée estimée** :
   - Calcul selon type travaux et surface
   - Exemple : "Durée estimée : 7 jours ouvrés"

2. **Planning automatique** :
   - Suggestion de créneaux dans le calendrier
   - Intégration avec le système de calendrier existant

---

## 📦 Installation des dépendances

```bash
# Pour la génération PDF
npm install jspdf jspdf-autotable

# Ou avec react-pdf
npm install @react-pdf/renderer
```

---

## 🔧 Configuration

### Variables d'environnement :
- `VITE_SUPABASE_URL` - Déjà configuré
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Déjà configuré
- `OPENAI_API_KEY` - Déjà configuré dans Supabase Secrets

---

## 📝 Notes importantes

1. **Sauvegarde automatique** : Tous les devis générés sont automatiquement sauvegardés dans `ai_quotes`
2. **Cache** : Les infos entreprise sont chargées depuis `user_settings` à chaque génération
3. **Validation** : SIRET et TVA sont validés côté serveur (SQL triggers)
4. **PDF** : Les PDFs peuvent être téléchargés ou envoyés par email

---

## 🎯 Prochaines étapes

1. ✅ Exécuter `EXTEND-USER-SETTINGS-COMPANY.sql` dans Supabase
2. 🚧 Améliorer le générateur de devis IA v2
3. 🚧 Implémenter la génération PDF
4. 🚧 Améliorer l'assistant IA contextuel
5. 🚧 Créer l'analyse IA intelligente
6. 🚧 Ajouter l'IA prédictive

---

## 📞 Support

Pour toute question ou problème, consultez les logs dans :
- Supabase Dashboard → Edge Functions → Logs
- Console du navigateur (F12)

