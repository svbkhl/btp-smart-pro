/**
 * Admin Contact Requests Page
 * 
 * Page pour voir et gérer toutes les demandes de contact
 * Permet de créer une entreprise et envoyer une invitation en un clic
 */

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useContactRequests, useUpdateContactRequest, ContactRequest } from '@/hooks/useContactRequests';
import { useCreateCompany } from '@/hooks/useCompany';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Phone, Building2, User, MessageSquare, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const AdminContactRequests = () => {
  const { data: requests = [], isLoading, error } = useContactRequests();
  const updateRequest = useUpdateContactRequest();
  const createCompany = useCreateCompany();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Filtrer les demandes
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.entreprise?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ContactRequest['status']) => {
    const variants = {
      pending: 'default',
      contacted: 'secondary',
      invited: 'default',
      rejected: 'destructive',
    } as const;

    const labels = {
      pending: 'En attente',
      contacted: 'Contacté',
      invited: 'Invité',
      rejected: 'Rejeté',
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  const handleUpdateStatus = async (requestId: string, status: ContactRequest['status']) => {
    try {
      await updateRequest.mutateAsync({
        requestId,
        updates: { status },
      });
      toast({
        title: 'Statut mis à jour',
        description: `La demande a été marquée comme "${status}"`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRequest) return;

    try {
      await updateRequest.mutateAsync({
        requestId: selectedRequest.id,
        updates: { admin_notes: adminNotes },
      });
      toast({
        title: 'Notes sauvegardées',
        description: 'Les notes ont été enregistrées',
      });
      setNotesDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder les notes',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCompanyAndInvite = async (request: ContactRequest) => {
    if (!request.entreprise) {
      toast({
        title: 'Erreur',
        description: 'Le nom de l\'entreprise est requis',
        variant: 'destructive',
      });
      return;
    }

    setCreatingCompany(true);

    try {
      // Créer l'entreprise
      const company = await createCompany.mutateAsync({
        name: request.entreprise,
        plan: 'custom',
        support_level: 0,
        features: {
          planning: true,
          facturation: true,
          devis: true,
          projets: true,
          documents: true,
          messagerie: true,
          employes: true,
        },
      });

      // Récupérer la session pour obtenir l'utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Vous devez être connecté pour envoyer une invitation');
      }

      // Envoyer l'invitation (uniquement avec l'email)
      const { data, error: inviteError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: request.email,
        },
      });

      if (inviteError) {
        const errorMessage = inviteError.message || inviteError.error || 'Impossible d\'envoyer l\'invitation';
        throw new Error(errorMessage);
      }

      // Si l'utilisateur existe déjà (success: false), afficher un message informatif
      if (data?.success === false && data?.message) {
        toast({
          title: 'ℹ️ Utilisateur existant',
          description: data.message,
          variant: 'default',
        });
        // On continue quand même pour mettre à jour le statut
      } else if (!data?.success) {
        throw new Error(data?.message || data?.error || 'Impossible d\'envoyer l\'invitation');
      }

      // Mettre à jour le statut de la demande
      await updateRequest.mutateAsync({
        requestId: request.id,
        updates: {
          status: 'invited',
          invitation_id: data?.invitation?.id,
        },
      });

      toast({
        title: '✅ Invitation envoyée avec succès',
        description: `L'entreprise "${request.entreprise}" a été créée et une invitation a été envoyée à ${request.email}`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error creating company and sending invitation:', error);
      
      const errorMessage = error?.message || error?.error || 'Impossible d\'envoyer l\'invitation. Veuillez réessayer.';
      
      toast({
        title: '❌ Erreur',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
        description: error.message || 'Impossible de créer l\'entreprise et d\'envoyer l\'invitation',
        variant: 'destructive',
      });
    } finally {
      setCreatingCompany(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-12 text-center">
        <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h3 className="text-xl font-semibold mb-2">Erreur</h3>
        <p className="text-muted-foreground">{error.message}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Demandes de contact
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gérez les demandes d'essai gratuit et de contact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="default" className="text-sm">
            {requests.filter((r) => r.status === 'pending').length} en attente
          </Badge>
        </div>
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="contacted">Contacté</SelectItem>
              <SelectItem value="invited">Invité</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Liste des demandes */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune demande ne correspond à vos critères'
                : 'Aucune demande de contact pour le moment'}
            </p>
          </GlassCard>
        ) : (
          filteredRequests.map((request) => (
            <GlassCard key={request.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {request.prenom} {request.nom}
                      </h3>
                      {getStatusBadge(request.status)}
                      {request.trial_requested && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          Essai gratuit demandé
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${request.email}`} className="hover:text-primary">
                          {request.email}
                        </a>
                      </div>
                      {request.telephone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${request.telephone}`} className="hover:text-primary">
                            {request.telephone}
                          </a>
                        </div>
                      )}
                      {request.entreprise && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {request.entreprise}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(request.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                </div>

                {request.message && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Message</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.message}</p>
                  </div>
                )}

                {request.admin_notes && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Notes admin
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{request.admin_notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {request.status === 'pending' && request.trial_requested && request.entreprise && (
                    <Button
                      onClick={() => handleCreateCompanyAndInvite(request)}
                      disabled={creatingCompany}
                      className="gap-2 rounded-xl"
                    >
                      {creatingCompany ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Créer entreprise + Inviter
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setAdminNotes(request.admin_notes || '');
                      setNotesDialogOpen(true);
                    }}
                    className="rounded-xl"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notes
                  </Button>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(request.id, 'contacted')}
                        className="rounded-xl"
                      >
                        Marquer contacté
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                        className="rounded-xl text-red-500"
                      >
                        Rejeter
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Dialog pour les notes */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Notes admin</DialogTitle>
            <DialogDescription>
              Ajoutez des notes privées pour cette demande
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes internes..."
                rows={6}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesDialogOpen(false);
                setSelectedRequest(null);
                setAdminNotes('');
              }}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button onClick={handleSaveNotes} className="rounded-xl">
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactRequests;

