import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour gérer les notifications push
 * Utilise l'API Web Notifications du navigateur
 */

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

/**
 * Demande la permission pour les notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

/**
 * Envoie une notification push
 */
export async function sendPushNotification(options: NotificationOptions): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Permission de notification refusée');
      return;
    }
  }

  const notificationOptions: NotificationOptions = {
    icon: options.icon || '/logo.png',
    badge: options.badge || '/logo.png',
    tag: options.tag,
    data: options.data,
    requireInteraction: options.requireInteraction || false,
  };

  new Notification(options.title, notificationOptions);
}

/**
 * Crée une notification dans la base de données
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'urgent' | 'error' = 'info',
  relatedTable?: string,
  relatedId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      related_table: relatedTable,
      related_id: relatedId,
    });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    // Envoyer une notification push si la permission est accordée
    if (Notification.permission === 'granted') {
      await sendPushNotification({
        title,
        body: message,
        tag: type,
        data: { relatedTable, relatedId },
      });
    }
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    throw error;
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    throw error;
  }
}

/**
 * Supprime une notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    throw error;
  }
}












