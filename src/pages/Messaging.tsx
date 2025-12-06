import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Receipt,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEmailMessages, useEmailMessageById, EmailMessage } from "@/hooks/useEmailMessages";
import { useToast } from "@/components/ui/use-toast";

const Messaging = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: emailsData, isLoading, error } = useEmailMessages({
    limit,
    offset: page * limit,
    orderBy: "sent_at",
    orderDirection: "desc",
  });

  const { data: selectedEmail } = useEmailMessageById(selectedEmailId);

  const emails = emailsData?.data || [];
  const totalCount = emailsData?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const filteredEmails = emails.filter((email) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      email.recipient_email?.toLowerCase().includes(searchLower) ||
      email.subject?.toLowerCase().includes(searchLower) ||
      email.body_text?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Envoyé
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erreur
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quote":
        return <FileText className="w-4 h-4" />;
      case "invoice":
        return <Receipt className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const formatEmailDate = (dateString: string | null) => {
    if (!dateString) return "Date inconnue";
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy à HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <PageLayout>
        <div className="p-6">
          <GlassCard className="p-12 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Erreur</h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Impossible de charger les emails"}
            </p>
          </GlassCard>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Emails envoyés
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Consultez l'historique de tous vos emails envoyés
            </p>
          </div>
        </div>

        {/* Recherche */}
        <GlassCard className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par destinataire, sujet ou contenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-border/50"
            />
          </div>
        </GlassCard>

        {/* Liste des emails */}
        {isLoading ? (
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">
                Chargement des emails...
              </p>
            </div>
          </GlassCard>
        ) : filteredEmails.length === 0 ? (
          <GlassCard className="p-12">
            <div className="text-center py-8">
              <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                {searchQuery ? "Aucun email trouvé" : "Aucun email envoyé"}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {searchQuery
                  ? "Aucun email ne correspond à votre recherche."
                  : "Les emails que vous envoyez apparaîtront ici."}
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            <GlassCard className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    {totalCount} email{totalCount > 1 ? "s" : ""} envoyé{totalCount > 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="space-y-2">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className="p-4 rounded-lg border border-border/50 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmailId(email.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(email.email_type)}
                            <span className="font-semibold text-sm sm:text-base truncate">
                              {email.subject || "Sans objet"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate">{email.recipient_email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatEmailDate(email.sent_at || email.created_at)}</span>
                            </div>
                          </div>
                          {email.body_text && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {email.body_text.substring(0, 150)}
                              {email.body_text.length > 150 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {getStatusBadge(email.status)}
                          {email.quote_id && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              Devis
                            </Badge>
                          )}
                          {email.invoice_id && (
                            <Badge variant="outline" className="text-xs">
                              <Receipt className="w-3 h-3 mr-1" />
                              Facture
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} sur {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Dialog détails email */}
      <Dialog open={!!selectedEmailId} onOpenChange={(open) => !open && setSelectedEmailId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Détails de l'email
            </DialogTitle>
            <DialogDescription>
              {selectedEmail?.subject || "Sans objet"}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail ? (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Destinataire
                  </label>
                  <p className="text-sm sm:text-base font-semibold break-all">
                    {selectedEmail.recipient_email}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Date d'envoi
                  </label>
                  <p className="text-sm sm:text-base">
                    {formatEmailDate(selectedEmail.sent_at || selectedEmail.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Statut
                  </label>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Type
                  </label>
                  <p className="text-sm sm:text-base capitalize">{selectedEmail.email_type}</p>
                </div>
              </div>

              {/* Contenu */}
              {selectedEmail.body_html ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Contenu HTML
                  </label>
                  <div
                    className="p-4 bg-muted/30 rounded-lg border border-border/50 prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                </div>
              ) : selectedEmail.body_text ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Contenu
                  </label>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 whitespace-pre-wrap">
                    {selectedEmail.body_text}
                  </div>
                </div>
              ) : null}

              {/* Erreur si échec */}
              {selectedEmail.status === "failed" && selectedEmail.error_message && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <label className="text-xs sm:text-sm font-medium text-destructive">
                    Message d'erreur
                  </label>
                  <p className="text-sm text-destructive mt-1">{selectedEmail.error_message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Messaging;



