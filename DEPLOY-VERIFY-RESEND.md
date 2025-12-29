# 🚀 Déploiement de la Fonction verify-resend-config

## Commande de Déploiement

```bash
supabase functions deploy verify-resend-config
```

## Si vous obtenez une erreur "Invalid Function name"

Le nom de la fonction doit respecter le format : `^[A-Za-z][A-Za-z0-9_-]*$`

Le nom `verify-resend-config` est valide. Si vous obtenez une erreur, essayez :

### Option 1 : Vérifier que vous êtes dans le bon répertoire

```bash
cd "/Users/sabrikhalfallah/Downloads/BTP SMART PRO"
supabase functions deploy verify-resend-config
```

### Option 2 : Utiliser le chemin complet

```bash
supabase functions deploy verify-resend-config --project-ref YOUR_PROJECT_REF
```

### Option 3 : Renommer la fonction (si nécessaire)

Si le problème persiste, vous pouvez renommer le dossier :

```bash
mv supabase/functions/verify-resend-config supabase/functions/verify-resend
supabase functions deploy verify-resend
```

## Utilisation

Une fois déployée, vous pouvez appeler la fonction :

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/verify-resend-config \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Ou via le frontend :

```typescript
const { data, error } = await supabase.functions.invoke('verify-resend-config');
console.log(data); // Affiche l'état de la configuration
```

## Note

Cette fonction est **optionnelle**. Elle sert uniquement à vérifier que la configuration Resend est correcte. Vous pouvez déployer les autres fonctions sans celle-ci :

```bash
supabase functions deploy send-email
supabase functions deploy send-email-from-user
```










