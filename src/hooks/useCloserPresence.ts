import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "closers-online";

/**
 * Rejoint le canal de présence des closers et diffuse l'email de l'utilisateur.
 * Retourne un Set des emails en ligne.
 */
export function useCloserPresence(userEmail: string | null | undefined) {
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: userEmail } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ email: string }>();
        const emails = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.email) emails.add(p.email.toLowerCase());
          });
        });
        setOnlineEmails(emails);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ email: userEmail.toLowerCase() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  return onlineEmails;
}

/**
 * S'abonne uniquement pour lire les closers en ligne (lecture seule, sans broadcaster).
 * Utile dans le leaderboard pour afficher les indicateurs.
 */
export function useOnlineClosers() {
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(CHANNEL);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ email: string }>();
        const emails = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.email) emails.add(p.email.toLowerCase());
          });
        });
        setOnlineEmails(emails);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineEmails;
}
