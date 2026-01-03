# Configuration de l'URL de signature

## Problème
Les liens de signature dans les emails utilisent `localhost` par défaut, ce qui empêche les clients de signer les devis/factures depuis leur email.

## Solution

### 1. Configurer l'URL de production dans Supabase

1. Allez dans votre projet Supabase : https://supabase.com/dashboard
2. Naviguez vers **Settings** > **Edge Functions** > **Secrets**
3. Ajoutez une des variables d'environnement suivantes :

#### Option 1 : `PUBLIC_URL` (recommandé)
```
PUBLIC_URL=https://votre-domaine.vercel.app
```
ou
```
PUBLIC_URL=https://votre-domaine.netlify.app
```

#### Option 2 : `PRODUCTION_URL`
```
PRODUCTION_URL=https://votre-domaine.vercel.app
```

#### Option 3 : `VITE_PUBLIC_URL`
```
VITE_PUBLIC_URL=https://votre-domaine.vercel.app
```

### 2. Comment obtenir votre URL de production

- **Vercel** : `https://votre-projet.vercel.app`
- **Netlify** : `https://votre-projet.netlify.app`
- **Autre** : L'URL publique de votre application

### 3. Fonctionnement

L'Edge Function `create-signature-session` utilise maintenant cette logique :

1. **D'abord**, elle essaie d'obtenir l'URL depuis les headers HTTP (`Origin` ou `Referer`)
2. **Ensuite**, elle vérifie les variables d'environnement (`PUBLIC_URL`, `PRODUCTION_URL`, `VITE_PUBLIC_URL`)
3. **Enfin**, si aucune URL valide n'est trouvée (ou si c'est localhost), elle utilise `PRODUCTION_URL` ou affiche un avertissement

### 4. Vérification

Après avoir configuré la variable d'environnement :

1. Redéployez l'Edge Function `create-signature-session` :
   ```bash
   supabase functions deploy create-signature-session
   ```

2. Testez en envoyant un devis/facture par email
3. Vérifiez que le lien dans l'email pointe vers votre domaine de production et non vers `localhost`

### 5. Exemple de lien généré

**Avant** (incorrect) :
```
http://localhost:5173/sign/abc123-def456-...
```

**Après** (correct) :
```
https://votre-domaine.vercel.app/sign/abc123-def456-...
```

## Notes importantes

- ⚠️ Ne jamais utiliser `localhost` en production
- ✅ Toujours utiliser `https://` pour les liens de signature
- 🔒 Les liens de signature sont sécurisés avec un token unique et expirent après 30 jours


















