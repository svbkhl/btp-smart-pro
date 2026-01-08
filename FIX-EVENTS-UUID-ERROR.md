# 🔧 Correction de l'erreur UUID "events" lors de l'insertion d'événements

## Problème identifié

Erreur lors de l'insertion d'un événement :
```
POST https://renmjmqlmafqjzldmsgs.supabase.co/rest/v1/events?columns=... 400 (Bad Request)
Erreur insertion event: {code: '22P02', details: null, hint: null, message: 'invalid input syntax for type uuid: "events"'}
```

## Cause probable

L'erreur suggère que la chaîne `"events"` est passée comme valeur UUID quelque part dans la requête. Cela peut provenir de :
1. Une contamination depuis l'URL `/events` (mais le code utilise déjà `auth.getUser()` et `company_users` pour éviter cela)
2. Un problème de parsing dans Supabase PostgREST lors de la construction de l'URL avec `columns=`
3. Un problème avec la façon dont `.insert()` et `.select()` sont chaînés

## Corrections appliquées

### 1. Hook `useGoogleCalendarConnection` - Affichage des connexions désactivées

**Fichier**: `src/hooks/useGoogleCalendar.ts`

**Changement**: Retiré le filtre `.eq("enabled", true)` pour permettre l'affichage de toutes les connexions, même si elles sont désactivées.

```typescript
// Avant
.eq("enabled", true)

// Après
// Ne pas filtrer par enabled=true pour voir toutes les connexions
```

**Raison**: Si une connexion existe mais que `enabled=false`, elle n'était pas retournée, donnant l'impression qu'il n'y avait pas de connexion.

### 2. Composant `GoogleCalendarConnection` - Affichage du statut

**Fichier**: `src/components/GoogleCalendarConnection.tsx`

**Changements**:
- Ajout d'un badge différent pour les connexions désactivées
- Ajout d'un message d'avertissement si la connexion est désactivée
- Affichage de toutes les informations même si `enabled=false`

**Raison**: Permet à l'utilisateur de voir qu'une connexion existe mais est désactivée, et de comprendre qu'il doit se reconnecter.

### 3. Hook `useCreateEvent` - Amélioration du débogage

**Fichier**: `src/hooks/useEvents.ts`

**Changements**:
- Ajout de logs détaillés pour le payload avant insertion
- Vérification des types des valeurs UUID
- Utilisation de `.insert([payload])` avec un tableau explicite
- Utilisation de `.select('*')` au lieu de `.select()`

**Raison**: Permet de mieux diagnostiquer si "events" est injecté quelque part dans le payload.

## Tests à effectuer

1. **Test insertion d'événement**:
   - Créer un nouvel événement depuis le calendrier
   - Vérifier les logs dans la console pour voir le payload exact
   - Vérifier que l'événement est créé sans erreur

2. **Test Google Calendar**:
   - Aller dans Paramètres > Intégrations
   - Vérifier que la connexion Google Calendar s'affiche même si `enabled=false`
   - Vérifier que le badge et le message d'avertissement s'affichent correctement
   - Se reconnecter si nécessaire

## Prochaines étapes si l'erreur persiste

Si l'erreur `invalid input syntax for type uuid: "events"` persiste après ces corrections :

1. Vérifier les logs de débogage dans la console pour voir le payload exact
2. Vérifier dans Supabase Dashboard si la table `events` a des contraintes ou triggers qui pourraient causer le problème
3. Vérifier si des RLS policies filtrent ou modifient les valeurs avant l'insertion
4. Vérifier si un trigger sur `events` essaie d'utiliser "events" comme UUID

## Déploiement

1. Commiter les changements :
   ```bash
   git add src/hooks/useEvents.ts src/hooks/useGoogleCalendar.ts src/components/GoogleCalendarConnection.tsx
   git commit -m "fix: corriger erreur UUID events et affichage Google Calendar"
   git push origin main
   ```

2. Redéployer sur Vercel (automatique après push)

3. Tester en production
