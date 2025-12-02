import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { ClientForm } from "@/components/ClientForm";
import { Link } from "react-router-dom";
import { Plus, Search, Users, FileText, Euro, Calendar, Mail, Phone, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ClientsAndQuotes = () => {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuotes = quotes.filter((quote) =>
    quote.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "sent":
        return "secondary";
      case "draft":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "Accepté";
      case "sent":
        return "Envoyé";
      case "draft":
        return "Brouillon";
      case "rejected":
        return "Refusé";
      default:
        return status;
    }
  };

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Clients & Devis
            </h1>
            <p className="text-muted-foreground">
              Gérez vos clients et leurs devis associés
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingClient(null);
              setIsFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau client
          </Button>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="quotes">Devis</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            {/* Recherche */}
            <GlassCard className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </GlassCard>

            {/* Liste des clients */}
            {clientsLoading ? (
              <GlassCard className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-muted-foreground">Chargement des clients...</p>
              </GlassCard>
            ) : filteredClients.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun client</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Aucun client ne correspond à votre recherche"
                    : "Créez votre premier client pour commencer"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un client
                  </Button>
                )}
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => {
                  const clientQuotes = quotes.filter((q) => q.client_name === client.name);
                  return (
                    <GlassCard key={client.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{client.name}</h3>
                          <Badge variant="outline">{client.status}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{client.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Devis associés:</span>
                          <Badge variant="secondary">{clientQuotes.length}</Badge>
                        </div>
                        {clientQuotes.length > 0 && (
                          <div className="space-y-1">
                            {clientQuotes.slice(0, 2).map((quote) => (
                              <div
                                key={quote.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="truncate">{quote.quote_number}</span>
                                <Badge variant={getStatusColor(quote.status)} className="text-xs">
                                  {getStatusLabel(quote.status)}
                                </Badge>
                              </div>
                            ))}
                            {clientQuotes.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{clientQuotes.length - 2} autre(s)
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingClient(client);
                            setIsFormOpen(true);
                          }}
                          className="flex-1"
                        >
                          Modifier
                        </Button>
                        <Link to={`/quotes?client=${client.name}`}>
                          <Button variant="outline" size="sm" className="flex-1">
                            Voir devis
                          </Button>
                        </Link>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            {/* Recherche */}
            <GlassCard className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un devis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </GlassCard>

            {/* Liste des devis */}
            {quotesLoading ? (
              <GlassCard className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
                <p className="text-muted-foreground">Chargement des devis...</p>
              </GlassCard>
            ) : filteredQuotes.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun devis</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Aucun devis ne correspond à votre recherche"
                    : "Aucun devis pour le moment"}
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuotes.map((quote) => (
                  <GlassCard key={quote.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{quote.quote_number}</h3>
                        <Badge variant={getStatusColor(quote.status)}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{quote.client_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {quote.estimated_cost.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(quote.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>

                    <Link to="/quotes">
                      <Button variant="outline" size="sm" className="w-full">
                        Voir le devis
                      </Button>
                    </Link>
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ClientForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          client={editingClient}
        />
      </div>
    </PageLayout>
  );
};

export default ClientsAndQuotes;
