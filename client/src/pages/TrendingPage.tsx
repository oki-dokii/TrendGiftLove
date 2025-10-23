import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Star, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import type { GiftProduct } from "@shared/schema";

export default function TrendingPage() {
  const { data: trendingGifts, isLoading } = useQuery<GiftProduct[]>({
    queryKey: ["/api/gifts/trending"],
  });

  const filteredGifts = (filter: string) => {
    if (!trendingGifts) return [];
    
    switch (filter) {
      case "occasions":
        return trendingGifts.filter((gift) =>
          gift.occasions.some((occ) =>
            ["Birthday", "Anniversary", "Wedding"].includes(occ)
          )
        );
      case "under-500":
        return trendingGifts.filter((gift) => gift.priceMax <= 500);
      case "all":
      default:
        return trendingGifts;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Trending Gifts</h1>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
            <TabsTrigger value="occasions" data-testid="tab-occasions">
              Special Occasions
            </TabsTrigger>
            <TabsTrigger value="under-500" data-testid="tab-under-500">
              Under ₹500
            </TabsTrigger>
          </TabsList>

          {["all", "occasions", "under-500"].map((filter) => (
            <TabsContent key={filter} value={filter}>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-48 w-full rounded-md" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGifts(filter).map((gift) => (
                    <Card
                      key={gift.id}
                      className="hover-elevate overflow-hidden"
                      data-testid={`card-gift-${gift.id}`}
                    >
                      <CardHeader className="p-0">
                        {gift.imageUrl ? (
                          <img
                            src={gift.imageUrl}
                            alt={gift.name}
                            className="w-full h-48 object-cover"
                            data-testid={`img-gift-${gift.id}`}
                          />
                        ) : (
                          <div className="w-full h-48 bg-muted flex items-center justify-center">
                            <Star className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="p-4">
                        <CardTitle className="text-lg mb-2 line-clamp-2">
                          {gift.name}
                        </CardTitle>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary">
                            ₹{gift.priceMin} - ₹{gift.priceMax}
                          </Badge>
                          <Badge variant="outline">{gift.category}</Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {gift.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {gift.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            const url = gift.amazonUrl || `https://www.amazon.in/s?k=${encodeURIComponent(gift.name)}`;
                            window.open(url, "_blank");
                          }}
                          data-testid={`button-buy-${gift.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Buy Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoading && filteredGifts(filter).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No trending gifts found for this filter.
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
