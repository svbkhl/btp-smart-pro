/**
 * Page succès après souscription Stripe Checkout.
 * Route: /start/success?session_id={CHECKOUT_SESSION_ID}
 */

import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function StartSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/auth";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-center">Merci pour votre souscription</CardTitle>
          <CardDescription className="text-center">
            {sessionId
              ? "Votre abonnement est en cours d'activation. Vous pouvez accéder à l'application."
              : "Votre accès à l'application est actif."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link to="/dashboard">Accéder au tableau de bord</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/settings?tab=billing">Gérer mon abonnement</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
