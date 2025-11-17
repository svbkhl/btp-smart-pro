# 🧪 Guide de Test du Système de Candidatures

## ✅ Checklist de Test

### 1. Test du Formulaire Public

#### Prérequis
- ✅ L'application est démarrée (`npm run dev`)
- ✅ Le bucket Storage `candidatures` est créé (voir `supabase/CREATE-STORAGE-CANDIDATURES.sql`)
- ✅ L'Edge Function `submit-candidature` est déployée

#### Étapes de Test

1. **Accéder au formulaire public**
   - Ouvrir : `http://localhost:5173/candidature` ou `http://localhost:5173/apply`
   - ✅ Vérifier que la page se charge sans erreur
   - ✅ Vérifier que le formulaire est visible

2. **Test de validation**
   - Essayer de soumettre le formulaire vide
   - ✅ Vérifier qu'un message d'erreur apparaît
   - ✅ Vérifier que les champs requis sont marqués avec `*`

3. **Test avec données valides**
   - Remplir :
     - Nom : "Dupont"
     - Prénom : "Jean"
     - Email : "jean.dupont@example.fr"
     - Poste souhaité : "Maçon"
     - Lettre de motivation : "Je suis très motivé..."
   - ✅ Cliquer sur "Envoyer ma candidature"
   - ✅ Vérifier qu'un message de succès apparaît
   - ✅ Vérifier que le formulaire se réinitialise

4. **Test avec CV**
   - Répéter le test précédent en ajoutant un fichier PDF
   - ✅ Vérifier que le fichier est accepté
   - ✅ Vérifier que l'upload fonctionne (si le bucket existe)

5. **Vérification dans la base de données**
   - Aller dans Supabase Dashboard > Table Editor > `candidatures`
   - ✅ Vérifier que la candidature a été créée
   - ✅ Vérifier que le score de correspondance est calculé
   - ✅ Vérifier qu'une activité RH a été créée dans `rh_activities`

---

### 2. Test de l'Import CSV

#### Prérequis
- ✅ Être connecté en tant qu'admin
- ✅ Avoir accès à `/rh/candidatures`

#### Étapes de Test

1. **Télécharger le template**
   - Aller dans `/rh/candidatures`
   - ✅ Cliquer sur "Template CSV"
   - ✅ Vérifier qu'un fichier `template-candidatures.csv` est téléchargé
   - ✅ Ouvrir le fichier et vérifier la structure

2. **Créer un fichier CSV de test**
   - Ouvrir le template
   - Ajouter quelques lignes de test :
   ```csv
   nom,prenom,email,telephone,poste_souhaite,lettre_motivation,score_correspondance,notes_internes
   Martin,Pierre,pierre.martin@example.fr,+33 6 12 34 56 78,Électricien,"Très motivé pour ce poste",75,"Candidat recommandé"
   Dubois,Marie,marie.dubois@example.fr,,Plombier,"Expérience de 5 ans",80,
   ```

3. **Importer le CSV**
   - Dans `/rh/candidatures`, cliquer sur "Importer CSV"
   - ✅ Sélectionner le fichier CSV créé
   - ✅ Vérifier que la barre de progression s'affiche
   - ✅ Vérifier qu'un message de succès apparaît avec le nombre de candidatures importées

4. **Vérification**
   - ✅ Vérifier que les candidatures apparaissent dans la liste
   - ✅ Vérifier dans Supabase que les candidatures ont été créées

---

### 3. Test de la Gestion des Candidatures (RH)

#### Étapes de Test

1. **Voir la liste des candidatures**
   - Aller dans `/rh/candidatures`
   - ✅ Vérifier que toutes les candidatures s'affichent
   - ✅ Vérifier que les filtres fonctionnent (statut, recherche)

2. **Modifier le statut**
   - Sélectionner une candidature
   - Changer le statut via le dropdown
   - ✅ Vérifier que le statut est mis à jour
   - ✅ Vérifier dans Supabase que le statut est bien modifié

3. **Voir les détails**
   - Cliquer sur "Détails" d'une candidature
   - ✅ Vérifier que le dialog s'ouvre
   - ✅ Vérifier que toutes les informations s'affichent

---

### 4. Test de l'Edge Function

#### Test manuel avec curl

```bash
curl -X POST https://[VOTRE-PROJET].supabase.co/functions/v1/submit-candidature \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [VOTRE-ANON-KEY]" \
  -d '{
    "nom": "Test",
    "prenom": "User",
    "email": "test@example.fr",
    "poste_souhaite": "Testeur",
    "lettre_motivation": "Test de candidature"
  }'
```

✅ Vérifier que la réponse est :
```json
{
  "success": true,
  "message": "Candidature enregistrée avec succès",
  "candidature_id": "..."
}
```

---

## 🐛 Problèmes Courants et Solutions

### Erreur : "Bucket not found"
**Solution** : Exécuter le script SQL `supabase/CREATE-STORAGE-CANDIDATURES.sql`

### Erreur : "Function not found"
**Solution** : Déployer l'Edge Function :
```bash
npx supabase functions deploy submit-candidature
```

### Erreur : "Missing environment variable"
**Solution** : Vérifier que le fichier `.env` contient :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_cle_anon
```

### L'import CSV ne fonctionne pas
**Vérifications** :
- ✅ Le fichier est bien un CSV
- ✅ Les colonnes sont correctes (nom, prenom, email, poste_souhaite)
- ✅ Les emails sont valides
- ✅ L'Edge Function est déployée

---

## ✅ Résultat Attendu

Après tous les tests, vous devriez avoir :
- ✅ Des candidatures créées via le formulaire public
- ✅ Des candidatures créées via l'import CSV
- ✅ Des candidatures visibles dans `/rh/candidatures`
- ✅ Des activités RH créées automatiquement
- ✅ Des scores de correspondance calculés automatiquement

---

## 📊 Vérification Finale

1. **Dans Supabase Dashboard** :
   - Table `candidatures` : Vérifier que les candidatures sont présentes
   - Table `rh_activities` : Vérifier que les activités sont créées
   - Storage `candidatures` : Vérifier que les CVs sont uploadés (si testés)

2. **Dans l'application** :
   - `/candidature` : Formulaire fonctionnel
   - `/rh/candidatures` : Liste complète avec filtres
   - Dashboard RH : Statistiques mises à jour

---

## 🎉 Si Tout Fonctionne

Le système de candidatures est **100% opérationnel** ! Les candidats peuvent maintenant :
- ✅ Postuler directement via le formulaire public
- ✅ Uploader leur CV
- ✅ Recevoir une confirmation

Et les RH peuvent :
- ✅ Voir toutes les candidatures
- ✅ Importer en masse via CSV
- ✅ Gérer les statuts
- ✅ Suivre les activités


