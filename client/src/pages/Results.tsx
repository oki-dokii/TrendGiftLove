import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ArrowLeft, Sparkles, IndianRupee, MessageSquare } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type Recommendation = {
  id: string;
  productId: string;
  aiReasoning: string;
  personalizedMessage: string | null;
  relevanceScore: number;
  product: {
    id: string;
    name: string;
    description: string;
    category: string;
    priceMin: number;
    priceMax: number;
    interests: string[];
    occasions: string[];
    tags: string[] | null;
    imageUrl: string | null;
  };
};

export default function Results() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/results/:sessionId");
  const sessionId = params?.sessionId;
  const { toast } = useToast();
  const [generatingMessageFor, setGeneratingMessageFor] = useState<string | null>(null);

  // Fetch recommendations
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: [`/api/recommendations/${sessionId}`],
    enabled: !!sessionId,
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return await apiRequest("POST", "/api/wishlist", {
        sessionId,
        recommendationId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Added to Wishlist",
        description: "Gift saved to your wishlist successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist", sessionId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add gift to wishlist",
        variant: "destructive",
      });
    },
  });

  // Generate personalized message mutation
  const generateMessageMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return await apiRequest("POST", "/api/message", { recommendationId });
    },
    onSuccess: (data, recommendationId) => {
      setGeneratingMessageFor(null);
      toast({
        title: "Message Generated",
        description: "Personalized message created!",
      });
      // Update the recommendation in the cache
      queryClient.invalidateQueries({ queryKey: [`/api/recommendations/${sessionId}`] });
    },
    onError: () => {
      setGeneratingMessageFor(null);
      toast({
        title: "Error",
        description: "Failed to generate personalized message",
        variant: "destructive",
      });
    },
  });

  const handleGenerateMessage = (recommendationId: string) => {
    setGeneratingMessageFor(recommendationId);
    generateMessageMutation.mutate(recommendationId);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
            <CardDescription>Please start a new gift search</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/")} data-testid="button-go-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-results-title">
                Your Perfect Gift Recommendations
              </h1>
              <p className="text-muted-foreground" data-testid="text-results-description">
                AI-powered suggestions tailored just for your special someone
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} data-testid={`skeleton-card-${i}`}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="flex flex-col" data-testid={`card-recommendation-${rec.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2" data-testid={`text-product-name-${rec.id}`}>
                        {rec.product.name}
                      </CardTitle>
                      <CardDescription className="mt-1" data-testid={`text-product-category-${rec.id}`}>
                        {rec.product.category}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-score-${rec.id}`}>
                      {rec.relevanceScore}% Match
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-product-description-${rec.id}`}>
                    {rec.product.description}
                  </p>

                  <div className="flex items-center gap-2 text-lg font-semibold text-primary" data-testid={`text-price-${rec.id}`}>
                    <IndianRupee className="h-5 w-5" />
                    {rec.product.priceMin === rec.product.priceMax
                      ? rec.product.priceMin.toLocaleString()
                      : `${rec.product.priceMin.toLocaleString()} - ${rec.product.priceMax.toLocaleString()}`}
                  </div>

                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground" data-testid={`text-ai-reasoning-${rec.id}`}>
                        {rec.aiReasoning}
                      </p>
                    </div>
                  </div>

                  {rec.personalizedMessage && (
                    <div className="bg-chart-2/5 rounded-lg p-3 border border-chart-2/20">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground italic" data-testid={`text-personalized-message-${rec.id}`}>
                          "{rec.personalizedMessage}"
                        </p>
                      </div>
                    </div>
                  )}

                  {rec.product.tags && rec.product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rec.product.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-tag-${rec.id}-${idx}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => addToWishlistMutation.mutate(rec.id)}
                    disabled={addToWishlistMutation.isPending}
                    data-testid={`button-save-${rec.id}`}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Save to Wishlist
                  </Button>
                  {!rec.personalizedMessage && (
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateMessage(rec.id)}
                      disabled={generatingMessageFor === rec.id}
                      data-testid={`button-generate-message-${rec.id}`}
                    >
                      {generatingMessageFor === rec.id ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Recommendations Found</CardTitle>
              <CardDescription>
                We couldn't find any suitable gifts for this criteria. Try adjusting your search.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/")} data-testid="button-try-again">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
