import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ExternalLink, Eye, ArrowLeft, Star, Package, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

type WishlistItem = {
  id: string;
  recommendationId: string;
  productId: string;
  recommendation: {
    id: string;
    aiReasoning: string;
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
    };
  };
};

type SharedWishlistData = {
  wishlist: {
    title: string | null;
    description: string | null;
    viewCount: number;
    createdAt: string;
  };
  items: WishlistItem[];
};

export default function PublicWishlistPage() {
  const [, navigate] = useLocation();
  
  // Try both route patterns
  const [, paramsLong] = useRoute("/wishlist/shared/:token");
  const [, paramsShort] = useRoute("/shared/:token");
  const token = paramsLong?.token || paramsShort?.token;

  const { data: wishlistData, isLoading } = useQuery<SharedWishlistData>({
    queryKey: [`/api/wishlist/shared/${token}`],
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          
          <div className="flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5 fill-primary" />
            <span className="font-semibold text-base">Shared Wishlist</span>
          </div>
          
          {wishlistData && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              <span data-testid="text-view-count">{wishlistData.wishlist.viewCount} views</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-full">
                <CardHeader className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlistData ? (
          wishlistData.items.length > 0 ? (
          <>
            {/* Page Header */}
            <div className="text-center mb-8 md:mb-12 space-y-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold" data-testid="text-wishlist-title">
                {wishlistData.wishlist.title || "Gift Ideas"} <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wishlist</span>
              </h1>
              {wishlistData.wishlist.description && (
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto" data-testid="text-wishlist-description">
                  {wishlistData.wishlist.description}
                </p>
              )}
            </div>

            {/* Wishlist Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {wishlistData.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card 
                    className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)] group h-full flex flex-col"
                    data-testid={`card-wishlist-item-${item.id}`}
                  >
                    <CardHeader className="space-y-3 pb-4">
                      <Badge variant="secondary" className="w-fit">
                        {item.recommendation.product.category}
                      </Badge>
                      <CardTitle className="text-lg md:text-xl line-clamp-2 leading-tight" data-testid={`text-product-name-${item.id}`}>
                        {item.recommendation.product.name}
                      </CardTitle>
                      <CardDescription className="text-xl md:text-2xl font-bold text-primary !mt-2">
                        {item.recommendation.product.amazonPrice || (item.recommendation.product.priceMin ? `₹${item.recommendation.product.priceMin.toLocaleString()}` : "Price not available")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4 pb-4">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{item.recommendation.product.amazonRating}</span>
                          </div>
                          {item.recommendation.product.amazonNumRatings && (
                            <span className="text-xs text-muted-foreground">
                              ({typeof item.recommendation.product.amazonNumRatings === 'number' 
                                ? item.recommendation.product.amazonNumRatings.toLocaleString() 
                                : item.recommendation.product.amazonNumRatings})
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

                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {item.recommendation.aiReasoning}
                      </p>
                    </CardContent>

                    {item.recommendation.product.amazonUrl && (
                      <div className="p-6 pt-0">
                        <Button
                          variant="default"
                          className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          asChild
                          data-testid={`button-buy-${item.id}`}
                        >
                          <a href={item.recommendation.product.amazonUrl} target="_blank" rel="noopener noreferrer">
                            View Product
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <Card className="border-border bg-card/40 backdrop-blur-sm max-w-xl mx-auto shadow-[0_8px_32px_rgba(168,85,247,0.15)]">
                <CardContent className="py-12 px-6 md:px-12">
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <ShoppingBag className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold">Wishlist Empty</h2>
                      <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                        This wishlist doesn't have any items yet.
                      </p>
                    </div>

                    <Button
                      onClick={() => navigate("/")}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.3)] px-8"
                      size="lg"
                      data-testid="button-go-home"
                    >
                      Discover Gifts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <Card className="border-border bg-card/40 backdrop-blur-sm max-w-xl mx-auto shadow-[0_8px_32px_rgba(168,85,247,0.15)]">
              <CardContent className="py-12 px-6 md:px-12">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                      <Heart className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold">Wishlist Not Found</h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                      This wishlist doesn't exist or has been removed.
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate("/")}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.3)] px-8"
                    size="lg"
                    data-testid="button-go-home"
                  >
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
