/**
 * Page Statistiques
 * 
 * Dashboard complet avec Analytics & Insights IA
 */

import { AdvancedAnalytics } from "@/components/analytics/AdvancedAnalytics";
import { AIInsightsDashboard } from "@/components/ai/AIInsightsDashboard";
import { PageLayout } from "@/components/layout/PageLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Analytics() {
  const navigate = useNavigate();

  return (
    <PageLayout title="Statistiques">
      <div className="space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="container mx-auto px-4 py-8">
          <AdvancedAnalytics />
        </div>
        <div className="border-t pt-8">
          <AIInsightsDashboard />
        </div>
      </div>
    </PageLayout>
  );
}
