import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, FileText, Receipt, Loader2, BookOpen, ArrowLeft } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { TextLibraryManager } from "@/components/text-library/TextLibraryManager";
import { Button } from "@/components/ui/button";

// Lazy loading des composants lourds (chargés seulement quand l'onglet est activé)
const AssistantTab = lazy(() => import("@/components/ai/AssistantTab"));
const AIQuotesTab = lazy(() => import("@/components/ai/AIQuotesTab"));
const AIInvoicesTab = lazy(() => import("@/components/ai/AIInvoicesTab"));

// Composant de loading
const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const AI = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assistant");

  // Ouvrir l'onglet spécifié dans l'URL (assistant, quotes, invoices, library)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["assistant", "quotes", "invoices", "library"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <PageLayout>
      <div className="px-4 py-3 sm:p-6 md:p-8 space-y-3 sm:space-y-6 pb-20 sm:pb-6 min-h-0">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-1 gap-2 -ml-2 sm:mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3 truncate">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              IA
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground line-clamp-2 sm:line-clamp-none">
              Créez des devis et des factures intelligemment, obtenez des conseils et automatisez vos processus métier. L&apos;assistant IA peut vous aider à estimer vos chantiers.
            </p>
          </div>
          <Button
            variant={activeTab === "library" ? "default" : "outline"}
            onClick={() => setActiveTab(activeTab === "library" ? "assistant" : "library")}
            className="gap-2 rounded-xl shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            Bibliothèque
          </Button>
        </div>

        {activeTab === "library" ? (
          <GlassCard className="p-4 sm:p-6">
            <TextLibraryManager />
          </GlassCard>
        ) : (
          <GlassCard className="p-3 sm:p-6 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 mb-3 sm:mb-6 h-auto">
                <TabsTrigger value="assistant" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Assistant</span>
                </TabsTrigger>
                <TabsTrigger value="quotes" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Devis</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-2.5">
                  <Receipt className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Facture</span>
                </TabsTrigger>
              </TabsList>

            <TabsContent value="assistant" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AssistantTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="quotes" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AIQuotesTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AIInvoicesTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </GlassCard>
        )}
      </div>
    </PageLayout>
  );
};

export default AI;

