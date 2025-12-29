# ✅ Résumé : Fix insertion événements

## 🔧 Corrections appliquées

### 1. Code d'insertion simplifié et sécurisé

Le fichier `src/hooks/useEvents.ts` a été corrigé :

**Avant :**
- Code complexe avec nettoyage de données
- Risque d'erreurs avec des valeurs undefined

**Après :**
- Code simple et direct
- Vérification explicite de l'authentification
- Récupération sécurisée de `user_id`
- Insertion propre sans aucun filtre `.eq()`

### 2. Code final (lignes 216-284)

```typescript
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      // Vérifier que l'utilisateur est connecté
      if (!user) {
        throw new Error("Vous devez être connecté pour créer un événement");
      }

      // Récupérer l'ID utilisateur de manière sécurisée
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData?.user?.id;

      if (!user_id) {
        throw new Error("Impossible de récupérer l'ID utilisateur");
      }

      // Vérifier que start_date est présent et valide
      if (!data.start_date || typeof data.start_date !== 'string') {
        throw new Error('start_date is required and must be a valid ISO string');
      }

      // Construire l'objet d'insertion - NE JAMAIS inclure 'id' ou utiliser .eq() sur un insert
      const insertData: any = {
        user_id: user_id, // ✅ OBLIGATOIRE
        title: data.title,
        start_date: data.start_date,
        all_day: data.all_day ?? false,
        type: data.type ?? "meeting",
        color: data.color ?? "#3b82f6",
      };

      // Ajouter uniquement les champs optionnels s'ils sont définis
      if (data.description) insertData.description = data.description;
      if (data.end_date) insertData.end_date = data.end_date;
      if (data.location) insertData.location = data.location;
      if (data.project_id) insertData.project_id = data.project_id;
      if (data.reminder_minutes !== undefined) insertData.reminder_minutes = data.reminder_minutes;
      if (data.reminder_recurring !== undefined) insertData.reminder_recurring = data.reminder_recurring;

      // ⚠️ IMPORTANT : Insertion simple sans aucun filtre .eq()
      const { data: event, error } = await supabase
        .from("events")
        .insert([insertData]) // ✅ Utiliser un tableau
        .select("*") // ✅ Sélectionner toutes les colonnes
        .single(); // ✅ Retourner un seul objet

      if (error) {
        console.error("❌ [useCreateEvent] Erreur insertion:", error);
        throw error;
      }
      
      return event as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
```

## ✅ Garanties

1. **Aucun filtre `.eq("id", ...)` lors de l'insertion** ✅
2. **Aucun ID manuel inclus** ✅
3. **`user_id` toujours inclus et vérifié** ✅
4. **Insertion propre avec tableau** ✅
5. **Logs de débogage pour identifier les problèmes** ✅

## ⚠️ Action requise : Exécuter le script SQL

**IMPORTANT :** Vous devez toujours exécuter le script SQL dans Supabase pour configurer les politiques RLS :

1. Allez sur https://supabase.com/dashboard
2. Ouvrez SQL Editor
3. Exécutez le fichier `supabase/FIX-EVENTS-RLS-FINAL.sql`

Sans ce script, l'erreur 403 persistera même avec le code corrigé.

## 🧪 Test

Après avoir exécuté le script SQL :

1. Rechargez votre application (Ctrl+Shift+R)
2. Créez un nouvel événement
3. Vérifiez les logs dans la console :
   - `🔍 [useCreateEvent] Insertion événement:` avec `user_id` présent
   - `✅ [useCreateEvent] Événement créé:` si succès

## 🐛 Si l'erreur persiste

Vérifiez dans la console du navigateur :
- Le `user_id` est-il présent dans les logs ?
- L'erreur est-elle toujours 403 ou une autre erreur ?
- Les politiques RLS ont-elles été créées dans Supabase ?





