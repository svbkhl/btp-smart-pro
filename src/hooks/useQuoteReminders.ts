import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyId } from "./useCompanyId";
import { useToast } from "@/components/ui/use-toast";
import { QUERY_CONFIG } from "@/utils/reactQueryConfig";
import { logger } from "@/utils/logger";
import { sendReminderEmail } from "@/services/emailAdapters";
import type {
  PendingQuote,
  QuoteReminderTemplate,
  QuoteReminderStats,
} from "@/types/reminders";

/** Nombre de jours après envoi avant de proposer une relance (par défaut) */
const DEFAULT_QUOTE_REMINDER_DAYS = 3;

export const usePendingQuotesForReminder = (days = DEFAULT_QUOTE_REMINDER_DAYS) => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["pending-quotes-reminder", companyId, days],
    queryFn: async () => {
      if (!user || !companyId) return [];

      const { data, error } = await supabase.rpc("get_pending_quotes_for_reminder", {
        p_company_id: companyId,
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as PendingQuote[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

export const useQuoteReminderTemplates = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote-reminder-templates", companyId],
    queryFn: async () => {
      if (!user || !companyId) return [];

      const { data, error } = await supabase
        .from("quote_reminder_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("reminder_level", { ascending: true });

      if (error) throw error;
      return (data || []) as QuoteReminderTemplate[];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

export const useQuoteRemindersHistory = () => {
  const { user } = useAuth();
  const { companyId, isLoading: isLoadingCompanyId } = useCompanyId();

  return useQuery({
    queryKey: ["quote-reminders-history", companyId],
    queryFn: async () => {
      if (!user || !companyId) return [];

      const { data, error } = await supabase
        .from("quote_reminders")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !isLoadingCompanyId && !!companyId,
    ...QUERY_CONFIG.MODERATE,
  });
};

export const useUpsertQuoteReminderTemplate = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<QuoteReminderTemplate, "id" | "company_id" | "created_at" | "updated_at"> & { id?: string }) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { id, ...templateData } = data;

      if (id) {
        const { data: template, error } = await supabase
          .from("quote_reminder_templates")
          .update(templateData)
          .eq("id", id)
          .eq("company_id", companyId)
          .select()
          .single();
        if (error) throw error;
        return template as QuoteReminderTemplate;
      } else {
        const { data: template, error } = await supabase
          .from("quote_reminder_templates")
          .insert({ ...templateData, company_id: companyId })
          .select()
          .single();
        if (error) throw error;
        return template as QuoteReminderTemplate;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-reminder-templates", companyId] });
      toast({ title: "Template enregistré", description: "Le modèle de relance devis a été enregistré." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });
};

export const useSendQuoteReminder = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, reminderLevel }: { quoteId: string; reminderLevel: 1 | 2 | 3 }) => {
      if (!user || !companyId) throw new Error("User not authenticated");

      const { data: quote, error: quoteError } = await supabase
        .from("ai_quotes")
        .select("*")
        .eq("id", quoteId)
        .eq("company_id", companyId)
        .single();

      if (quoteError || !quote) throw new Error("Devis introuvable");

      let clientEmail = quote.client_email;
      if (!clientEmail && quote.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("email")
          .eq("id", quote.client_id)
          .single();
        clientEmail = client?.email ?? null;
      }

      const { data: template, error: templateError } = await supabase
        .from("quote_reminder_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("reminder_level", reminderLevel)
        .single();

      if (templateError || !template) throw new Error("Template de relance devis introuvable");

      const daysSinceSent = Math.floor(
        (Date.now() - new Date(quote.sent_at || quote.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const clientName = quote.client_name || "Client";
      const amount = (quote.total_ttc ?? quote.estimated_cost ?? 0).toFixed(2);
      const quoteNumber = quote.quote_number || `DEV-${quoteId.slice(0, 8)}`;

      const subject = template.subject
        .replace(/\{\{quote_number\}\}/g, quoteNumber)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{amount\}\}/g, amount)
        .replace(/\{\{days_since_sent\}\}/g, daysSinceSent.toString());

      const body = template.body
        .replace(/\{\{quote_number\}\}/g, quoteNumber)
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{amount\}\}/g, amount)
        .replace(/\{\{days_since_sent\}\}/g, daysSinceSent.toString());

      const { data: reminder, error: reminderError } = await supabase
        .from("quote_reminders")
        .insert({
          quote_id: quoteId,
          company_id: companyId,
          client_id: quote.client_id ?? null,
          client_name: clientName,
          client_email: clientEmail || "",
          quote_number: quoteNumber,
          quote_amount: quote.total_ttc ?? quote.estimated_cost ?? 0,
          sent_at_quote: quote.sent_at || quote.updated_at,
          days_since_sent: daysSinceSent,
          reminder_level: reminderLevel,
          status: "pending",
          email_subject: subject,
          email_body: body,
        })
        .select()
        .single();

      if (reminderError) throw reminderError;

      const email = (clientEmail || "").trim();
      if (!email) {
        throw new Error("Aucune adresse email pour ce devis. Ajoutez l'email du client avant d'envoyer la relance.");
      }

      const emailResult = await sendReminderEmail({
        clientEmail: email,
        clientName,
        subject,
        message: body,
        clientId: quote.client_id ?? undefined,
        documentId: quoteId,
        documentType: "quote",
        documentNumber: quoteNumber,
      }).catch((emailError) => ({
        success: false as const,
        error: (emailError as Error)?.message ?? "Erreur envoi email",
      }));

      if (!emailResult?.success) {
        await supabase
          .from("quote_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        logger.error("useSendQuoteReminder: envoi email échoué", emailResult?.error);
        throw new Error(emailResult?.error ?? "Impossible d'envoyer l'email de relance.");
      }

      await supabase
        .from("quote_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", reminder.id);

      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-reminders-history", companyId] });
      queryClient.invalidateQueries({ queryKey: ["pending-quotes-reminder", companyId] });
      toast({ title: "Relance envoyée", description: "La relance devis a été envoyée au client." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });
};

export const useQuoteReminderStats = (days = DEFAULT_QUOTE_REMINDER_DAYS) => {
  const { data: pendingQuotes = [] } = usePendingQuotesForReminder(days);
  const { data: reminders = [] } = useQuoteRemindersHistory();

  const stats: QuoteReminderStats = {
    total_pending: pendingQuotes.length,
    total_amount: pendingQuotes.reduce((sum, q) => sum + (q.amount_ttc || 0), 0),
    reminders_sent_today: reminders.filter((r) => {
      if (!r.sent_at) return false;
      return new Date(r.sent_at).toDateString() === new Date().toDateString();
    }).length,
    level_1_count: pendingQuotes.filter((q) => q.days_since_sent >= 3 && q.days_since_sent < 7).length,
    level_2_count: pendingQuotes.filter((q) => q.days_since_sent >= 7 && q.days_since_sent < 14).length,
    level_3_count: pendingQuotes.filter((q) => q.days_since_sent >= 14).length,
  };

  return stats;
};

export const useRecommendedQuoteReminderLevel = (quote: PendingQuote) => {
  const daysSinceSent = quote.days_since_sent;
  const lastLevel = quote.last_reminder_level ?? 0;

  let recommendedLevel: 1 | 2 | 3;
  let reason: string;

  if (daysSinceSent >= 14 && lastLevel < 3) {
    recommendedLevel = 3;
    reason = "En attente depuis plus de 14 jours - Dernier rappel";
  } else if (daysSinceSent >= 7 && lastLevel < 2) {
    recommendedLevel = 2;
    reason = "En attente depuis plus de 7 jours - Rappel de suivi";
  } else if (daysSinceSent >= 3 && lastLevel < 1) {
    recommendedLevel = 1;
    reason = "En attente depuis plus de 3 jours - Premier rappel";
  } else {
    recommendedLevel = Math.min(lastLevel + 1, 3) as 1 | 2 | 3;
    reason = `Dernière relance niveau ${lastLevel} envoyée - Niveau suivant possible`;
  }

  return { recommendedLevel, reason };
};
