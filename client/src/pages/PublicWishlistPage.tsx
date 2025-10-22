import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ExternalLink, Eye } from "lucide-react";
import Header from "@/components/Header";
import type { SharedWishlist, WishlistItem, GiftProduct } from "@shared/schema";

interface EnrichedWishlistItem extends WishlistItem {
  product: GiftProduct | null;
}

interface SharedWishlistData extends SharedWishlist {
  items: EnrichedWishlistItem[];
}

export default function PublicWishlistPage() {
  const [, params] = useRoute("/wishlist/shared/:token");
  const token = params?.token;

  const { data: wishlistData, isLoading } = useQuery<SharedWishlistData>({
    queryKey: ["/api/wishlist/shared", token],
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Invalid wishlist link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : wishlistData ? (
          <>
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2" data-testid="text-wishlist-title">
                      {wishlistData.title || "Shared Wishlist"}
                    </CardTitle>
                    {wishlistData.description && (
                      <p className="text-muted-foreground" data-testid="text-wishlist-description">
                        {wishlistData.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm" data-testid="text-view-count">
                      {wishlistData.viewCount} views
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {wishlistData.items.length > 0 ? (
              <div className="space-y-6">
                {wishlistData.items.map((item) => (
                  <Card
                    key={item.id}
                    className="hover-elevate overflow-hidden"
                    data-testid={`card-wishlist-item-${item.id}`}
                  >
                    <div className="md:flex">
                      {item.product?.imageUrl ? (
                        <div className="md:w-48 md:flex-shrink-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-48 w-full object-cover md:h-full"
                            data-testid={`img-product-${item.id}`}
                          />
                        </div>
                      ) : (
                        <div className="md:w-48 md:flex-shrink-0 h-48 bg-muted flex items-center justify-center">
                          <Heart className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1">
                        <CardHeader>
                          <CardTitle data-testid={`text-product-name-${item.id}`}>
                            {item.product?.name || "Product"}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {item.product && (
                            <>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" data-testid={`badge-price-${item.id}`}>
                                  ₹{item.product.priceMin} - ₹{item.product.priceMax}
                                </Badge>
                                <Badge variant="outline">{item.product.category}</Badge>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.product.description}
                              </p>

                              {item.notes && (
                                <div className="bg-muted/30 p-3 rounded-md">
                                  <p className="text-sm">
                                    <strong>Note:</strong> {item.notes}
                                  </p>
                                </div>
                              )}

                              {item.product.flipkartUrl && (
                                <Button
                                  onClick={() =>
                                    window.open(item.product!.flipkartUrl!, "_blank")
                                  }
                                  data-testid={`button-buy-${item.id}`}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Buy on Flipkart
                                </Button>
                              )}
                            </>
                          )}
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">
                  This wishlist is empty
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">Wishlist not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
