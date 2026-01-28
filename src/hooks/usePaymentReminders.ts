import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { useToast } from "@/components/ui/use-toast";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";
import { logger } from "@/utils/logger";
import type { PaymentReminder, ReminderTemplate, CreateReminderTemplateData, OverdueInvoice, ReminderStats } from "@/types/reminders";

// Hook pour récupérer les factures impayées
export const useOverdueInvoices = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["overdue-invoices", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("useOverdueInvoices: No user or company_id");
        return [];
      }

      const { data, error } = await supabase.rpc('get_overdue_invoices');

      if (error) throw error;
      return (data || []) as OverdueInvoice[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour récupérer les templates de relance
export const useReminderTemplates = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["reminder-templates", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("useReminderTemplates: No user or company_id");
        return [];
      }

      const { data, error } = await supabase
        .from("reminder_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("reminder_level", { ascending: true });

      if (error) throw error;
      return (data || []) as ReminderTemplate[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour récupérer l'historique des relances
export const usePaymentReminders = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["payment-reminders", companyId],
    queryFn: async () => {
      if (!user || !companyId) {
        logger.warn("usePaymentReminders: No user or company_id");
        return [];
      }

      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as PaymentReminder[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

// Hook pour créer/mettre à jour un template
export const useUpsertReminderTemplate = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateReminderTemplateData & { id?: string }) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { id, ...templateData } = data;

      if (id) {
        // Update
        const { data: template, error } = await supabase
          .from("reminder_templates")
          .update(templateData)
          .eq("id", id)
          .eq("company_id", companyId)
          .select()
          .single();

        if (error) throw error;
        return template as ReminderTemplate;
      } else {
        // Insert
        const { data: template, error } = await supabase
          .from("reminder_templates")
          .insert({
            ...templateData,
            company_id: companyId,
          })
          .select()
          .single();

        if (error) throw error;
        return template as ReminderTemplate;
      }
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["reminder-templates", companyId] });
      
      toast({
        title: "Template enregistré",
        description: `Le modèle de relance niveau ${template.reminder_level} a été enregistré.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour envoyer une relance manuelle
export const useSendReminder = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, reminderLevel }: { invoiceId: string; reminderLevel: 1 | 2 | 3 }) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      // 1. Récupérer la facture
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .eq("company_id", companyId)
        .single();

      if (invoiceError || !invoice) throw new Error("Facture introuvable");

      // 2. Récupérer le template de relance
      const { data: template, error: templateError } = await supabase
        .from("reminder_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("reminder_level", reminderLevel)
        .single();

      if (templateError || !template) throw new Error("Template de relance introuvable");

      // 3. Remplacer les variables dans le template
      const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
      
      const subject = template.subject
        .replace('{{invoice_number}}', invoice.invoice_number)
        .replace('{{client_name}}', invoice.client_name || 'Client')
        .replace('{{amount}}', (invoice.total_ttc || invoice.amount || 0).toFixed(2))
        .replace('{{due_date}}', new Date(invoice.due_date).toLocaleDateString('fr-FR'))
        .replace('{{days_overdue}}', daysOverdue.toString());

      const body = template.body
        .replace(/{{invoice_number}}/g, invoice.invoice_number)
        .replace(/{{client_name}}/g, invoice.client_name || 'Client')
        .replace(/{{amount}}/g, (invoice.total_ttc || invoice.amount || 0).toFixed(2))
        .replace(/{{due_date}}/g, new Date(invoice.due_date).toLocaleDateString('fr-FR'))
        .replace(/{{days_overdue}}/g, daysOverdue.toString());

      // 4. Créer l'enregistrement de relance
      const { data: reminder, error: reminderError } = await supabase
        .from("payment_reminders")
        .insert({
          invoice_id: invoiceId,
          company_id: companyId,
          client_id: invoice.client_id,
          client_name: invoice.client_name,
          client_email: invoice.client_email,
          invoice_number: invoice.invoice_number,
          invoice_amount: invoice.total_ttc || invoice.amount || 0,
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          reminder_level: reminderLevel,
          status: 'pending',
          email_subject: subject,
          email_body: body,
        })
        .select()
        .single();

      if (reminderError) throw reminderError;

      // 5. TODO: Envoyer l'email réel (via service email)
      // Pour l'instant, on simule l'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 6. Marquer comme envoyé
      const { error: updateError } = await supabase
        .from("payment_reminders")
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);

      if (updateError) throw updateError;

      return reminder as PaymentReminder;
    },
    onSuccess: (reminder) => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders", companyId] });
      queryClient.invalidateQueries({ queryKey: ["overdue-invoices", companyId] });
      
      toast({
        title: "Relance envoyée",
        description: `La relance niveau ${reminder.reminder_level} a été envoyée à ${reminder.client_email}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook pour obtenir les statistiques des relances
export const useReminderStats = () => {
  const { data: overdueInvoices = [] } = useOverdueInvoices();
  const { data: reminders = [] } = usePaymentReminders();

  const stats: ReminderStats = {
    total_overdue: overdueInvoices.length,
    total_amount_overdue: overdueInvoices.reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0),
    reminders_sent_today: reminders.filter(r => {
      if (!r.sent_at) return false;
      const today = new Date().toDateString();
      return new Date(r.sent_at).toDateString() === today;
    }).length,
    reminders_pending: reminders.filter(r => r.status === 'pending').length,
    level_1_count: overdueInvoices.filter(inv => inv.days_overdue >= 7 && inv.days_overdue < 15).length,
    level_2_count: overdueInvoices.filter(inv => inv.days_overdue >= 15 && inv.days_overdue < 30).length,
    level_3_count: overdueInvoices.filter(inv => inv.days_overdue >= 30).length,
  };

  return stats;
};

// Hook pour déterminer le niveau de relance à envoyer
export const useRecommendedReminderLevel = (invoice: OverdueInvoice) => {
  const daysOverdue = invoice.days_overdue;
  const lastLevel = invoice.last_reminder_level || 0;

  let recommendedLevel: 1 | 2 | 3;
  let reason: string;

  if (daysOverdue >= 30 && lastLevel < 3) {
    recommendedLevel = 3;
    reason = "Impayé depuis plus de 30 jours - Mise en demeure";
  } else if (daysOverdue >= 15 && lastLevel < 2) {
    recommendedLevel = 2;
    reason = "Impayé depuis plus de 15 jours - Rappel urgent";
  } else if (daysOverdue >= 7 && lastLevel < 1) {
    recommendedLevel = 1;
    reason = "Impayé depuis plus de 7 jours - Premier rappel";
  } else {
    // Déjà relancé au bon niveau, proposer le niveau suivant si possible
    recommendedLevel = Math.min(lastLevel + 1, 3) as 1 | 2 | 3;
    reason = `Dernière relance niveau ${lastLevel} envoyée`;
  }

  return { recommendedLevel, reason };
};
