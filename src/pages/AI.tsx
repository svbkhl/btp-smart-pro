import { PageLayout } from "@/components/layout/PageLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Sparkles, FileText, Receipt, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

// Lazy loading des composants lourds (chargés seulement quand l'onglet est activé)
const AIAssistant = lazy(() => import("@/components/ai/AIAssistant").then(m => ({ default: m.AIAssistant })));
const AIQuotesTab = lazy(() => import("@/components/ai/AIQuotesTab"));
const SimpleInvoiceForm = lazy(() => import("@/components/ai/SimpleInvoiceForm").then(m => ({ default: m.SimpleInvoiceForm })));

// Composant de loading
const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const AI = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("assistant");

  // Ouvrir l'onglet spécifié dans l'URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["assistant", "quotes", "invoices"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <PageLayout>
      <div className="p-4 sm:p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-2xl sm:text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            IA
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Utilisez l'intelligence artificielle pour générer des devis, analyser des images et obtenir des conseils
          </p>
        </div>

        <GlassCard className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 mb-4 sm:mb-6 h-auto">
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
                <AIAssistant />
              </Suspense>
            </TabsContent>

            <TabsContent value="quotes" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <SimpleQuoteForm />
              </Suspense>
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <SimpleInvoiceForm />
              </Suspense>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </PageLayout>
  );
};

export default AI;

