# 🥗 DineFit

Application web de nutrition qui aide à manger selon ses objectifs sportifs :
elle calcule vos besoins caloriques et vos macros, puis vous propose des repas
qui « rentrent » dans ce qu'il vous reste pour la journée.

## Fonctionnalités

- **Onboarding** : sexe, âge, taille, poids, niveau d'activité, objectif
  (perte de poids / maintien / prise de muscle).
- **Calcul automatique des objectifs** : métabolisme de base (Mifflin-St Jeor),
  dépense totale, calories cibles et répartition protéines / glucides / lipides.
- **Tableau de bord du jour** : anneau de calories restantes, barres de macros,
  journal par repas (petit-déjeuner, déjeuner, dîner, collations).
- **Bibliothèque de repas** : 28 repas avec macros, recherche, filtres par
  catégorie, badges (protéiné, léger, végé), quantité par demi-portion.
- **Suggestions intelligentes** : repas qui tiennent dans les calories
  restantes, avec priorité aux protéines si l'objectif l'exige.
- **Persistance locale** : profil et journal sauvegardés dans le navigateur
  (`localStorage`), un journal par jour.

## Lancer l'application

Aucune dépendance ni build — c'est un fichier HTML autonome :

```bash
# Option 1 : ouvrir directement
open dine-fit/index.html

# Option 2 : servir en local
npx serve dine-fit
```

L'interface est mobile-first (elle se comporte comme une app sur téléphone)
et fonctionne aussi sur desktop.

> ⚠️ Les valeurs caloriques sont indicatives et ne remplacent pas l'avis
> d'un professionnel de santé.
