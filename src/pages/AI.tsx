import Sidebar from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIQuoteGenerator } from "@/components/ai/AIQuoteGenerator";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { ImageAnalysis } from "@/components/ai/ImageAnalysis";
import { MaintenanceReminders } from "@/components/ai/MaintenanceReminders";

const AI = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">Fonctionnalités IA</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Utilisez l'intelligence artificielle pour optimiser votre travail
              </p>
            </div>

            <Tabs defaultValue="assistant" className="w-full">
              <TabsList className="flex overflow-x-auto w-full mb-4 md:mb-6 h-auto flex-nowrap gap-1 p-1">
                <TabsTrigger value="assistant" className="flex-shrink-0 text-xs md:text-base px-3 md:px-6 py-2 md:py-3">Assistant IA</TabsTrigger>
                <TabsTrigger value="quote" className="flex-shrink-0 text-xs md:text-base px-3 md:px-6 py-2 md:py-3">Devis IA</TabsTrigger>
                <TabsTrigger value="analysis" className="flex-shrink-0 text-xs md:text-base px-3 md:px-6 py-2 md:py-3">Analyse</TabsTrigger>
                <TabsTrigger value="reminders" className="flex-shrink-0 text-xs md:text-base px-3 md:px-6 py-2 md:py-3">Rappels</TabsTrigger>
              </TabsList>

              <TabsContent value="assistant">
                <AIAssistant />
              </TabsContent>

              <TabsContent value="quote">
                <AIQuoteGenerator />
              </TabsContent>

              <TabsContent value="analysis">
                <ImageAnalysis />
              </TabsContent>

              <TabsContent value="reminders">
                <MaintenanceReminders />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AI;
