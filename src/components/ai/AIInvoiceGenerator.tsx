import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

export const AIInvoiceGenerator = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Générateur de Factures IA
        </CardTitle>
        <CardDescription>
          Générez automatiquement des factures avec l'intelligence artificielle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Générateur de Factures IA</h3>
          <p className="text-muted-foreground mb-4">
            Fonctionnalité en cours de développement
          </p>
          <Button disabled>
            Bientôt disponible
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};












