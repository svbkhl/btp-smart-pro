# 📘 PROJECT DEVELOPMENT STANDARDS — LOVABLE / SUPABASE / CURSOR

> **Documentation Premium pour Cursor AI**
> 
> Ce document définit les standards de développement pour garantir un code de niveau senior, propre, structuré et sans bug.

---

## 🚀 1. Architecture Générale du Projet

### Stack Technologique

Le projet utilise :

- **React** (ou Next.js)
- **TailwindCSS**
- **shadcn/ui**
- **Supabase** (auth, database, storage, edge functions)
- **API OpenAI** pour les assistants
- **Mode démo** avec fausses données
- **Dark / Light / System Mode**

### Pages Principales

- Dashboard
- RH
- Gestion Employés
- Planning
- Projets
- Notifications
- Calendrier
- Paramètres

### Objectif Général

👉 **Avoir un code propre, rapide, typé, sécurisé, réutilisable et facile à dupliquer pour les futurs clients.**

---

## 🎨 2. Front-End Standards

### 📌 Composants

Chaque composant doit être :
- ✅ **Isolé** - Fonctionne indépendamment
- ✅ **Réutilisable** - Peut être utilisé dans plusieurs contextes
- ✅ **Typé** - TypeScript strict
- ✅ **Documenté** - Commentaires clairs

**Règles strictes :**
- ❌ Pas de logique lourde dans le JSX
- ✅ Favoriser les hooks dédiés (`useEmployees`, `useProjects`, etc.)
- ✅ Utiliser les composants UI shadcn
- ✅ Layouts uniformes dans tout le projet

**Exemple de structure :**
```typescript
// ✅ BON
const EmployeeCard = ({ employee }: { employee: Employee }) => {
  const { data, isLoading } = useEmployeeDetails(employee.id);
  
  if (isLoading) return <Skeleton />;
  
  return (
    <Card>
      <CardHeader>{employee.name}</CardHeader>
      <CardContent>{data?.details}</CardContent>
    </Card>
  );
};

// ❌ MAUVAIS
const EmployeeCard = ({ employee }) => {
  return (
    <div>
      {employee && employee.data && employee.data.map(...)} // Logique dans JSX
    </div>
  );
};
```

### 📌 Styles

**Tailwind partout, jamais de CSS inline lourd.**

**Classes recommandées :**
- `animate-pulse` - Pour les loading states
- `grid`, `flex`, `gap` - Pour les layouts
- `px-6`, `py-4` - Pour les espacements
- `rounded-xl`, `shadow-sm` - Pour les effets visuels

**Exemple :**
```tsx
// ✅ BON
<div className="flex items-center gap-4 px-6 py-4 rounded-xl shadow-sm bg-card">
  <Skeleton className="h-10 w-10 rounded-full" />
  <div className="flex-1 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
</div>

// ❌ MAUVAIS
<div style={{ display: 'flex', padding: '24px', borderRadius: '12px' }}>
  {/* Styles inline */}
</div>
```

### 📌 Mode Clair/Sombre/Système

**Le thème doit fonctionner dans tout le projet :**

- ✅ Persisté dans `localStorage`
- ✅ Via un `ThemeProvider` global
- ✅ Accessible depuis toutes les pages
- ✅ Changement instantané sans rechargement

**Cursor doit s'assurer que :**
- ✔ Pas de double hydration
- ✔ Le thème s'applique instantanément
- ✔ Les icônes changent automatiquement
- ✔ Les couleurs sont cohérentes partout

**Structure recommandée :**
```typescript
// ThemeProvider.tsx
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## ⚡️ 3. Performance

### 📌 Éviter les Chargements Infinis

**Cursor DOIT :**

1. ✅ **Ajouter un timeout sur chaque requête**
   ```typescript
   const QUERY_TIMEOUT = 3000; // 3 secondes
   
   const queryWithTimeout = async <T>(
     queryFn: () => Promise<T>,
     mockData: T
   ): Promise<T> => {
     return Promise.race([
       queryFn(),
       new Promise<T>((_, reject) =>
         setTimeout(() => reject(new Error("TIMEOUT")), QUERY_TIMEOUT)
       ),
     ]).catch(() => mockData);
   };
   ```

2. ✅ **Gérer les erreurs dans un UI clean**
   ```tsx
   if (error) {
     return (
       <Alert variant="destructive">
         <AlertCircle className="h-4 w-4" />
         <AlertTitle>Erreur</AlertTitle>
         <AlertDescription>{error.message}</AlertDescription>
       </Alert>
     );
   }
   ```

3. ✅ **Empêcher les useEffect en boucle**
   ```typescript
   // ✅ BON - Dépendances correctes
   useEffect(() => {
     fetchData();
   }, [userId]); // Dépendance stable
   
   // ❌ MAUVAIS - Boucle infinie
   useEffect(() => {
     fetchData();
   }, [data]); // data change à chaque fetch → boucle
   ```

4. ✅ **Éviter les re-renders inutiles**
   ```typescript
   // Utiliser useMemo et useCallback
   const memoizedData = useMemo(() => {
     return expensiveCalculation(data);
   }, [data]);
   
   const handleClick = useCallback(() => {
     doSomething();
   }, [dependencies]);
   ```

5. ✅ **Charger les données en parallèle si possible**
   ```typescript
   // ✅ BON - Parallèle
   const [projects, employees, clients] = await Promise.all([
     fetchProjects(),
     fetchEmployees(),
     fetchClients(),
   ]);
   
   // ❌ MAUVAIS - Séquentiel
   const projects = await fetchProjects();
   const employees = await fetchEmployees();
   const clients = await fetchClients();
   ```

### 📌 Loading States Propres

**Toujours utiliser :**

- ✅ Skeletons shadcn
- ✅ Spinners minimalistes
- ✅ États : `loading`, `error`, `empty`, `success`

**Exemple complet :**
```tsx
const Dashboard = () => {
  const { data, isLoading, error } = useDashboardData();
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (error) {
    return <ErrorAlert error={error} />;
  }
  
  if (!data || data.length === 0) {
    return <EmptyState message="Aucune donnée disponible" />;
  }
  
  return <DashboardContent data={data} />;
};
```

---

## 🛢 4. Supabase Standards

### 📌 Auth

**Chaque page nécessite une vérification d'auth au chargement.**

**Ajouter un composant `RequireAuth` :**
```typescript
// ProtectedRoute.tsx
export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace('/auth');
      return;
    }
    if (requireAdmin && !isAdmin) {
      window.location.replace('/dashboard');
    }
  }, [user, loading, isAdmin, requireAdmin]);
  
  if (loading) return <LoadingSpinner />;
  if (!user) return null;
  if (requireAdmin && !isAdmin) return null;
  
  return <>{children}</>;
};
```

### 📌 Requêtes

**TOUJOURS suivre ce pattern :**

```typescript
// ✅ BON
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("column", value);

if (error) {
  console.error("Erreur Supabase:", error);
  return { data: null, error };
}

if (!data || data.length === 0) {
  return { data: [], error: null };
}

return { data, error: null };
```

**Gestion des erreurs :**
```typescript
// ✅ UI Erreur
if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Erreur de chargement</AlertTitle>
      <AlertDescription>
        {error.message || "Impossible de charger les données"}
      </AlertDescription>
    </Alert>
  );
}

// ✅ UI Empty
if (!data || data.length === 0) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Aucune donnée disponible</p>
    </div>
  );
}
```

### 📌 RLS (Row Level Security)

**Les règles doivent être claires :**

- ✅ Les employés voient uniquement leurs données
- ✅ L'admin voit tout
- ✅ Les politiques RLS sont activées sur toutes les tables

**Exemple de politique RLS :**
```sql
-- Les employés voient uniquement leurs données
CREATE POLICY "Employees can view own data"
ON employees
FOR SELECT
USING (auth.uid() = user_id);

-- L'admin voit tout
CREATE POLICY "Admins can view all"
ON employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

### 📌 Edge Functions

**Doivent toujours suivre ce format :**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request) {
  // Gérer CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialiser Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Initialiser OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    // Parser le body
    const body = await req.json();

    // Traitement
    const result = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un expert BTP spécialisé.",
        },
        {
          role: "user",
          content: body.prompt,
        },
      ],
    });

    // Réponse
    return new Response(
      JSON.stringify({ result: result.choices[0].message.content }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("Erreur Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## 🧠 5. OpenAI Standards

### 📌 Toutes les Réponses d'IA doivent :

- ✅ Être optimisées pour un assistant spécialisé BTP
- ✅ Être courtes, utiles, orientées "métier"
- ✅ Jamais renvoyer une réponse vide / corrompue
- ✅ Être typées côté front

### 📌 Format Recommandé

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "Tu es un expert BTP spécialisé. Tu aides avec précision sur les chantiers, matériaux, devis et réglementations. Réponds de manière concise et professionnelle.",
    },
    {
      role: "user",
      content: prompt,
    },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

// Validation de la réponse
if (!response.choices[0]?.message?.content) {
  throw new Error("Réponse OpenAI vide");
}

return response.choices[0].message.content;
```

### 📌 Typage Front-End

```typescript
interface AIResponse {
  content: string;
  timestamp: string;
  model: string;
}

const useAIAssistant = () => {
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sendMessage = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callAIAssistant(prompt);
      setResponse({
        content: result,
        timestamp: new Date().toISOString(),
        model: "gpt-4",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };
  
  return { response, isLoading, error, sendMessage };
};
```

---

## 🧪 6. Fake Data (Mode Démo) Standards

### 📌 Le projet doit avoir :

1. ✅ **Un toggle global** pour activer/désactiver le mode démo
   ```typescript
   // store/useFakeDataStore.ts
   export const useFakeDataStore = create<FakeDataState>()(
     persist(
       (set) => ({
         fakeDataEnabled: false,
         toggleFakeData: () => {
           set((state) => {
             const newState = !state.fakeDataEnabled;
             window.location.reload(); // Rafraîchir pour appliquer
             return { fakeDataEnabled: newState };
           });
         },
       }),
       { name: "fake-data-storage" }
     )
   );
   ```

2. ✅ **Des données fausses complètes :**
   - Employés
   - Projets
   - Chantiers
   - Planning
   - Interventions
   - RH
   - Clients
   - Devis

3. ✅ **Scripts automatiques :**
   - `seed-demo.ts` - Remplir la DB avec des données de démo
   - `purge-demo.ts` - Nettoyer les données de démo

### 📌 Structure des Fake Data

```typescript
// fakeData/index.ts
export const FAKE_EMPLOYEES = [
  {
    id: "1",
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@example.com",
    role: "employee",
    specialite: "Maçonnerie",
    // ...
  },
  // ...
];

export const FAKE_PROJECTS = [
  {
    id: "1",
    nom: "Rénovation Appartement",
    client_id: "1",
    statut: "en_cours",
    budget: 50000,
    // ...
  },
  // ...
];
```

### 📌 Intégration dans les Hooks

```typescript
// hooks/useEmployees.ts
export const useEmployees = () => {
  const { fakeDataEnabled } = useFakeDataStore();
  
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      if (fakeDataEnabled) {
        return FAKE_EMPLOYEES;
      }
      
      return queryWithTimeout(
        async () => {
          const { data, error } = await supabase
            .from("employees")
            .select("*");
          
          if (error) throw error;
          return data || [];
        },
        FAKE_EMPLOYEES,
        "employees"
      );
    },
  });
};
```

### 📌 Cursor doit :

- ✔ Intégrer le toggle dans le header/sidebar
- ✔ Faire fonctionner toutes les pages en mode démo
- ✔ Rassembler tous les fake data dans `src/fakeData/`
- ✔ Utiliser `queryWithTimeout` partout avec fallback sur fake data

---

## ⚙️ 7. Qualité du Code

### 📌 Chaque fichier doit :

- ✅ Être clair, indenté, pas de code mort
- ✅ Utiliser `async/await` (pas de callbacks)
- ✅ Être strict TypeScript si possible
- ✅ Contenir des commentaires utiles
- ✅ Suivre une architecture propre

### 📌 Structure de Dossiers

```
/src
  /components       # Composants réutilisables
    /ui            # Composants shadcn
    /layout        # Layouts (Sidebar, Header, etc.)
  /hooks           # Hooks personnalisés
  /pages           # Pages de l'application
  /utils           # Utilitaires
  /lib             # Bibliothèques (Supabase client, etc.)
  /store           # State management (Zustand)
  /fakeData        # Données de démo
  /services         # Services (AI, PDF, Storage, etc.)
/supabase
  /functions       # Edge Functions
  /migrations      # Migrations SQL
/scripts           # Scripts utilitaires
```

### 📌 Exemple de Fichier Propre

```typescript
/**
 * Hook pour gérer les employés
 * 
 * @returns {Object} Données des employés, état de chargement, erreurs
 */
export const useEmployees = () => {
  const { fakeDataEnabled } = useFakeDataStore();
  
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      // Mode démo
      if (fakeDataEnabled) {
        return FAKE_EMPLOYEES;
      }
      
      // Mode réel avec timeout
      return queryWithTimeout(
        async () => {
          const { data, error } = await supabase
            .from("employees")
            .select("*")
            .order("nom", { ascending: true });
          
          if (error) {
            throw new Error(`Erreur lors du chargement: ${error.message}`);
          }
          
          return data || [];
        },
        FAKE_EMPLOYEES,
        "employees"
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
};
```

---

## 🔧 8. Ce que Cursor doit absolument garantir

### ✅ Quand tu modifies le projet, Cursor doit :

1. ✔ **Corriger toutes les pages qui ne s'ouvrent pas**
   - Vérifier les routes
   - Vérifier les imports
   - Vérifier les erreurs de compilation

2. ✔ **Optimiser la vitesse du Dashboard**
   - Chargement parallèle des données
   - Skeletons pendant le chargement
   - Cache intelligent

3. ✔ **Ajouter les fake data partout**
   - Toutes les pages doivent fonctionner en mode démo
   - Fallback automatique sur fake data en cas d'erreur

4. ✔ **Rétablir le mode clair / sombre / système**
   - Vérifier que le ThemeProvider fonctionne
   - Tester le changement de thème
   - Vérifier la persistance dans localStorage

5. ✔ **Corriger les bugs de routes**
   - Protection des routes
   - Redirections correctes
   - Gestion des 404

6. ✔ **Rendre l'app fluide, rapide et stable**
   - Pas de re-renders inutiles
   - Pas de boucles infinies
   - Timeouts sur toutes les requêtes

7. ✔ **Préparer le projet à être dupliqué pour des clients**
   - Code propre et documenté
   - Configuration via variables d'environnement
   - Scripts d'installation automatiques

### ❌ Cursor ne doit PAS :

- ✖ Casser les pages existantes
- ✖ Supprimer des routes
- ✖ Modifier des secrets Supabase
- ✖ Casser l'intégration OpenAI
- ✖ Supprimer des fonctionnalités sans confirmation
- ✖ Introduire des dépendances non nécessaires

---

## 🎯 9. Résultat Attendu

### 📋 Après chaque intervention, Cursor doit toujours fournir :

1. ✅ **Les fichiers modifiés** - Liste claire des fichiers touchés
2. ✅ **Les raisons des modifications** - Pourquoi ces changements
3. ✅ **Un résumé clair** - Ce qui a été fait en langage simple
4. ✅ **Un plan d'amélioration possible** - Suggestions pour la suite

### 📋 Format de Résumé

```markdown
## ✅ Modifications Effectuées

### Fichiers Modifiés
- `src/pages/Dashboard.tsx` - Ajout de loading states
- `src/hooks/useEmployees.ts` - Intégration fake data
- `src/components/Sidebar.tsx` - Ajout toggle fake data

### Raisons
- Dashboard trop lent → Ajout de chargement parallèle
- Pages vides en cas d'erreur → Fallback sur fake data
- Pas de mode démo → Toggle global ajouté

### Résumé
✅ Dashboard optimisé (chargement < 1s)
✅ Mode démo fonctionnel
✅ Toutes les pages gèrent les erreurs proprement

### Améliorations Possibles
- [ ] Ajouter plus de fake data pour les tests
- [ ] Optimiser les requêtes Supabase avec des index
- [ ] Ajouter des tests unitaires
```

---

## 🎉 Conclusion

**Avec cette documentation premium, Cursor va travailler comme un développeur full-stack senior + expert Supabase + expert UI.**

### Checklist Avant Chaque Modification

- [ ] Vérifier que le code suit les standards
- [ ] Tester que les pages fonctionnent
- [ ] Vérifier les performances
- [ ] S'assurer que le mode démo fonctionne
- [ ] Vérifier le thème clair/sombre
- [ ] Documenter les changements

---

**📌 Ce document doit être consulté avant chaque modification importante du projet.**

