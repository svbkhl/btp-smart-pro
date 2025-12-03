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
  Inbox, 
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
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEmailMessages, EmailMessage } from "@/hooks/useEmailMessages";
import { sendEmail } from "@/services/emailService";

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

const Mailbox = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Email["folder"]>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Vérifier si un compte email est configuré
  const { data: emailConfig, isLoading: emailConfigLoading } = useQuery({
    queryKey: ["user_email_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_email_settings")
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

      return data;
    },
    enabled: !!user,
    refetchInterval: 5000, // Vérifier toutes les 5 secondes pour détecter les changements
  });

  const hasEmailConfig = !!emailConfig && (emailConfig.smtp_host || emailConfig.provider);

  // Charger l'historique des emails envoyés
  const { data: emailMessages = [], isLoading: messagesLoading } = useEmailMessages();

  // Charger les emails seulement si mode démo activé OU si email configuré
  useEffect(() => {
    if (settings?.is_demo) {
      setEmails(FAKE_EMAILS);
    } else if (hasEmailConfig && emailMessages.length > 0) {
      // Convertir les EmailMessage en format Email pour l'affichage
      const sentEmails: Email[] = emailMessages
        .filter((msg) => msg.status === "sent")
        .map((msg: EmailMessage) => ({
          id: msg.id,
          from: emailConfig?.from_email || emailConfig?.smtp_user || "noreply@btpsmartpro.com",
          fromName: emailConfig?.from_name || settings?.signature_name || "BTP Smart Pro",
          subject: msg.subject,
          preview: msg.body_text || msg.body_html?.replace(/<[^>]*>/g, "").substring(0, 100) || "",
          date: msg.sent_at || msg.created_at,
          isRead: true,
          isStarred: false,
          folder: "sent" as const,
        }));
      setEmails(sentEmails);
    } else if (hasEmailConfig) {
      // Email configuré mais pas encore d'emails envoyés
      setEmails([]);
    } else {
      setEmails([]);
    }
  }, [settings?.is_demo, hasEmailConfig, emailMessages.length, emailConfig?.from_email, emailConfig?.smtp_user, emailConfig?.from_name, settings?.signature_name]);

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

  const handleSendCompose = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      console.log("📧 Envoi d'un email...", { to: composeData.to, subject: composeData.subject });
      
      // Convertir le texte en HTML simple
      const htmlBody = composeData.body.replace(/\n/g, "<br>");
      
      await sendEmail({
        to: composeData.to,
        subject: composeData.subject,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${htmlBody}</div>`,
        text: composeData.body,
        type: "notification",
      });

      console.log("✅ Email envoyé avec succès");
      
      toast({
        title: "Email envoyé",
        description: "Votre email a été envoyé avec succès",
      });
      
      setIsComposing(false);
      setComposeData({ to: "", subject: "", body: "" });
      
      // Rafraîchir la liste des emails après un court délai
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email. Vérifiez votre configuration email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
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
                <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
                  <p className="font-semibold mb-1">📧 Gmail</p>
                  <p className="text-xs text-muted-foreground">Connexion OAuth sécurisée</p>
                </div>
                <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
                  <p className="font-semibold mb-1">📧 Outlook</p>
                  <p className="text-xs text-muted-foreground">Connexion OAuth Microsoft</p>
                </div>
                <div className="p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-border/50">
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
              {settings?.is_demo && (
                <Badge variant="secondary" className="ml-2">Mode Démo</Badge>
              )}
            </p>
          </div>
          <Button onClick={() => setIsComposing(true)} className="gap-2 rounded-xl">
            <Send className="w-4 h-4" />
            Nouveau message
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Dossiers */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 space-y-2">
              <Button
                variant={selectedFolder === "inbox" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("inbox");
                  setSelectedEmail(null); // Réinitialiser la sélection
                }}
              >
                <Inbox className="w-4 h-4" />
                Boîte de réception
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={selectedFolder === "sent" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("sent");
                  setSelectedEmail(null); // Réinitialiser la sélection
                }}
              >
                <Send className="w-4 h-4" />
                Envoyés
              </Button>
              <Button
                variant={selectedFolder === "drafts" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("drafts");
                  setSelectedEmail(null); // Réinitialiser la sélection
                }}
              >
                <Mail className="w-4 h-4" />
                Brouillons
              </Button>
              <Button
                variant={selectedFolder === "archived" ? "default" : "ghost"}
                className="w-full justify-start gap-2 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedFolder("archived");
                  setSelectedEmail(null); // Réinitialiser la sélection
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
                  setSelectedEmail(null); // Réinitialiser la sélection
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
                  className="pl-10"
                />
              </div>
            </GlassCard>

            {/* Liste */}
            <div className="space-y-2">
              {filteredEmails.length === 0 ? (
                <GlassCard className="p-6 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucun email</p>
                </GlassCard>
              ) : (
                filteredEmails.map((email) => (
                  <GlassCard
                    key={email.id}
                    className={`p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                      selectedEmail?.id === email.id ? "ring-2 ring-primary" : ""
                    } ${!email.isRead ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      setSelectedEmail(email);
                      handleMarkAsRead(email.id);
                    }}
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

        {/* Dialog de composition */}
        {isComposing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <GlassCard className="p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Nouveau message</h2>
                <div className="space-y-2">
                  <Input
                    placeholder="À"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  />
                  <Input
                    placeholder="Objet"
                    value={composeData.subject}
                    onChange={(e) =>
                      setComposeData({ ...composeData, subject: e.target.value })
                    }
                  />
                  <Textarea
                    placeholder="Message..."
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    rows={10}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsComposing(false)}
                    disabled={isSending}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSendCompose} 
                    className="gap-2"
                    disabled={isSending || !composeData.to || !composeData.subject || !composeData.body}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Mailbox;
