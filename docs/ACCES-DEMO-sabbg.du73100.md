# Accès démo pour sabbg.du73100@gmail.com

Ce document décrit comment accorder à **sabbg.du73100@gmail.com** un accès complet à l'app comme s'il avait payé un abonnement (pour démo).

## Étapes

### 1. Inscription (prérequis)

L'utilisateur **sabbg.du73100@gmail.com** doit d'abord créer un compte :

1. Aller sur l'app (ex. https://btpsmartpro.com/auth)
2. Cliquer sur « Créer un compte » (ou « S'inscrire »)
3. Remplir le formulaire avec l'email `sabbg.du73100@gmail.com` et un mot de passe

### 2. Exécuter le script SQL

1. Ouvrir **Supabase Dashboard** → Projet → **SQL Editor**
2. Copier le contenu du fichier `supabase/scripts/GRANT-DEMO-ACCESS-sabbg.du73100.sql`
3. Coller dans l'éditeur et cliquer sur **Run**

Le script va :

- Créer une entreprise « Démo BTP Smart Pro » avec abonnement actif
- Lier l'utilisateur comme owner
- Définir `subscription_status = 'active'` (comme après paiement Stripe)

### 3. Connexion

L'utilisateur peut maintenant se connecter et accéder au dashboard sans paywall. Il verra le compte tel qu'il apparaît après un paiement d'abonnement réussi.
