# 🗑️ SUPPRESSION FACTURES & DEVIS AVEC DOUBLE CONFIRMATION

## 🎯 NOUVELLE FONCTIONNALITÉ

Tu peux maintenant **supprimer n'importe quelle facture ou devis** avec une **double confirmation** pour éviter les erreurs !

---

## ✨ CE QUI A ÉTÉ AJOUTÉ

### 1️⃣ Bouton Supprimer (icône poubelle)
```
Dans chaque ligne de tableau:
┌────────────────────────────────────────┐
│ [👁️] [✉️] [🗑️] ← Nouveau bouton rouge │
└────────────────────────────────────────┘
```

### 2️⃣ Modal de Confirmation
```
┌─────────────────────────────────────┐
│ ⚠️ Confirmer la suppression         │
│                                     │
│ Êtes-vous sûr de vouloir supprimer │
│ cette facture ?                     │
│                                     │
│ Numéro: INV-2026-001                │
│ Client: Khalfallah                  │
│ Montant: 2 983,00 €                 │
│                                     │
│ Cette action est IRRÉVERSIBLE.      │
│                                     │
│ [Annuler] [Supprimer définitivement]│
└─────────────────────────────────────┘
```

---

## 🧪 TESTER (2 MINUTES)

### 1️⃣ Attendre Vercel
→ Email "Deployment ready"

### 2️⃣ Vider cache navigateur
**Cmd + Shift + R** (très important !)

### 3️⃣ Aller dans Facturation
https://www.btpsmartpro.com/facturation

### 4️⃣ Tester suppression devis
```
1. Onglet "Devis"
2. Trouver un devis à supprimer
3. Cliquer sur 🗑️ (icône rouge)
4. → Modal s'ouvre
5. Vérifier les infos affichées
6. Cliquer "Annuler" (pour tester)
7. → Modal se ferme, rien supprimé
8. Re-cliquer 🗑️
9. Cliquer "Supprimer définitivement"
10. ✅ Toast "Devis supprimé"
11. ✅ Page se rafraîchit
12. ✅ Devis disparu !
```

### 5️⃣ Tester suppression facture
```
1. Onglet "Factures"
2. Même process que pour les devis
3. ✅ Fonctionne pareil !
```

---

## 🎨 DESIGN

### Bouton poubelle
```css
Couleur: text-destructive (rouge)
Hover: bg-destructive/10 (fond rouge transparent)
Icône: Trash2 (poubelle)
Taille: h-8 w-8 (même taille que les autres)
```

### Modal de confirmation
```
Titre: "⚠️ Confirmer la suppression"
Description: Détails du document à supprimer
Warning: "Cette action est irréversible"
Boutons:
  - Annuler (gris)
  - Supprimer définitivement (rouge)
```

---

## 🔧 COMMENT ÇA MARCHE

### Backend
```typescript
const handleDeleteQuote = async (quoteId: string) => {
  try {
    // Supprimer de la base de données
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId);

    if (error) throw error;

    // Toast succès
    toast({
      title: "✅ Devis supprimé",
      description: "Le devis a été supprimé avec succès",
    });

    // Rafraîchir la page
    window.location.reload();
  } catch (error: any) {
    // Toast erreur
    toast({
      title: "❌ Erreur",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Frontend (AlertDialog)
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon">
      <Trash2 className="w-4 h-4" />
    </Button>
  </AlertDialogTrigger>
  
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>⚠️ Confirmer la suppression</AlertDialogTitle>
      <AlertDialogDescription>
        {/* Détails du document */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDelete(id)}>
        Supprimer définitivement
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📋 INFORMATIONS AFFICHÉES

### Pour un devis :
```
✅ Numéro: DEVIS-2026-004
✅ Client: Khalfallah
✅ Montant: 2 983,00 €
✅ Statut: signed
```

### Pour une facture :
```
✅ Numéro: INV-2026-001
✅ Client: Khalfallah
✅ Montant: 2 983,00 €
```

---

## ⚠️ SÉCURITÉ

### Double confirmation
1. **Click bouton 🗑️** → Ouvre modal
2. **Lire les infos** → Vérifier que c'est le bon document
3. **Click "Supprimer"** → Vraiment supprimer

### Avertissement clair
```
"Cette action est IRRÉVERSIBLE."
```

### Bouton rouge
Le bouton "Supprimer définitivement" est rouge pour alerter l'utilisateur.

---

## 💡 CAS D'USAGE

### Quand supprimer un devis ?
- ✅ Brouillon créé par erreur
- ✅ Devis refusé depuis longtemps
- ✅ Doublon accidentel
- ✅ Devis test en dev

### Quand supprimer une facture ?
- ✅ Facture brouillon incorrecte
- ✅ Facture test
- ✅ Doublon
- ✅ Erreur de saisie

### Quand NE PAS supprimer ?
- ❌ Facture payée (garder pour comptabilité)
- ❌ Devis signé avec paiement en cours
- ❌ Documents archivés importants

---

## 🔄 WORKFLOW COMPLET

```
1. Utilisateur → Click 🗑️
2. System → Ouvre AlertDialog
3. System → Affiche détails document
4. Utilisateur → Vérifie infos
5. Utilisateur → Click "Supprimer"
6. System → DELETE SQL (supabase)
7. System → Toast "Document supprimé"
8. System → window.location.reload()
9. Page → Rafraîchie sans le document
```

---

## 📁 FICHIERS MODIFIÉS

### Tables
```
✅ src/components/billing/InvoicesTable.tsx
✅ src/components/billing/QuotesTable.tsx
```

### Imports ajoutés
```typescript
import { Trash2 } from "lucide-react";
import { AlertDialog, ... } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
```

---

## 🎯 COHÉRENCE AVEC PAIEMENTS

Cette fonctionnalité est **identique** à celle des paiements :

| Feature | Devis | Factures | Paiements |
|---------|-------|----------|-----------|
| Icône | 🗑️ Trash2 | 🗑️ Trash2 | 🗑️ Trash2 |
| Couleur | Rouge | Rouge | Rouge |
| Confirmation | ✅ Double | ✅ Double | ✅ Double |
| Toast | ✅ Oui | ✅ Oui | ✅ Oui |
| Refresh | ✅ Auto | ✅ Auto | ✅ Auto |

---

## ✅ RÉSULTAT

### Avant :
```
❌ Impossible de supprimer un document
❌ Brouillons s'accumulent
❌ Doublons restent
```

### Maintenant :
```
✅ Suppression facile avec 🗑️
✅ Double confirmation sécurisée
✅ Toast feedback clair
✅ Nettoyage simple et rapide
```

---

## 🚀 PROCHAINES ÉTAPES

### Après Vercel (~2 min) :
1. **Cmd + Shift + R** pour vider cache
2. Tester sur un devis brouillon
3. Vérifier la double confirmation
4. ✅ Confirmer que ça fonctionne !

---

**🗑️ SUPPRESSION SÉCURISÉE IMPLÉMENTÉE ! ✨**

**Attends 2 minutes et teste avec Cmd+Shift+R ! 🚀**
