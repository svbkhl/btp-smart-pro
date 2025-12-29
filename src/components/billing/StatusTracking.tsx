import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { getStatusHistory, StatusEvent } from "@/services/statusTrackingService";
import { 
  Mail, 
  Eye, 
  FileSignature, 
  CheckCircle2, 
  Clock,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StatusTrackingProps {
  documentType: "quote" | "invoice";
  documentId: string;
  document?: any; // Pour afficher les dates directement
}

export const StatusTracking = ({
  documentType,
  documentId,
  document,
}: StatusTrackingProps) => {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatusHistory();
  }, [documentId]);

  const loadStatusHistory = async () => {
    setLoading(true);
    try {
      const history = await getStatusHistory(documentType, documentId);
      setEvents(history);
    } catch (error) {
      console.error("Error loading status history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: StatusEvent["event_type"]) => {
    switch (eventType) {
      case "email_sent":
        return Mail;
      case "email_viewed":
        return Eye;
      case "signed":
        return FileSignature;
      case "paid":
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  const getEventLabel = (eventType: StatusEvent["event_type"]) => {
    switch (eventType) {
      case "email_sent":
        return "Envoyé";
      case "email_viewed":
        return "Vu";
      case "signed":
        return "Signé";
      case "paid":
        return "Payé";
      default:
        return eventType;
    }
  };

  const getEventColor = (eventType: StatusEvent["event_type"]) => {
    switch (eventType) {
      case "email_sent":
        return "bg-blue-500";
      case "email_viewed":
        return "bg-purple-500";
      case "signed":
        return "bg-green-500";
      case "paid":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  // Construire la timeline depuis les événements ou le document
  const timeline = events.length > 0 
    ? events 
    : (() => {
        const items: StatusEvent[] = [];
        if (document?.email_sent_at) {
          items.push({
            id: "email_sent",
            document_type: documentType,
            document_id: documentId,
            event_type: "email_sent",
            created_at: document.email_sent_at,
          });
        }
        if (document?.email_viewed_at) {
          items.push({
            id: "email_viewed",
            document_type: documentType,
            document_id: documentId,
            event_type: "email_viewed",
            created_at: document.email_viewed_at,
          });
        }
        if (document?.signed_at) {
          items.push({
            id: "signed",
            document_type: documentType,
            document_id: documentId,
            event_type: "signed",
            event_data: { signed_by: document.signed_by },
            created_at: document.signed_at,
          });
        }
        if (document?.paid_at) {
          items.push({
            id: "paid",
            document_type: documentType,
            document_id: documentId,
            event_type: "paid",
            created_at: document.paid_at,
          });
        }
        return items.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      })();

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </GlassCard>
    );
  }

  if (timeline.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Suivi du document
        </h3>
        <p className="text-sm text-muted-foreground">
          Aucun événement enregistré pour le moment
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Suivi du document
      </h3>
      <div className="space-y-4">
        {timeline.map((event, index) => {
          const Icon = getEventIcon(event.event_type);
          const isLast = index === timeline.length - 1;
          
          return (
            <div key={event.id} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isLast && (
                  <div className="w-0.5 h-full bg-border min-h-[40px] mt-2" />
                )}
              </div>
              
              {/* Event content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="gap-1">
                    {getEventLabel(event.event_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                  </span>
                </div>
                {event.event_data?.signed_by && (
                  <p className="text-sm text-muted-foreground">
                    Signé par : {event.event_data.signed_by}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};



















