import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Une erreur s'est produite
            </h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || "Une erreur inattendue s'est produite"}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}



















