import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, ShoppingBag, Star, Package, ExternalLink, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type WishlistItem = {
  id: string;
  recommendationId: string;
  productId: string;
  notes: string | null;
  recommendation: {
    id: string;
    aiReasoning: string;
    relevanceScore: number;
    product: {
      id: string;
      name: string;
      description: string;
      category: string;
      priceMin: number;
      priceMax: number;
      imageUrl: string | null;
      amazonUrl?: string | null;
      amazonPrice?: string | null;
      amazonRating?: string | null;
      amazonNumRatings?: number | null;
      isPrime?: boolean;
      isBestSeller?: boolean;
      isAmazonChoice?: boolean;
      flipkartUrl?: string | null;
    };
  };
};

export default function Wishlist() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch wishlist based on auth status
  const { data: wishlistItems, isLoading } = useQuery<WishlistItem[]>({
    queryKey: isAuthenticated ? ["/api/wishlist/bucket"] : ["/api/wishlist"],
    enabled: true,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("DELETE", `/api/wishlist/${itemId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Removed from wishlist",
        description: "Gift removed from your wishlist",
      });
      // Invalidate appropriate query based on auth status
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist/bucket"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove gift from wishlist",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromWishlist = (itemId: string) => {
    removeFromWishlistMutation.mutate(itemId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-primary text-primary" />
            <span className="font-semibold">My Wishlist</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Your Saved <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Favorites</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Keep track of the gifts you love
            </p>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-full">
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
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card 
                    className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)] group h-full flex flex-col"
                    data-testid={`card-wishlist-${item.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" data-testid={`text-product-category-${item.id}`}>
                          {item.recommendation.product.category}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                      <CardTitle className="text-xl line-clamp-2" data-testid={`text-product-name-${item.id}`}>
                        {item.recommendation.product.name}
                      </CardTitle>
                      <CardDescription className="text-2xl font-bold text-primary" data-testid={`text-price-${item.id}`}>
                        {item.recommendation.product.amazonPrice || `₹${item.recommendation.product.priceMin.toLocaleString()}`}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-3">
                      {item.recommendation.product.imageUrl && (
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted/30">
                          <img 
                            src={item.recommendation.product.imageUrl} 
                            alt={item.recommendation.product.name}
                            className="w-full h-full object-contain"
                            data-testid={`img-product-${item.id}`}
                          />
                        </div>
                      )}

                      {item.recommendation.product.amazonRating && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{item.recommendation.product.amazonRating}</span>
                          </div>
                          {item.recommendation.product.amazonNumRatings && (
                            <span className="text-xs text-muted-foreground">
                              ({item.recommendation.product.amazonNumRatings.toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}

                      {(item.recommendation.product.isPrime || item.recommendation.product.isBestSeller || item.recommendation.product.isAmazonChoice) && (
                        <div className="flex flex-wrap gap-2">
                          {item.recommendation.product.isPrime && (
                            <Badge variant="outline" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Prime
                            </Badge>
                          )}
                          {item.recommendation.product.isBestSeller && (
                            <Badge variant="outline" className="text-xs">
                              Best Seller
                            </Badge>
                          )}
                          {item.recommendation.product.isAmazonChoice && (
                            <Badge variant="outline" className="text-xs">
                              Amazon's Choice
                            </Badge>
                          )}
                        </div>
                      )}

                      <p className="text-muted-foreground text-sm" data-testid={`text-ai-reasoning-${item.id}`}>
                        {item.recommendation.aiReasoning}
                      </p>
                    </CardContent>

                    <CardFooter>
                      {(item.recommendation.product.amazonUrl || item.recommendation.product.flipkartUrl) && (
                        <Button
                          variant="default"
                          className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          asChild
                          data-testid={`button-buy-${item.id}`}
                        >
                          <a href={(item.recommendation.product.amazonUrl || item.recommendation.product.flipkartUrl) ?? undefined} target="_blank" rel="noopener noreferrer">
                            View Product
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-border bg-card/30 backdrop-blur-sm max-w-2xl mx-auto">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-primary" />
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Wishlist Empty</h2>
                      <p className="text-muted-foreground">
                        You haven't saved any gifts yet. Start browsing to add items to your wishlist!
                      </p>
                    </div>

                    <Button
                      onClick={() => navigate("/")}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                      data-testid="button-start-finding"
                    >
                      Start Finding Gifts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
