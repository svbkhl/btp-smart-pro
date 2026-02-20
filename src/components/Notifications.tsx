import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const formatDateSafe = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  } catch {
    return "—";
  }
};
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const getTypeColor = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "urgent":
      return "bg-red-500";
    case "error":
      return "bg-red-600";
    default:
      return "bg-blue-500";
  }
};

const getTypeLabel = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return "Succès";
    case "warning":
      return "Avertissement";
    case "urgent":
      return "Urgent";
    case "error":
      return "Erreur";
    default:
      return "Information";
  }
};

export const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Naviguer vers l'élément lié si disponible
    if (notification.related_table && notification.related_id) {
      switch (notification.related_table) {
        case "projects":
          navigate(`/projects/${notification.related_id}`);
          break;
        case "quotes":
          navigate("/quotes");
          break;
        case "clients":
          navigate("/clients");
          break;
        default:
          break;
      }
    }

    setOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast({
      title: "Notifications marquées comme lues",
      description: "Toutes les notifications ont été marquées comme lues.",
    });
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl relative"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Tout marquer
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
              <p className="text-sm">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Notifications non lues */}
              {unreadNotifications.length > 0 && (
                <div>
                  {unreadNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getTypeColor(notification.type))} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateSafe(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}

              {/* Notifications lues */}
              {readNotifications.length > 0 && (
                <div>
                  {readNotifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted/50 opacity-60"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getTypeColor(notification.type))} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {formatDateSafe(notification.created_at)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                navigate("/settings?tab=notifications");
                setOpen(false);
              }}
            >
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

