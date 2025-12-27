import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4 sm:p-6">
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Page non trouvée</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              Tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
