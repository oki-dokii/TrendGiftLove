import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, ShoppingBag, Star, Package, ExternalLink, Trash2, Share2, Copy, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { getCurrentSessionId } from "@/lib/sessionUtils";

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
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const sessionId = getCurrentSessionId();

  // Fetch wishlist based on sessionId
  const { data: wishlistItems, isLoading } = useQuery<WishlistItem[]>({
    queryKey: sessionId 
      ? ["/api/wishlist", sessionId]
      : ["/api/wishlist"],
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
      // Invalidate wishlist query
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist", sessionId] });
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

  const shareWishlistMutation = useMutation({
    mutationFn: async () => {
      const payload = { sessionId, title: "My Wishlist", description: "Check out my wishlist!" };
      const response = await apiRequest("POST", "/api/wishlist/share", payload);
      return await response.json();
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      setIsShareDialogOpen(true);
      toast({
        title: "Shareable Link Created",
        description: "Your wishlist can now be shared with anyone!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create shareable link",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

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
            <span className="hidden sm:inline">Back</span>
          </Button>
          
          <div className="flex items-center gap-2 text-primary">
            <Heart className="h-5 w-5 fill-primary" />
            <span className="font-semibold text-base">My Wishlist</span>
          </div>
          
          {wishlistItems && wishlistItems.length > 0 && (
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => shareWishlistMutation.mutate()}
                  disabled={shareWishlistMutation.isPending}
                  className="gap-2"
                  data-testid="button-share-wishlist"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-share">
                <DialogHeader>
                  <DialogTitle>Share Your Wishlist</DialogTitle>
                  <DialogDescription>
                    Anyone with this link can view your wishlist
                  </DialogDescription>
                </DialogHeader>
                {shareUrl && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        data-testid="input-share-url"
                      />
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        size="icon"
                        data-testid="button-copy-link"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share this link with friends and family to show them your gift preferences!
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Page Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Your Saved <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Favorites</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Keep track of the gifts you love
          </p>
        </div>

        {/* Content */}
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
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : wishlistItems && wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {wishlistItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <Card 
                  className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)] group h-full flex flex-col"
                  data-testid={`card-wishlist-${item.id}`}
                >
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="flex-shrink-0" data-testid={`text-product-category-${item.id}`}>
                        {item.recommendation.product.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromWishlist(item.id)}
                        className="text-red-500 hover:text-red-600 transition-colors flex-shrink-0 -mr-2 -mt-1"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg md:text-xl line-clamp-2 leading-tight" data-testid={`text-product-name-${item.id}`}>
                      {item.recommendation.product.name}
                    </CardTitle>
                    <CardDescription className="text-xl md:text-2xl font-bold text-primary !mt-2" data-testid={`text-price-${item.id}`}>
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

                    <p className="text-muted-foreground text-sm line-clamp-3" data-testid={`text-ai-reasoning-${item.id}`}>
                      {item.recommendation.aiReasoning}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-0">
                    {(item.recommendation.product.amazonUrl || item.recommendation.product.flipkartUrl) && (
                      <Button
                        variant="default"
                        className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
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
                      You haven't saved any gifts yet. Start browsing to add items to your wishlist!
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate("/")}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.3)] px-8"
                    size="lg"
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
  );
}
