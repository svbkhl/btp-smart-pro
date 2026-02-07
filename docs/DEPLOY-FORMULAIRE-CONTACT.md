# Déploiement du formulaire de contact

## Modifications effectuées

1. **Edge Function `create-contact-request`** : crée les demandes en base via `service_role` (contourne RLS/RPC)
2. **ContactForm** : appelle l'Edge Function au lieu de `supabase.rpc`
3. **RLS** : `sabri.khalfallah6@gmail.com` peut voir et modifier les demandes dans « Demandes de contact »

## Étapes de déploiement

### 1. Vérifier que la table `contact_requests` existe

Dans Supabase → SQL Editor, exécuter si besoin :

```sql
-- Vérifier si la table existe
SELECT EXISTS (SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'contact_requests');
```

Si elle n'existe pas, exécuter `supabase/migrations/create_contact_requests_system.sql`.

### 2. Appliquer le fix RLS pour l'admin

Exécuter `supabase/migrations/20260209000001_fix_contact_requests_admin.sql` dans Supabase → SQL Editor.

### 3. Déployer les Edge Functions

```bash
# create-contact-request (formulaire sans auth)
supabase functions deploy create-contact-request --no-verify-jwt

# notify-contact-request (notification email admin)
supabase functions deploy notify-contact-request --no-verify-jwt
```

### 4. Vérifier les variables d'environnement Supabase

Dans Supabase → Edge Functions → Secrets, s'assurer que :
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définis (automatiques)
- `ADMIN_EMAIL=sabri.khalfallah6@gmail.com` (optionnel, pour les emails de notification)

## Test

1. Aller sur btpsmartpro.com
2. Cliquer sur « Demander un essai gratuit » ou ouvrir le formulaire de contact
3. Remplir et envoyer
4. Se connecter avec sabri.khalfallah6@gmail.com
5. Paramètres → Demandes de contact : la demande doit apparaître
