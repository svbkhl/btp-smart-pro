import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Search,
  Send, 
  Archive, 
  Trash2, 
  Star, 
  StarOff,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Calendar,
  User,
  Settings,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmailMessages, EmailMessage } from "@/hooks/useEmailMessages";
import { useInboxEmails, InboxEmail } from "@/hooks/useInboxEmails";
import { useFakeDataStore } from "@/store/useFakeDataStore";

interface Email {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder: "inbox" | "sent" | "drafts" | "archived" | "trash";
  attachments?: number;
}

const FAKE_EMAILS: Email[] = [
  {
    id: "email-1",
    from: "client@example.com",
    fromName: "M. Martin",
    subject: "Demande de devis pour rénovation",
    preview: "Bonjour, je souhaiterais obtenir un devis pour la rénovation de ma toiture...",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    isStarred: false,
    folder: "inbox",
    attachments: 2,
  },
  {
    id: "email-2",
    from: "fournisseur@example.com",
    fromName: "Fournisseur Matériaux",
    subject: "Devis matériaux - Projet #1234",
    preview: "Veuillez trouver ci-joint notre devis pour les matériaux demandés...",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isStarred: true,
    folder: "inbox",
    attachments: 1,
  },
  {
    id: "email-3",
    from: "rh@example.com",
    fromName: "RH Entreprise",
    subject: "Candidature reçue",
    preview: "Une nouvelle candidature a été reçue pour le poste de maçon...",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    isStarred: false,
    folder: "inbox",
  },
];

const Messaging = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fakeDataEnabled = useFakeDataStore((state) => state.fakeDataEnabled);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Email["folder"]>("sent"); // Par défaut "sent" au lieu d'inbox
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [replyText, setReplyText] = useState("");

  // Vérifier si un compte email est configuré
  const { data: emailConfig, isLoading: emailConfigLoading } = useQuery({
    queryKey: ["user_email_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_email_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Pas de configuration email
          return null;
        }
        console.error("Erreur chargement email config:", error);
        return null;
      }

      return data as any;
    },
    enabled: !!user,
    refetchInterval: 5000, // Vérifier toutes les 5 secondes pour détecter les changements
  });

  const hasEmailConfig = !!emailConfig && ((emailConfig as any).smtp_host || (emailConfig as any).provider);

  // Charger l'historique des emails envoyés
  const { data: emailMessagesData, isLoading: messagesLoading } = useEmailMessages();
  
  // Charger les emails entrants selon le dossier sélectionné
  // NE PAS charger inbox_emails si on est sur l'onglet "sent" (pour éviter l'erreur 400)
  const { data: inboxEmailsData, isLoading: inboxLoading } = useInboxEmails({
    folder: selectedFolder === "inbox" ? "inbox" : selectedFolder,
  });

  // Charger les emails envoyés et entrants
  useEffect(() => {
    console.log('📧 [Messagerie] Chargement emails...', {
      fakeDataEnabled,
      selectedFolder,
      emailMessagesCount: emailMessagesData?.data?.length || 0,
      inboxEmailsCount: inboxEmailsData?.data?.length || 0,
    });

    if (fakeDataEnabled) {
      console.log('📧 [Messagerie] Mode FAKE DATA activé');
      setEmails(FAKE_EMAILS);
    } else {
      const allEmails: Email[] = [];
      
      // Charger les emails envoyés depuis email_messages (pour le dossier "sent")
      if (selectedFolder === "sent") {
        console.log('📧 [Messagerie] Dossier SENT sélectionné');
        console.log('📧 [Messagerie] emailMessagesData:', emailMessagesData);
        
        if (emailMessagesData?.data && emailMessagesData.data.length > 0) {
          const sentEmails: Email[] = emailMessagesData.data
            .filter((msg) => msg.status === "sent")
            .map((msg: EmailMessage) => ({
              id: msg.id,
              from: (emailConfig as any)?.from_email || (emailConfig as any)?.smtp_user || user?.email || "noreply@btpsmartpro.com",
              fromName: (emailConfig as any)?.from_name || settings?.signature_name || "BTP Smart Pro",
              subject: msg.subject || "Sans objet",
              preview: msg.body_text || msg.body_html?.replace(/<[^>]*>/g, "").substring(0, 100) || "",
              date: msg.sent_at || msg.created_at,
              isRead: true,
              isStarred: false,
              folder: "sent" as const,
            }));
          console.log('✅ [Messagerie] Emails envoyés chargés:', sentEmails.length);
          allEmails.push(...sentEmails);
        } else {
          console.warn('⚠️ [Messagerie] Aucun email dans email_messages');
          console.log('💡 [Messagerie] Envoie un email de test (lien paiement, devis...)');
        }
      }

      // Charger les emails entrants depuis inbox_emails (pour les autres dossiers)
      if (selectedFolder !== "sent" && inboxEmailsData?.data && inboxEmailsData.data.length > 0) {
        const inboxEmails: Email[] = inboxEmailsData.data.map((msg: InboxEmail) => ({
          id: msg.id,
          from: msg.from_email,
          fromName: msg.from_name || msg.from_email.split("@")[0],
          subject: msg.subject || "Sans objet",
          preview: msg.body_text || msg.body_html?.replace(/<[^>]*>/g, "").substring(0, 100) || "",
          date: msg.received_at,
          isRead: msg.is_read,
          isStarred: msg.is_starred,
          folder: msg.folder,
          attachments: msg.attachments?.length || 0,
        }));
        console.log('✅ [Messagerie] Emails entrants chargés:', inboxEmails.length);
        allEmails.push(...inboxEmails);
      }
      
      console.log('📧 [Messagerie] Total emails à afficher:', allEmails.length);
      setEmails(allEmails);
    }
  }, [
    fakeDataEnabled, 
    selectedFolder,
    emailMessagesData?.data, 
    inboxEmailsData?.data,
    emailConfig, 
    settings?.signature_name, 
    user?.email
  ]);

  const filteredEmails = emails.filter((email) => {
    const matchesFolder = email.folder === selectedFolder;
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const unreadCount = emails.filter((e) => !e.isRead && e.folder === "inbox").length;

  const handleMarkAsRead = (id: string) => {
    setEmails(emails.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, isRead: true });
    }
  };

  const handleToggleStar = (id: string) => {
    setEmails(emails.map((e) => (e.id === id ? { ...e, isStarred: !e.isStarred } : e)));
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, isStarred: !selectedEmail.isStarred });
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast({
        title: "Message vide",
        description: "Veuillez saisir un message",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message envoyé",
      description: "Votre réponse a été envoyée avec succès",
    });
    setReplyText("");
  };

  // Afficher l'interface de configuration si pas de compte email configuré
  if (!emailConfigLoading && !hasEmailConfig) {
    return (
      <PageLayout>
        <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Messagerie
            </h1>
            <p className="text-muted-foreground">
              Configurez votre compte email pour commencer
            </p>
          </div>

          <GlassCard className="p-12 text-center space-y-6">
            <Mail className="w-20 h-20 mx-auto mb-4 text-primary" />
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">Configuration requise</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Pour utiliser la messagerie, vous devez d'abord configurer un compte email dans les paramètres.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/settings?tab=email">
                <Button size="lg" className="gap-2 rounded-xl">
                  <Settings className="w-5 h-5" />
                  Configurer un compte email
                </Button>
              </Link>
            </div>
            <div className="pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-3">
                💡 <strong>Astuce :</strong> Vous pouvez connecter :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
                  <p className="font-semibold mb-1">📧 Gmail</p>
                  <p className="text-xs text-muted-foreground">Connexion OAuth sécurisée</p>
                </div>
                <div className="p-4 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
                  <p className="font-semibold mb-1">📧 Outlook</p>
                  <p className="text-xs text-muted-foreground">Connexion OAuth Microsoft</p>
                </div>
                <div className="p-4 rounded-lg bg-transparent backdrop-blur-xl border border-white/20 dark:border-white/10">
                  <p className="font-semibold mb-1">⚙️ SMTP</p>
                  <p className="text-xs text-muted-foreground">Email professionnel</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Messagerie
            </h1>
            <p className="text-muted-foreground">
              Gérez vos emails et communications
              {fakeDataEnabled && (
                <Badge variant="secondary" className="ml-2">Mode Démo</Badge>
              )}
            </p>
          </div>
          <Button onClick={() => navigate('/facturation')} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            Envoyer un document
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Dossiers (Simplifié: Envoyés, Archivés, Corbeille) */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 space-y-2">
              <Button
                variant={selectedFolder === "sent" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("sent");
                  setSelectedEmail(null);
                }}
              >
                <Send className="w-4 h-4" />
                Envoyés
              </Button>
              <Button
                variant={selectedFolder === "archived" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("archived");
                  setSelectedEmail(null);
                }}
              >
                <Archive className="w-4 h-4" />
                Archivés
              </Button>
              <Button
                variant={selectedFolder === "trash" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("trash");
                  setSelectedEmail(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Corbeille
              </Button>
            </GlassCard>
          </div>

          {/* Liste des emails */}
          <div className="lg:col-span-1 space-y-4">
        {/* Recherche */}
            <GlassCard className="p-6">
          <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                  placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 sm:pl-12"
            />
          </div>
        </GlassCard>

            {/* Liste */}
            <div className="space-y-2">
              {filteredEmails.length === 0 ? (
                <GlassCard className="p-6 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium mb-2">Aucun email envoyé</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyez un devis, une facture ou un lien de paiement pour voir l'historique ici
                  </p>
          </GlassCard>
        ) : (
                filteredEmails.map((email) => (
                    <div
                      key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      handleMarkAsRead(email.id);
                    }}
                  >
                    <GlassCard
                      className={`p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                        selectedEmail?.id === email.id ? "ring-2 ring-primary" : ""
                      } ${!email.isRead ? "bg-primary/5" : ""}`}
                    >
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">
                            {email.fromName}
                            </span>
                          {email.isStarred && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {!email.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-sm font-medium truncate mb-1">
                          {email.subject}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {email.preview}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(email.date), "d MMM", { locale: fr })}
                          </span>
                          {email.attachments && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {email.attachments}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(email.id);
                        }}
                      >
                        {email.isStarred ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    </GlassCard>
                  </div>
                ))
              )}
            </div>
                </div>

          {/* Détail de l'email */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{selectedEmail.fromName}</span>
                        <span>&lt;{selectedEmail.from}&gt;</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(selectedEmail.date), "d MMMM yyyy à HH:mm", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleStar(selectedEmail.id)}
                      >
                        {selectedEmail.isStarred ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="whitespace-pre-line text-sm">{selectedEmail.preview}</p>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <Textarea
                      placeholder="Répondre à ce message..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSendReply} className="gap-2">
                        <Reply className="w-4 h-4" />
                        Répondre
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <ReplyAll className="w-4 h-4" />
                        Répondre à tous
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Forward className="w-4 h-4" />
                        Transférer
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Sélectionnez un email</h3>
                <p className="text-muted-foreground">
                  Cliquez sur un email dans la liste pour le lire
                </p>
              </GlassCard>
            )}
                </div>
              </div>
            </div>
    </PageLayout>
  );
};

export default Messaging;
