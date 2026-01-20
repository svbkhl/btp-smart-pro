/**
 * 📧 NOUVELLE PAGE MESSAGERIE (FROM SCRATCH)
 * 
 * Historique centralisé de toutes les communications avec les clients.
 * Interface moderne et professionnelle.
 */

import { useState, useMemo, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Search,
  FileText,
  CreditCard,
  PenTool,
  Bell,
  CheckCircle,
  Filter,
  Eye,
  ExternalLink,
  Calendar,
  User,
  AlertCircle,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getMessages, Message, MessageType } from "@/services/messageService";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";

// =====================================================
// TYPES
// =====================================================

type FilterType = 'all' | MessageType;
type FilterStatus = 'all' | 'sent' | 'delivered' | 'opened' | 'failed';

// =====================================================
// CONFIGURATION
// =====================================================

const MESSAGE_TYPE_CONFIG: Record<MessageType, {
  label: string;
  icon: any;
  color: string;
  bgColor: string;
}> = {
  quote: {
    label: "Devis",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  invoice: {
    label: "Facture",
    icon: FileText,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  payment_link: {
    label: "Lien de paiement",
    icon: CreditCard,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  signature: {
    label: "Signature",
    icon: PenTool,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  reminder: {
    label: "Relance",
    icon: Bell,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  confirmation: {
    label: "Confirmation",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  other: {
    label: "Autre",
    icon: Mail,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: any;
}> = {
  pending: { label: "En attente", color: "text-gray-500", icon: Mail },
  sent: { label: "Envoyé", color: "text-blue-500", icon: Mail },
  delivered: { label: "Délivré", color: "text-green-500", icon: CheckCircle },
  opened: { label: "Lu", color: "text-emerald-500", icon: Eye },
  failed: { label: "Échec", color: "text-red-500", icon: AlertCircle },
  bounced: { label: "Rejeté", color: "text-orange-500", icon: AlertCircle },
};

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================

const MessagingNew = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Récupérer les filtres depuis l'URL
  const documentIdFromUrl = searchParams.get('document');
  const documentTypeFromUrl = searchParams.get('type') as 'quote' | 'invoice' | 'payment' | null;

  // Charger les messages (avec filtre si document spécifié)
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", documentIdFromUrl],
    queryFn: () => getMessages({
      documentId: documentIdFromUrl || undefined,
    }),
  });

  const messages = messagesData?.data || [];

  // Afficher un message si filtré par document
  useEffect(() => {
    if (documentIdFromUrl && messages.length > 0) {
      console.log(`📧 [Messagerie] Filtré sur document ${documentIdFromUrl}:`, messages.length, "messages");
    }
  }, [documentIdFromUrl, messages]);

  // Filtrer les messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          msg.subject.toLowerCase().includes(query) ||
          msg.recipient_email.toLowerCase().includes(query) ||
          msg.recipient_name?.toLowerCase().includes(query) ||
          msg.document_number?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Filtre par type
      if (filterType !== "all" && msg.message_type !== filterType) {
        return false;
      }

      // Filtre par statut
      if (filterStatus !== "all" && msg.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [messages, searchQuery, filterType, filterStatus]);

  // Compteur de messages envoyés aujourd'hui
  const messagesSentToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return messages.filter((m) => {
      const sentDate = new Date(m.sent_at);
      sentDate.setHours(0, 0, 0, 0);
      return sentDate.getTime() === today.getTime() && 
             (m.status === 'sent' || m.status === 'delivered' || m.status === 'opened');
    }).length;
  }, [messages]);

  // Naviguer vers le document
  const navigateToDocument = (message: Message) => {
    if (!message.document_id || !message.document_type) return;

    if (message.document_type === 'quote') {
      navigate(`/ai?quote=${message.document_id}`);
    } else if (message.document_type === 'invoice') {
      navigate(`/invoices?invoice=${message.document_id}`);
    } else if (message.document_type === 'payment') {
      navigate(`/payments?payment=${message.document_id}`);
    }
  };

  return (
    <PageLayout
      title="Messagerie"
      description="Historique de toutes les communications avec vos clients"
    >
      <div className="space-y-6">
        {/* Filtres et recherche */}
        <GlassCard className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, objet, numéro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre type */}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="quote">Devis</SelectItem>
                <SelectItem value="invoice">Factures</SelectItem>
                <SelectItem value="payment_link">Liens de paiement</SelectItem>
                <SelectItem value="signature">Signatures</SelectItem>
                <SelectItem value="reminder">Relances</SelectItem>
                <SelectItem value="confirmation">Confirmations</SelectItem>
                <SelectItem value="other">Autres</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </GlassCard>

        {/* Liste des messages */}
        <div>
          {/* Indicateur discret des messages envoyés aujourd'hui */}
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Send className="w-4 h-4" />
            <span>
              {messagesSentToday === 0 
                ? "Aucun message envoyé aujourd'hui"
                : `${messagesSentToday} message${messagesSentToday > 1 ? 's' : ''} envoyé${messagesSentToday > 1 ? 's' : ''} aujourd'hui`}
            </span>
          </div>

          <GlassCard className="p-6">
          {documentIdFromUrl && (
            <div className="mb-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📌 Filtré sur {documentTypeFromUrl === 'quote' ? 'devis' : documentTypeFromUrl === 'invoice' ? 'facture' : 'document'} : <strong>{documentIdFromUrl.substring(0, 8)}</strong>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2" 
                  onClick={() => {
                    searchParams.delete('document');
                    searchParams.delete('type');
                    setSearchParams(searchParams);
                  }}
                >
                  ✕ Retirer le filtre
                </Button>
              </p>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun message</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterType !== "all" || filterStatus !== "all" || documentIdFromUrl
                  ? "Aucun message ne correspond à vos filtres"
                  : "Les emails envoyés depuis l'application apparaîtront ici"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredMessages.map((message) => {
                  const typeConfig = MESSAGE_TYPE_CONFIG[message.message_type];
                  const statusConfig = STATUS_CONFIG[message.status];
                  const TypeIcon = typeConfig.icon;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group"
                    >
                      <div
                        className="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 transition-all cursor-pointer"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icône type */}
                          <div className={`p-2 rounded-lg ${typeConfig.bgColor} flex-shrink-0`}>
                            <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {message.subject}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {typeConfig.label}
                                  </Badge>
                                  {message.document_number && (
                                    <Badge variant="secondary" className="text-xs">
                                      {message.document_number}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                                <span className={`text-xs ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{message.recipient_name || message.recipient_email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {format(new Date(message.sent_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                </span>
                              </div>
                              {message.document_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToDocument(message);
                                  }}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Voir le document
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </GlassCard>
        </div>
      </div>

      {/* Modal détail du message */}
      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onNavigate={navigateToDocument}
        />
      )}
    </PageLayout>
  );
};

// =====================================================
// MODAL DÉTAIL MESSAGE
// =====================================================

interface MessageDetailModalProps {
  message: Message;
  onClose: () => void;
  onNavigate: (message: Message) => void;
}

const MessageDetailModal = ({ message, onClose, onNavigate }: MessageDetailModalProps) => {
  const typeConfig = MESSAGE_TYPE_CONFIG[message.message_type];
  const statusConfig = STATUS_CONFIG[message.status];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-xl border border-border max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
                <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">{message.subject}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{typeConfig.label}</Badge>
                  <Badge variant={message.status === 'sent' || message.status === 'delivered' || message.status === 'opened' ? 'default' : 'destructive'}>
                    {statusConfig.label}
                  </Badge>
                  {message.document_number && (
                    <Badge variant="secondary">{message.document_number}</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Informations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Destinataire</p>
                <p className="font-medium">{message.recipient_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{message.recipient_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date d'envoi</p>
                <p className="font-medium">
                  {format(new Date(message.sent_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            {/* Contenu */}
            <div>
              <p className="text-sm font-medium mb-2">Contenu</p>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                {message.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{message.body}</pre>
                )}
              </div>
            </div>

            {/* Pièces jointes */}
            {message.attachments && message.attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Pièces jointes ({message.attachments.length})</p>
                <div className="space-y-2">
                  {message.attachments.map((att: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-border">
                      <FileText className="w-4 h-4" />
                      <span className="flex-1 text-sm">{att.name}</span>
                      <span className="text-xs text-muted-foreground">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-end gap-2">
          {message.document_id && (
            <Button onClick={() => onNavigate(message)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir le document
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default MessagingNew;
