import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GiftIdea {
  id: number;
  title: string;
  description: string;
  price: string;
  category: string;
  url: string;
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formData = location.state as any;
  const [wishlist, setWishlist] = useState<number[]>([]);

  // Mock gift ideas based on the form data
  const giftIdeas: GiftIdea[] = [
    {
      id: 1,
      title: "Premium Leather Journal",
      description: "Handcrafted leather journal perfect for writing, sketching, or journaling. Features high-quality paper and a classic design.",
      price: "$45",
      category: "Stationery",
      url: "#",
    },
    {
      id: 2,
      title: "Wireless Noise-Canceling Headphones",
      description: "Experience premium sound quality with active noise cancellation. Perfect for music lovers and commuters.",
      price: "$149",
      category: "Electronics",
      url: "#",
    },
    {
      id: 3,
      title: "Artisan Coffee Subscription",
      description: "Monthly delivery of freshly roasted specialty coffee from around the world. A gift that keeps giving.",
      price: "$35/month",
      category: "Food & Drink",
      url: "#",
    },
    {
      id: 4,
      title: "Vintage Polaroid Camera",
      description: "Capture memories instantly with this retro-style instant camera. Comes with film and carrying case.",
      price: "$89",
      category: "Photography",
      url: "#",
    },
    {
      id: 5,
      title: "Ceramic Plant Pot Set",
      description: "Beautiful handmade ceramic pots with drainage, perfect for indoor plants. Includes 3 different sizes.",
      price: "$42",
      category: "Home & Garden",
      url: "#",
    },
    {
      id: 6,
      title: "Gourmet Cooking Kit",
      description: "Complete cooking set with premium spices, recipes, and cooking tools. Great for culinary enthusiasts.",
      price: "$65",
      category: "Kitchen",
      url: "#",
    },
  ];

  const toggleWishlist = (id: number) => {
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter((item) => item !== id));
      toast({
        description: "Removed from wishlist",
      });
    } else {
      setWishlist([...wishlist, id]);
      toast({
        description: "Added to wishlist",
      });
    }
  };

  const isInWishlist = (id: number) => wishlist.includes(id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/find-gifts")}
            className="gap-2"
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
              Wishlist ({wishlist.length})
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
            <span className="text-sm text-muted-foreground">AI-Curated Results</span>
          </div>
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            Gift Ideas for{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formData?.recipientName || "Your Loved One"}
            </span>
          </motion.h1>
          <p className="text-lg text-muted-foreground">
            Based on their interests and your budget
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {giftIdeas.map((gift, index) => (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              whileHover={{ 
                scale: 1.05,
                rotateZ: 2,
                transition: { type: "spring", stiffness: 300 }
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)] group h-full"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{gift.category}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleWishlist(gift.id)}
                    className={`transition-colors ${
                      isInWishlist(gift.id) ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${isInWishlist(gift.id) ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
                <CardTitle className="text-xl">{gift.title}</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">
                  {gift.price}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{gift.description}</p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  asChild
                >
                  <a href={gift.url} target="_blank" rel="noopener noreferrer">
                    View Product
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/find-gifts")}
            className="gap-2"
          >
            Try Different Preferences
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
