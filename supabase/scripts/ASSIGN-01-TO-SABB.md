# Assigner les 7395 leads de l'Ain (01) à sabbg.du73100@gmail.com

Dans le **Supabase Dashboard** → **SQL Editor**, exécute ce script :

```sql
-- Assigne tous les leads du lot 01 (Ain) à sabbg.du73100@gmail.com
-- Retourne le nombre de leads assignés.
SELECT assign_leads_to_closer('01', 'sabbg.du73100@gmail.com') AS leads_assignes;
```

Tu devrais voir une ligne du type `leads_assignes: 7395` (ou le nombre réel de leads NEW non encore assignés pour le 01).

**Important :** L’utilisateur `sabbg.du73100@gmail.com` doit déjà exister dans **Auth → Users** (sinon la RPC lèvera "Closer non trouvé"). S’il n’existe pas, crée-le d’abord dans Supabase Auth.
