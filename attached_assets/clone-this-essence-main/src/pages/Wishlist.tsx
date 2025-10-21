import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react";

const Wishlist = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary fill-current" />
            <span className="font-semibold">My Wishlist</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            Your Saved{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Favorites
            </span>
          </motion.h1>
          <p className="text-lg text-muted-foreground">
            Keep track of the gifts you love
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Wishlist Empty</CardTitle>
            <CardDescription>
              You haven't saved any gifts yet. Start browsing to add items to your wishlist!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-primary" />
            </div>
            <Button
              onClick={() => navigate("/find-gifts")}
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Start Finding Gifts
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Wishlist;
