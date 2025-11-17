# 🎨 Intégration Frontend - Système de Notifications

## 📋 Vue d'ensemble

Ce guide vous explique comment intégrer le système de notifications dans votre application React/Lovable.

---

## 🎯 Étape 1 : Afficher les Notifications

### 1.1 Composant Notifications (Déjà Existant)

Le composant `Notifications.tsx` existe déjà et affiche les notifications. Il faut juste s'assurer qu'il est bien intégré.

**Fichier** : `src/components/Notifications.tsx`

### 1.2 Vérifier l'Intégration

Assurez-vous que le composant `Notifications` est ajouté dans votre sidebar ou header :

```tsx
// src/components/Layout.tsx ou similaire
import { Notifications } from "@/components/Notifications";

export const Layout = () => {
  return (
    <div>
      {/* ... */}
      <Notifications />
      {/* ... */}
    </div>
  );
};
```

---

## 🎯 Étape 2 : Créer un Hook pour les Notifications

### 2.1 Hook useNotifications

Créez un hook pour gérer les notifications :

```tsx
// src/hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_table?: string;
  related_id?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les notifications
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Compter les notifications non lues
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  // Marquer comme lu
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Marquer toutes comme lues
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications
        ?.filter((n) => !n.is_read)
        .map((n) => n.id) || [];

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", unreadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: notifications || [],
    isLoading,
    error,
    unreadCount,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
};
```

---

## 🎯 Étape 3 : Ajouter les Notifications en Temps Réel

### 3.1 Subscribe aux Notifications

Ajoutez un subscribe Realtime dans le composant `Notifications` :

```tsx
// Dans src/components/Notifications.tsx
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Notifications = () => {
  // ... existing code ...

  useEffect(() => {
    if (!user) return;

    // Subscribe aux nouvelles notifications
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Rafraîchir les notifications
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          
          // Afficher une notification toast
          toast({
            title: payload.new.title,
            description: payload.new.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ... rest of the code ...
};
```

---

## 🎯 Étape 4 : Créer une Page de Détail des Notifications

### 4.1 Page NotificationsDetail

Créez une page pour afficher toutes les notifications :

```tsx
// src/pages/Notifications.tsx
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Bell } from "lucide-react";

export const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune notification</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={!notification.is_read ? "border-primary" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {notification.title}
                      {!notification.is_read && (
                        <Badge variant="default">Nouveau</Badge>
                      )}
                      <Badge variant="outline">{notification.type}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p>{notification.message}</p>
                {notification.related_table && notification.related_id && (
                  <Button
                    variant="link"
                    className="mt-4"
                    onClick={() => {
                      // Naviguer vers la page correspondante
                      if (notification.related_table === "projects") {
                        window.location.href = `/projects/${notification.related_id}`;
                      } else if (notification.related_table === "ai_quotes") {
                        window.location.href = `/quotes/${notification.related_id}`;
                      }
                    }}
                  >
                    Voir les détails
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4.2 Ajouter la Route

Ajoutez la route dans `App.tsx` :

```tsx
// src/App.tsx
import { NotificationsPage } from "@/pages/Notifications";

// Dans les routes
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  }
/>
```

---

## 🎯 Étape 5 : Afficher un Badge de Notifications

### 5.1 Badge dans la Sidebar

Ajoutez un badge avec le nombre de notifications non lues :

```tsx
// src/components/Sidebar.tsx ou similaire
import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Sidebar = () => {
  const { unreadCount } = useNotifications();

  return (
    <nav>
      {/* ... */}
      <Link to="/notifications" className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Notifications
        {unreadCount > 0 && (
          <Badge variant="destructive">{unreadCount}</Badge>
        )}
      </Link>
      {/* ... */}
    </nav>
  );
};
```

---

## 🎯 Étape 6 : Afficher les Notifications Toast

### 6.1 Toast pour les Nouvelles Notifications

Ajoutez des toasts pour les nouvelles notifications :

```tsx
// Dans src/components/Notifications.tsx
import { useToast } from "@/components/ui/use-toast";

export const Notifications = () => {
  const { toast } = useToast();
  const { notifications } = useNotifications();

  useEffect(() => {
    // Afficher un toast pour les nouvelles notifications
    const newNotifications = notifications.filter(
      (n) => !n.is_read && new Date(n.created_at) > new Date(Date.now() - 5000)
    );

    newNotifications.forEach((notification) => {
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    });
  }, [notifications]);

  // ... rest of the code ...
};
```

---

## ✅ Checklist d'Intégration

- [ ] Composant `Notifications` intégré dans la sidebar/header
- [ ] Hook `useNotifications` créé
- [ ] Subscribe Realtime aux notifications
- [ ] Page de détail des notifications créée
- [ ] Route ajoutée dans `App.tsx`
- [ ] Badge de notifications non lues affiché
- [ ] Toasts pour les nouvelles notifications
- [ ] Navigation vers les détails (projets, devis, etc.)

---

## 🎯 Prochaines Étapes

1. ✅ **Tester** l'affichage des notifications
2. ✅ **Personnaliser** le design si nécessaire
3. ✅ **Ajouter** des filtres (type, date, lu/non lu)
4. ✅ **Ajouter** des actions (marquer comme lu, supprimer, etc.)

---

**L'intégration frontend est maintenant complète !** 🚀

