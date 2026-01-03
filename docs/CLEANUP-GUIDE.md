# Guide de Nettoyage et Organisation du Codebase

Ce guide explique comment utiliser les scripts automatisés pour nettoyer et organiser le code.

## 📋 Vue d'ensemble

Le projet contient plusieurs scripts pour :
1. **Détecter et supprimer le code mort**
2. **Organiser les fichiers**
3. **Nettoyer le code TypeScript**
4. **Vérifier les appels API**
5. **Ajouter la gestion d'erreurs**

## 🚀 Utilisation rapide

### Nettoyage complet (recommandé)

```bash
# Rendre le script exécutable
chmod +x scripts/cleanup-all.sh

# Exécuter le nettoyage complet
./scripts/cleanup-all.sh
```

### Scripts individuels

```bash
# 1. Vérifier les appels API (détection seulement)
tsx scripts/check-api-calls.ts

# 2. Nettoyer le code (détection)
tsx scripts/cleanup-codebase.ts

# 3. Nettoyer le code (avec corrections)
tsx scripts/cleanup-codebase.ts --fix

# 4. Organiser les fichiers (simulation)
tsx scripts/organize-files.ts --dry-run

# 5. Organiser les fichiers (avec modifications)
tsx scripts/organize-files.ts --fix
```

## 📁 Structure cible

```
src/
├── pages/              # Pages (composants de route)
├── components/
│   ├── ui/             # Composants UI réutilisables (shadcn)
│   ├── layout/         # Composants de mise en page
│   ├── forms/          # Formulaires
│   ├── dialogs/        # Dialogs et modals
│   ├── widgets/        # Widgets pour dashboard
│   ├── admin/          # Composants admin
│   ├── billing/        # Composants facturation
│   ├── invoices/       # Composants factures
│   ├── quotes/         # Composants devis
│   ├── ai/             # Composants IA
│   └── settings/       # Composants paramètres
├── hooks/              # Hooks React personnalisés
├── services/            # Services et logique métier
├── utils/               # Utilitaires et helpers
├── types/               # Types TypeScript
└── lib/                 # Bibliothèques et helpers
```

## 🔍 Détection du code mort

### Imports non utilisés

Le script détecte automatiquement :
- Les imports qui ne sont jamais utilisés
- Les exports qui ne sont jamais importés ailleurs

**Exemple :**
```typescript
// ❌ Avant
import { unusedFunction } from './utils';
import { usedFunction } from './utils';

// ✅ Après
import { usedFunction } from './utils';
```

### Variables non utilisées

Les variables non utilisées sont détectées et peuvent être supprimées.

## 🛡️ Vérifications de sécurité

### Clés service_role

**⚠️ CRITIQUE :** Aucune clé `service_role` ne doit être utilisée dans le frontend.

**Détection :**
```bash
tsx scripts/check-api-calls.ts
```

**Correction :**
- Déplacer toute logique nécessitant `service_role` vers une Edge Function
- Utiliser `supabase.functions.invoke()` depuis le frontend

**Exemple :**
```typescript
// ❌ AVANT (dans le frontend)
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
await supabaseAdmin.auth.admin.inviteUserByEmail(email);

// ✅ APRÈS (dans Edge Function)
// supabase/functions/send-invitation/index.ts
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
await supabaseAdmin.auth.admin.inviteUserByEmail(email);

// Frontend
await supabase.functions.invoke('send-invitation', { body: { email } });
```

### Gestion d'erreurs

Tous les appels API doivent avoir une gestion d'erreur explicite.

**Exemple :**
```typescript
// ❌ AVANT
const { data } = await supabase.from('users').select();

// ✅ APRÈS
try {
  const { data, error } = await supabase.from('users').select();
  if (error) throw error;
  // ...
} catch (error) {
  console.error('Erreur:', error);
  toast.error('Impossible de charger les utilisateurs');
}
```

## 🎨 Standardisation du code

### Types TypeScript

Remplacer tous les `any` par des types appropriés :

```typescript
// ❌ AVANT
function processData(data: any): any {
  return data;
}

// ✅ APRÈS
interface Data {
  id: string;
  name: string;
}

function processData(data: Data): Data {
  return data;
}
```

### Organisation des imports

Les imports sont automatiquement réorganisés :

1. Imports React
2. Imports de librairies externes
3. Imports locaux (`@/`, `./`, `../`)

**Exemple :**
```typescript
// ✅ Ordre correct
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
```

### Formatage

Utiliser Prettier pour un formatage cohérent :

```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

## 📊 Monitoring et logs

### Console logs

Utiliser des préfixes pour identifier les logs :

```typescript
// ✅ Bon
console.log('📥 Chargement des données...');
console.error('❌ Erreur:', error);
console.warn('⚠️  Avertissement:', warning);

// ❌ Éviter
console.log('data:', data);
```

### Toasts

Toutes les actions utilisateur doivent afficher un toast :

```typescript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// Succès
toast({
  title: 'Succès',
  description: 'L\'opération a réussi',
});

// Erreur
toast({
  title: 'Erreur',
  description: 'L\'opération a échoué',
  variant: 'destructive',
});
```

## 🔧 Configuration ESLint

Le fichier `.eslintrc.cjs` est configuré pour :
- Détecter les variables non utilisées
- Avertir sur les `any`
- Vérifier les hooks React

**Exécution :**
```bash
npm run lint
npm run lint -- --fix  # Corriger automatiquement
```

## 📝 Checklist de nettoyage

Avant chaque commit, vérifier :

- [ ] Aucune clé `service_role` dans le frontend
- [ ] Tous les appels API ont une gestion d'erreur
- [ ] Aucun import non utilisé
- [ ] Aucun `any` (ou justifié avec un commentaire)
- [ ] Les toasts sont utilisés pour les actions utilisateur
- [ ] Le code est formaté avec Prettier
- [ ] Pas d'erreurs TypeScript (`tsc --noEmit`)

## 🚨 Problèmes courants et solutions

### 1. "Service role key detected"

**Problème :** Une clé `service_role` est utilisée dans le frontend.

**Solution :** Déplacer la logique vers une Edge Function.

### 2. "API call without error handling"

**Problème :** Un appel API n'a pas de gestion d'erreur.

**Solution :** Ajouter un `try/catch` ou vérifier `error`.

### 3. "Unused import"

**Problème :** Un import n'est jamais utilisé.

**Solution :** Supprimer l'import ou utiliser `--fix` pour le supprimer automatiquement.

### 4. "Type 'any' detected"

**Problème :** Un type `any` est utilisé.

**Solution :** Remplacer par un type spécifique ou `unknown`.

## 📚 Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [ESLint Rules](https://eslint.org/docs/rules/)

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs du script
2. Exécuter en mode `--dry-run` d'abord
3. Vérifier que les dépendances sont installées
4. Consulter la documentation des scripts individuels







