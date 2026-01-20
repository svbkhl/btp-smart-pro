# 🔧 Configuration de verify-invite et accept-invite

## Problème

Les fonctions `verify-invite` et `accept-invite` nécessitent que la vérification JWT soit désactivée car elles doivent être accessibles aux utilisateurs non authentifiés (pour vérifier/accepter une invitation).

## Solution : Désactiver Verify JWT dans Supabase Dashboard

### Méthode 1 : Via l'Interface Web (Recommandé)

1. **Accédez au Dashboard Supabase** :
   - https://app.supabase.com
   - Sélectionnez votre projet

2. **Pour `verify-invite`** :
   - Allez dans **Edge Functions** (menu gauche)
   - Cliquez sur **verify-invite**
   - Allez dans l'onglet **Settings** ou **Configuration**
   - Trouvez l'option **"Verify JWT"** ou **"Enforce JWT verification"**
   - **Désactivez-la** (mettez sur `false` ou décochez la case)
   - Cliquez sur **Save**

3. **Pour `accept-invite`** :
   - Répétez les mêmes étapes pour la fonction **accept-invite**

### Méthode 2 : Via Supabase CLI (si disponible)

```bash
# Redéployer avec la configuration
supabase functions deploy verify-invite
supabase functions deploy accept-invite
```

Note: La configuration dans `config.toml` devrait être prise en compte lors du déploiement, mais pour Supabase Cloud, il faut parfois aussi configurer dans le Dashboard.

## Vérification

Après avoir configuré, testez en accédant à une URL d'invitation :
- L'erreur `401 - Missing authorization header` ne devrait plus apparaître
- La vérification d'invitation devrait fonctionner sans authentification

## Notes importantes

- ✅ Les fonctions utilisent déjà `serviceRoleKey` pour les opérations sécurisées
- ✅ La sécurité est assurée par le token d'invitation (hashé en SHA256)
- ✅ Désactiver JWT est nécessaire car ces fonctions sont publiques (pour vérifier/accepter les invitations)
