/**
 * Data Orchestrator
 * 
 * Centralise la logique de récupération des données
 * Gère automatiquement le mode démo vs mode réel
 * Fournit des fonctions unifiées pour tous les widgets
 */

import { useFakeDataStore } from "@/store/useFakeDataStore";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { useEmployees } from "@/hooks/useEmployees";
import { useEvents, useTodayEvents } from "@/hooks/useEvents";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import { useMemo } from "react";

// Configuration du polling automatique
const POLLING_INTERVAL = 60000; // 60 secondes
const POLLING_INTERVAL_SHORT = 30000; // 30 secondes pour les notifications

/**
 * Hook pour récupérer les statistiques
 * Retourne les stats avec polling automatique (60s)
 */
export const useStats = () => {
  const { data: stats, isLoading, error } = useUserStats();
  
  return {
    data: stats,
    isLoading,
    error,
    // Calculs dérivés
    totalRevenue: stats?.total_revenue || 0,
    totalProfit: stats?.total_profit || 0,
    activeProjects: stats?.active_projects || 0,
    completedProjects: stats?.completed_projects || 0,
    totalProjects: stats?.total_projects || 0,
    totalClients: stats?.total_clients || 0,
  };
};

/**
 * Hook pour récupérer les projets
 * Retourne les projets avec polling automatique (60s)
 */
export const useProjectsData = () => {
  const { data: projects, isLoading, error } = useProjects();
  
  return {
    data: projects || [],
    isLoading,
    error,
    // Calculs dérivés
    activeProjects: useMemo(() => 
      (projects || []).filter(p => p.status === "en_cours" || p.status === "en_attente" || p.status === "planifié"),
      [projects]
    ),
    completedProjects: useMemo(() => 
      (projects || []).filter(p => p.status === "terminé"),
      [projects]
    ),
    overdueProjects: useMemo(() => {
      const now = new Date();
      return (projects || []).filter(p => {
        if (!p.end_date || p.status === "terminé" || p.status === "annulé") return false;
        return new Date(p.end_date) < now;
      });
    }, [projects]),
    recentProjects: useMemo(() => 
      (projects || []).slice(0, 5),
      [projects]
    ),
  };
};

/**
 * Hook pour récupérer les clients
 * Retourne les clients avec polling automatique (60s)
 */
export const useClientsData = () => {
  const { data: clients, isLoading, error } = useClients();
  
  return {
    data: clients || [],
    isLoading,
    error,
    // Calculs dérivés
    recentClients: useMemo(() => 
      (clients || []).slice(0, 5),
      [clients]
    ),
    activeClients: useMemo(() => 
      (clients || []).filter(c => c.status === "actif"),
      [clients]
    ),
    totalClients: clients?.length || 0,
  };
};

/**
 * Hook pour récupérer les factures
 * Retourne les factures avec polling automatique (60s)
 */
export const useInvoicesData = () => {
  const { data: invoices, isLoading, error } = useInvoices();
  
  return {
    data: invoices || [],
    isLoading,
    error,
    // Calculs dérivés
    paidInvoices: useMemo(() => 
      (invoices || []).filter(inv => inv.status === "paid"),
      [invoices]
    ),
    pendingInvoices: useMemo(() => 
      (invoices || []).filter(inv => inv.status === "sent" || inv.status === "signed"),
      [invoices]
    ),
    overdueInvoices: useMemo(() => {
      const now = new Date();
      return (invoices || []).filter(inv => {
        if (!inv.due_date || inv.status === "paid" || inv.status === "cancelled") return false;
        return new Date(inv.due_date) < now;
      });
    }, [invoices]),
    totalRevenue: useMemo(() => 
      (invoices || []).reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0),
      [invoices]
    ),
    pendingAmount: useMemo(() => 
      (invoices || []).reduce((sum, inv) => {
        if (inv.status === "paid" || inv.status === "cancelled") return sum;
        return sum + (inv.amount_ttc || 0);
      }, 0),
      [invoices]
    ),
    recentInvoices: useMemo(() => 
      (invoices || []).slice(0, 5),
      [invoices]
    ),
  };
};

/**
 * Hook pour récupérer les devis
 * Retourne les devis avec polling automatique (60s)
 */
export const useQuotesData = () => {
  const { data: quotes, isLoading, error } = useQuotes();
  
  return {
    data: quotes || [],
    isLoading,
    error,
    // Calculs dérivés
    pendingQuotes: useMemo(() => 
      (quotes || []).filter(q => q.status === "draft" || q.status === "sent"),
      [quotes]
    ),
    acceptedQuotes: useMemo(() => 
      (quotes || []).filter(q => q.status === "accepted" || q.status === "signed"),
      [quotes]
    ),
    recentQuotes: useMemo(() => 
      (quotes || []).slice(0, 5),
      [quotes]
    ),
  };
};

/**
 * Hook pour récupérer les employés
 * Retourne les employés avec polling automatique (60s)
 */
export const useEmployeesData = () => {
  const { data: employees, isLoading, error } = useEmployees();
  
  return {
    data: employees || [],
    isLoading,
    error,
    // Calculs dérivés
    totalEmployees: employees?.length || 0,
    activeEmployees: useMemo(() => 
      (employees || []).filter(e => e.user?.email_confirmed_at),
      [employees]
    ),
    recentEmployees: useMemo(() => 
      (employees || []).slice(0, 5),
      [employees]
    ),
  };
};

/**
 * Hook pour récupérer les événements du calendrier
 * Retourne les événements avec polling automatique (60s)
 */
export const useCalendarData = () => {
  const { data: todayEvents, isLoading: todayLoading } = useTodayEvents();
  const { data: allEvents, isLoading: allLoading } = useEvents();
  
  return {
    todayEvents: todayEvents || [],
    allEvents: allEvents || [],
    isLoading: todayLoading || allLoading,
    // Calculs dérivés
    upcomingEvents: useMemo(() => {
      const now = new Date();
      return (allEvents || []).filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= now;
      }).slice(0, 5);
    }, [allEvents]),
  };
};

/**
 * Hook pour récupérer les notifications/messages
 * Retourne les notifications avec polling automatique (30s)
 */
export const useMessagesData = () => {
  const { data: notifications, isLoading, unreadCount } = useNotifications();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  
  return {
    notifications: notifications || [],
    conversations: conversations || [],
    isLoading: isLoading || conversationsLoading,
    unreadCount: unreadCount || 0,
    // Calculs dérivés
    recentNotifications: useMemo(() => 
      (notifications || []).slice(0, 5),
      [notifications]
    ),
    recentConversations: useMemo(() => 
      (conversations || []).slice(0, 5),
      [conversations]
    ),
  };
};

/**
 * Hook pour vérifier si le mode démo est activé
 */
export const useDemoMode = () => {
  const { fakeDataEnabled } = useFakeDataStore();
  const { user } = useAuth();
  
  // Mode démo uniquement si activé ET utilisateur est admin
  return fakeDataEnabled && user?.role === "admin";
};

