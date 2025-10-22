import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ArrowLeft, Sparkles, MessageSquare, ExternalLink, Star, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import SwipeableCard from "@/components/SwipeableCard";

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
    interests?: string[];
    occasions?: string[];
    tags?: string[] | null;
    imageUrl: string | null;
    amazonUrl?: string | null;
    amazonPrice?: string | null;
    amazonRating?: string | null;
    amazonNumRatings?: number | null;
    isPrime?: boolean;
    isBestSeller?: boolean;
    isAmazonChoice?: boolean;
  };
};

interface FormCriteria {
  interests: string[];
  budget: string;
  occasion: string;
}

export default function Results() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/results/:sessionId");
  const sessionId = params?.sessionId;
  const { toast } = useToast();
  const [generatingMessageFor, setGeneratingMessageFor] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Load form criteria from localStorage
  const formCriteria = useMemo<FormCriteria | null>(() => {
    if (!sessionId) return null;
    const storageKey = `giftai_request_${sessionId}`;
    const storedRequest = localStorage.getItem(storageKey);
    if (!storedRequest) return null;
    const data = JSON.parse(storedRequest);
    return {
      interests: data.interests || [],
      budget: data.budget || "",
      occasion: data.occasion || "",
    };
  }, [sessionId]);

  // Helper to calculate match details for a product
  const calculateMatchDetails = (rec: Recommendation) => {
    if (!formCriteria) {
      return {
        interestMatch: { percentage: rec.relevanceScore, description: "AI-powered match" },
        budgetMatch: { matches: true, description: "Fits your budget range" },
        occasionMatch: { matches: true, description: "Perfect for this occasion" },
      };
    }

    // Interest Match
    const productInterests = rec.product.interests || [];
    const matchingInterests = formCriteria.interests.filter(interest =>
      productInterests.some(pi => pi.toLowerCase().includes(interest.toLowerCase()))
    );
    const interestPercentage = rec.relevanceScore;
    const interestDescription = matchingInterests.length > 0
      ? `Matches interests: ${matchingInterests.join(", ")}`
      : "AI suggests this matches your interests";

    // Budget Match
    const productPrice = rec.product.priceMin;
    let budgetMatches = true;
    let budgetDescription = "";

    const priceDisplay = rec.product.amazonPrice || `₹${productPrice.toLocaleString()}`;
    
    if (formCriteria.budget.includes("Under ₹500")) {
      budgetMatches = productPrice <= 500;
      budgetDescription = budgetMatches 
        ? `${priceDisplay} fits your budget (Under ₹500)`
        : `${priceDisplay} exceeds your budget`;
    } else if (formCriteria.budget.includes("₹500 - ₹2000")) {
      budgetMatches = productPrice >= 500 && productPrice <= 2000;
      budgetDescription = budgetMatches
        ? `${priceDisplay} fits your budget (₹500 - ₹2,000)`
        : `${priceDisplay} is outside your budget range`;
    } else if (formCriteria.budget.includes("₹2000 - ₹5000")) {
      budgetMatches = productPrice >= 2000 && productPrice <= 5000;
      budgetDescription = budgetMatches
        ? `${priceDisplay} fits your budget (₹2,000 - ₹5,000)`
        : `${priceDisplay} is outside your budget range`;
    } else if (formCriteria.budget.includes("₹5000 - ₹10000")) {
      budgetMatches = productPrice >= 5000 && productPrice <= 10000;
      budgetDescription = budgetMatches
        ? `${priceDisplay} fits your budget (₹5,000 - ₹10,000)`
        : `${priceDisplay} is outside your budget range`;
    } else if (formCriteria.budget.includes("₹10000+")) {
      budgetMatches = productPrice >= 10000;
      budgetDescription = budgetMatches
        ? `${priceDisplay} fits your premium budget`
        : `${priceDisplay} is below your budget range`;
    } else {
      budgetDescription = `${priceDisplay} within reasonable range`;
    }

    // Occasion Match
    const productOccasions = rec.product.occasions || [];
    const occasionMatches = productOccasions.some(occ =>
      occ.toLowerCase().includes(formCriteria.occasion.toLowerCase())
    ) || formCriteria.occasion === "Just Because";
    
    // Create unique occasion descriptions based on the occasion and product
    const occasionDescriptions: Record<string, string[]> = {
      birthday: [
        "Perfect for making their birthday special and memorable",
        "A birthday gift that shows you truly know them",
        "Celebrates their special day with thoughtful consideration"
      ],
      anniversary: [
        "Commemorates your time together beautifully",
        "A meaningful way to celebrate your journey",
        "Shows appreciation for years of memories"
      ],
      graduation: [
        "Celebrates this major achievement perfectly",
        "Marks the start of their new chapter",
        "Recognizes their hard work and success"
      ],
      holiday: [
        "Brings joy to the holiday season",
        "Perfect for spreading festive cheer",
        "Makes the holidays even more special"
      ],
      "just because": [
        "Shows you're thinking of them for no reason at all",
        "A spontaneous gesture of appreciation",
        "Perfect for making any day special"
      ]
    };
    
    const occasionKey = formCriteria.occasion.toLowerCase();
    const descriptions = occasionDescriptions[occasionKey] || occasionDescriptions["just because"];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    const occasionDescription = occasionMatches
      ? randomDescription
      : `Versatile gift that works for ${formCriteria.occasion} too`;

    return {
      interestMatch: {
        percentage: interestPercentage,
        description: interestDescription,
      },
      budgetMatch: {
        matches: budgetMatches,
        description: budgetDescription,
      },
      occasionMatch: {
        matches: occasionMatches,
        description: occasionDescription,
      },
    };
  };

  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: [`/api/recommendations/${sessionId}`],
    enabled: !!sessionId,
  });

  // Fetch wishlist items to track which products are saved
  const { data: wishlistItems } = useQuery<any[]>({
    queryKey: isAuthenticated ? ["/api/wishlist/bucket"] : ["/api/wishlist", sessionId],
    enabled: !!sessionId,
  });

  // Create a Set of wishlist recommendation IDs for fast lookup
  const wishlistRecommendationIds = useMemo(() => {
    if (!wishlistItems) return new Set<string>();
    return new Set(wishlistItems.map((item: any) => item.recommendationId));
  }, [wishlistItems]);

  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      const storageKey = `giftai_request_${sessionId}`;
      const storedRequest = localStorage.getItem(storageKey);
      
      if (!storedRequest) {
        console.error("localStorage key not found:", storageKey);
        throw new Error("Please refresh the page and try again");
      }
      
      const requestData = JSON.parse(storedRequest);
      const response = await apiRequest("POST", `/api/recommendations/${sessionId}/more`, requestData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "More Ideas Added",
        description: "We've found more gift recommendations for you!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/recommendations/${sessionId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't Load More",
        description: error.message || "We couldn't find any more suitable gifts.",
        variant: "destructive",
      });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const payload = isAuthenticated
        ? { recommendationId }
        : { sessionId, recommendationId };
      return await apiRequest("POST", "/api/wishlist", payload);
    },
    onSuccess: (_, recommendationId) => {
      toast({
        title: isAuthenticated ? "Added to Bucket List" : "Added to Wishlist",
        description: isAuthenticated 
          ? "Gift saved to your bucket list and will persist across sessions!" 
          : "Gift saved to your wishlist successfully!",
      });
      // Invalidate both queries to update wishlist state
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist/bucket"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist", sessionId] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: isAuthenticated ? "Failed to add gift to bucket list" : "Failed to add gift to wishlist",
        variant: "destructive",
      });
    },
  });

  const generateMessageMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return await apiRequest("POST", "/api/message", { recommendationId });
    },
    onSuccess: () => {
      setGeneratingMessageFor(null);
      toast({
        title: "Message Generated",
        description: "Personalized message created!",
      });
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

  const toggleWishlist = (recommendationId: string) => {
    addToWishlistMutation.mutate(recommendationId);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/wishlist")}
              className="gap-2"
            >
              <Heart className="w-4 h-4" />
              {isAuthenticated ? "Bucket List" : "Wishlist"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Swipe left/right for details</span>
          </div>
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            data-testid="text-results-title"
          >
            Your Perfect{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Gift Ideas
            </span>
          </motion.h1>
          <p className="text-lg text-muted-foreground" data-testid="text-results-description">
            AI-powered recommendations based on interests and budget
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} data-testid={`skeleton-card-${i}`} className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, index) => {
              const matchDetails = calculateMatchDetails(rec);
              const isInWishlist = wishlistRecommendationIds.has(rec.id);
              
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <SwipeableCard
                    matchScore={rec.relevanceScore}
                    matchDetails={matchDetails}
                  >
                    <Card 
                      className="card-3d border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group h-full flex flex-col animate-slide-up"
                      data-testid={`card-recommendation-${rec.id}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" data-testid={`text-product-category-${rec.id}`}>
                            {rec.product.category}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleWishlist(rec.id)}
                            className={`transition-all duration-300 ${
                              isInWishlist 
                                ? "text-red-500 hover:text-red-600" 
                                : "text-muted-foreground hover:text-primary"
                            }`}
                            data-testid={`button-save-${rec.id}`}
                          >
                            <Heart 
                              className={`w-5 h-5 transition-all duration-300 ${
                                isInWishlist ? "fill-red-500" : ""
                              }`} 
                            />
                          </Button>
                        </div>
                        <CardTitle className="text-xl line-clamp-2" data-testid={`text-product-name-${rec.id}`}>
                          {rec.product.name}
                        </CardTitle>
                        <CardDescription className="text-2xl font-bold text-primary" data-testid={`text-price-${rec.id}`}>
                          {rec.product.amazonPrice || `₹${rec.product.priceMin.toLocaleString()}`}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="flex-1 space-y-3">
                        {rec.product.imageUrl && (
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted/30">
                            <img 
                              src={rec.product.imageUrl} 
                              alt={rec.product.name}
                              className="w-full h-full object-contain"
                              data-testid={`img-product-${rec.id}`}
                            />
                          </div>
                        )}

                        {rec.product.amazonRating && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{rec.product.amazonRating}</span>
                            </div>
                            {rec.product.amazonNumRatings && (
                              <span className="text-xs text-muted-foreground">
                                ({rec.product.amazonNumRatings.toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}

                        {(rec.product.isPrime || rec.product.isBestSeller || rec.product.isAmazonChoice) && (
                          <div className="flex flex-wrap gap-2">
                            {rec.product.isPrime && (
                              <Badge variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                Prime
                              </Badge>
                            )}
                            {rec.product.isBestSeller && (
                              <Badge variant="outline" className="text-xs">
                                Best Seller
                              </Badge>
                            )}
                            {rec.product.isAmazonChoice && (
                              <Badge variant="outline" className="text-xs">
                                Amazon's Choice
                              </Badge>
                            )}
                          </div>
                        )}

                        <p className="text-muted-foreground text-sm" data-testid={`text-ai-reasoning-${rec.id}`}>
                          {rec.aiReasoning}
                        </p>

                        {rec.personalizedMessage && (
                          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-foreground italic" data-testid={`text-personalized-message-${rec.id}`}>
                                "{rec.personalizedMessage}"
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="flex flex-col gap-2">
                        {rec.product.amazonUrl && (
                          <Button
                            variant="outline"
                            className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            asChild
                            data-testid={`button-buy-${rec.id}`}
                          >
                            <a href={rec.product.amazonUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                              View Product
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateMessage(rec.id)}
                          disabled={generatingMessageFor === rec.id}
                          className="w-full"
                          data-testid={`button-generate-message-${rec.id}`}
                        >
                          {generatingMessageFor === rec.id ? (
                            <span className="flex items-center gap-2">
                              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Generating...
                            </span>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Generate Message
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </SwipeableCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>No Recommendations Found</CardTitle>
              <CardDescription>
                We couldn't find any suitable gifts. Try adjusting your search.
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

        {recommendations && recommendations.length > 0 && (
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => loadMoreMutation.mutate()}
              disabled={loadMoreMutation.isPending}
              className="gap-2 h-12 px-6"
              data-testid="button-load-more"
            >
              {loadMoreMutation.isPending ? (
                <>
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Finding More Ideas...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Load More Ideas
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
