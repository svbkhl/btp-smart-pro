import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Lightbulb, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePriceSuggestions,
  useProfitabilityAnalysis,
  useRevenuePredictions,
  useAIRecommendations,
} from "@/hooks/useAIInsights";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AIInsightsDashboard = () => {
  const { data: priceSuggestions = [], isLoading: isLoadingPrices } = usePriceSuggestions();
  const { data: profitability = [], isLoading: isLoadingProfit } = useProfitabilityAnalysis();
  const { data: predictions = [], isLoading: isLoadingPredictions } = useRevenuePredictions();
  const recommendations = useAIRecommendations();

  return (
    <div className="space-y-6">
      {/* En-tête avec recommandations prioritaires */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Insights & Recommandations IA
          </h2>
          <p className="text-muted-foreground">
            Analyses intelligentes pour optimiser votre activité
          </p>
        </div>

        {/* Recommandations prioritaires */}
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.slice(0, 2).map((rec) => (
            <Alert key={rec.id} className={
              rec.priority === 'high' ? 'border-red-500' :
              rec.priority === 'medium' ? 'border-orange-500' :
              'border-green-500'
            }>
              {rec.priority === 'high' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              {rec.priority === 'medium' && <Target className="h-4 w-4 text-orange-500" />}
              {rec.priority === 'low' && <CheckCircle className="h-4 w-4 text-green-500" />}
              <AlertDescription>
                <div className="font-medium mb-1">{rec.title}</div>
                <div className="text-sm">{rec.description}</div>
                {rec.actionable && rec.action && (
                  <div className="text-xs mt-2 text-blue-600 font-medium">
                    💡 {rec.action}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>

      {/* Tabs pour les différentes analyses */}
      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="!flex flex-wrap w-full gap-2 p-2 h-auto sm:!grid sm:grid-cols-4 sm:h-10 sm:gap-1 sm:p-1 sm:justify-items-stretch [&>button]:min-w-0">
            <TabsTrigger
              value="predictions"
              className="flex-1 min-w-0 basis-[calc(50%-4px)] sm:basis-auto sm:flex-none text-xs sm:text-base px-2 py-2.5 sm:px-6 sm:py-3 truncate rounded-lg"
            >
              Prédictions CA
            </TabsTrigger>
            <TabsTrigger
              value="pricing"
              className="flex-1 min-w-0 basis-[calc(50%-4px)] sm:basis-auto sm:flex-none text-xs sm:text-base px-2 py-2.5 sm:px-6 sm:py-3 truncate rounded-lg"
            >
              Suggestions Prix
            </TabsTrigger>
            <TabsTrigger
              value="profitability"
              className="flex-1 min-w-0 basis-[calc(50%-4px)] sm:basis-auto sm:flex-none text-xs sm:text-base px-2 py-2.5 sm:px-6 sm:py-3 truncate rounded-lg"
            >
              Rentabilité
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="flex-1 min-w-0 basis-[calc(50%-4px)] sm:basis-auto sm:flex-none text-xs sm:text-base px-2 py-2.5 sm:px-6 sm:py-3 rounded-lg"
            >
              <span className="hidden sm:inline">Toutes les </span>
              <span className="truncate block max-w-full">Recommandations</span>
            </TabsTrigger>
          </TabsList>

        {/* Tab Prédictions CA */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prédictions de Chiffre d'Affaires</CardTitle>
              <CardDescription>
                Prévisions basées sur votre historique des 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPredictions ? (
                <div className="text-center py-8 text-muted-foreground">Calcul en cours...</div>
              ) : predictions.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Pas assez de données historiques pour générer des prédictions fiables.
                    Continuez à créer des factures pour activer cette fonctionnalité.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {predictions.map((pred, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{pred.periodLabel}</CardTitle>
                          <Badge variant={
                            pred.trend === 'up' ? 'default' :
                            pred.trend === 'down' ? 'destructive' :
                            'secondary'
                          }>
                            {pred.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                            {pred.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                            {pred.trendPercentage > 0 ? '+' : ''}{pred.trendPercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">CA prédit</span>
                            <span className="text-2xl font-bold">
                              {pred.predictedRevenue.toFixed(0)}€
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Confiance</span>
                              <span className="font-medium">{(pred.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={pred.confidence * 100} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Suggestions Prix */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggestions de Prix IA</CardTitle>
              <CardDescription>
                Prix recommandés basés sur votre historique de devis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPrices ? (
                <div className="text-center py-8 text-muted-foreground">Analyse en cours...</div>
              ) : priceSuggestions.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Pas assez de devis dans votre historique.
                    Créez au moins 5 devis pour obtenir des suggestions de prix.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Prix Min</TableHead>
                      <TableHead>Prix Moyen</TableHead>
                      <TableHead>Prix Max</TableHead>
                      <TableHead>Prix Recommandé</TableHead>
                      <TableHead>Confiance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceSuggestions.map((suggestion, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">{suggestion.category}</TableCell>
                        <TableCell>{suggestion.minPrice.toFixed(0)}€</TableCell>
                        <TableCell>{suggestion.avgPrice.toFixed(0)}€</TableCell>
                        <TableCell>{suggestion.maxPrice.toFixed(0)}€</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-bold text-green-600">
                              {suggestion.recommendedPrice.toFixed(0)}€
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            suggestion.confidence > 0.7 ? 'default' :
                            suggestion.confidence > 0.4 ? 'secondary' :
                            'outline'
                          }>
                            {(suggestion.confidence * 100).toFixed(0)}%
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {suggestion.quoteCount} devis
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Rentabilité */}
        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de Rentabilité</CardTitle>
              <CardDescription>
                Performance financière de vos projets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProfit ? (
                <div className="text-center py-8 text-muted-foreground">Calcul en cours...</div>
              ) : profitability.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Aucun projet avec budget défini.
                    Ajoutez des budgets à vos projets pour activer cette analyse.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projet</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead>Coûts</TableHead>
                      <TableHead>Bénéfice</TableHead>
                      <TableHead>Marge</TableHead>
                      <TableHead>Recommandations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitability.map((analysis) => (
                      <TableRow key={analysis.projectId}>
                        <TableCell className="font-medium">{analysis.projectName}</TableCell>
                        <TableCell>{analysis.revenue.toFixed(0)}€</TableCell>
                        <TableCell>{analysis.costs.toFixed(0)}€</TableCell>
                        <TableCell>
                          <span className={
                            analysis.profit > 0 ? 'text-green-600' :
                            analysis.profit < 0 ? 'text-red-600' :
                            'text-gray-600'
                          }>
                            {analysis.profit > 0 ? '+' : ''}{analysis.profit.toFixed(0)}€
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            analysis.status === 'profitable' ? 'default' :
                            analysis.status === 'breakeven' ? 'secondary' :
                            'destructive'
                          }>
                            {analysis.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {analysis.recommendations.length > 0 ? (
                            <div className="text-xs text-muted-foreground">
                              {analysis.recommendations[0]}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">Bon équilibre</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Toutes les Recommandations */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id} className={
                rec.priority === 'high' ? 'border-l-4 border-l-red-500' :
                rec.priority === 'medium' ? 'border-l-4 border-l-orange-500' :
                'border-l-4 border-l-green-500'
              }>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                        <Badge variant={
                          rec.priority === 'high' ? 'destructive' :
                          rec.priority === 'medium' ? 'default' :
                          'secondary'
                        }>
                          {rec.priority === 'high' ? 'Urgent' :
                           rec.priority === 'medium' ? 'Important' :
                           'Info'}
                        </Badge>
                        <Badge variant="outline">{rec.type}</Badge>
                      </div>
                      <CardDescription>{rec.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <strong>Impact :</strong> {rec.impact}
                    </div>
                    {rec.actionable && rec.action && (
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Action recommandée :</strong> {rec.action}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
