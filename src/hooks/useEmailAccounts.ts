import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { EmailAccount, SMTPConfig, IMAPConfig } from "@/types/email";
import { useToast } from "@/components/ui/use-toast";

export const useEmailAccounts = () => {
  return useQuery({
    queryKey: ["emailAccounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailAccount[];
    },
  });
};

export const useDefaultEmailAccount = () => {
  return useQuery({
    queryKey: ["emailAccounts", "default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as EmailAccount | null;
    },
  });
};

export const useAddSMTPAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: {
      email: string;
      displayName?: string;
      smtp: SMTPConfig;
      imap: IMAPConfig;
      isDefault?: boolean;
    }) => {
      // Tester la connexion d'abord
      const { data: testResult, error: testError } = await supabase.functions.invoke(
        "test-smtp-connection",
        { body: config }
      );

      if (testError || !testResult?.success) {
        throw new Error(testResult?.error || "Échec de la connexion SMTP");
      }

      // Ajouter le compte
      const { data, error } = await supabase
        .from("email_accounts")
        .insert({
          email_address: config.email,
          display_name: config.displayName,
          provider: "smtp",
          is_default: config.isDefault || false,
          smtp_host: config.smtp.host,
          smtp_port: config.smtp.port,
          smtp_username: config.smtp.username,
          smtp_password: config.smtp.password, // TODO: Encrypt
          smtp_secure: config.smtp.secure,
          imap_host: config.imap.host,
          imap_port: config.imap.port,
          imap_username: config.imap.username,
          imap_password: config.imap.password, // TODO: Encrypt
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
      toast({
        title: "Compte email ajouté",
        description: "Votre compte email professionnel a été configuré avec succès",
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

export const useSetDefaultEmailAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from("email_accounts")
        .update({ is_default: true })
        .eq("id", accountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
      toast({
        title: "Compte par défaut modifié",
        description: "Ce compte sera utilisé pour l'envoi de vos emails",
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

export const useDeleteEmailAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("email_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailAccounts"] });
      toast({
        title: "Compte supprimé",
        description: "Le compte email a été supprimé",
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

export const useConnectGmail = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Rediriger vers OAuth Google
      const { data, error } = await supabase.functions.invoke("gmail-oauth-url");
      
      if (error) throw error;
      
      // Ouvrir la popup OAuth
      window.location.href = data.url;
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

export const useConnectOutlook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Rediriger vers OAuth Microsoft
      const { data, error } = await supabase.functions.invoke("outlook-oauth-url");
      
      if (error) throw error;
      
      // Ouvrir la popup OAuth
      window.location.href = data.url;
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











