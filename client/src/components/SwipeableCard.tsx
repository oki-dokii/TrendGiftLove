import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Info, TrendingUp, Check, X } from "lucide-react";

type SwipeState = "default" | "match-score" | "match-details";

interface MatchDetails {
  interestMatch: {
    percentage: number;
    description: string;
  };
  budgetMatch: {
    matches: boolean;
    description: string;
  };
  occasionMatch: {
    matches: boolean;
    description: string;
  };
}

interface SwipeableCardProps {
  children: React.ReactNode;
  matchScore: number;
  matchDetails: MatchDetails;
  onSwipeEnd?: () => void;
}

export default function SwipeableCard({ 
  children, 
  matchScore, 
  matchDetails,
  onSwipeEnd 
}: SwipeableCardProps) {
  const [swipeState, setSwipeState] = useState<SwipeState>("default");
  const x = useMotionValue(0);
  
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Right swipe - show match score
    if (offset > 100 || velocity > 500) {
      setSwipeState("match-score");
      x.set(0);
      onSwipeEnd?.();
    }
    // Left swipe - show match details
    else if (offset < -100 || velocity < -500) {
      setSwipeState("match-details");
      x.set(0);
      onSwipeEnd?.();
    }
    // Reset if not enough swipe
    else {
      x.set(0);
    }
  };

  const resetToDefault = () => {
    setSwipeState("default");
  };

  // Match Score Overlay (Right Swipe)
  if (swipeState === "match-score") {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card 
          className="relative overflow-hidden border-primary/50 bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm h-full min-h-[400px] cursor-pointer"
          onClick={resetToDefault}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <TrendingUp className="w-16 h-16 text-primary mx-auto" />
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-9xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              {matchScore}%
            </motion.div>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-muted-foreground mt-4"
            >
              Match Score
            </motion.p>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mt-8"
            >
              Tap to go back
            </motion.p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Match Details Overlay (Left Swipe)
  if (swipeState === "match-details") {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card 
          className="relative overflow-hidden border-primary/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm h-full min-h-[400px] cursor-pointer"
          onClick={resetToDefault}
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Match Details</h3>
            </div>
            
            <p className="text-muted-foreground mb-8">
              How this gift matches your criteria
            </p>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Interest Match</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchDetails.interestMatch.description}
                  </p>
                </div>
                <div className="text-2xl font-bold text-primary ml-4">
                  {matchDetails.interestMatch.percentage}%
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 pt-6 border-t border-border"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Budget Match</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchDetails.budgetMatch.description}
                  </p>
                </div>
                {matchDetails.budgetMatch.matches ? (
                  <Check className="w-6 h-6 text-green-500 ml-4" data-testid="icon-budget-match" />
                ) : (
                  <X className="w-6 h-6 text-red-500 ml-4" data-testid="icon-budget-mismatch" />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-6 border-t border-border"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">Occasion Match</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchDetails.occasionMatch.description}
                  </p>
                </div>
                {matchDetails.occasionMatch.matches ? (
                  <Check className="w-6 h-6 text-green-500 ml-4" data-testid="icon-occasion-match" />
                ) : (
                  <X className="w-6 h-6 text-red-500 ml-4" data-testid="icon-occasion-mismatch" />
                )}
              </div>
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground text-center mt-8 pt-6 border-t border-border"
            >
              Tap to go back
            </motion.p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Default State - Swipeable Card
  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="cursor-grab"
    >
      {children}
    </motion.div>
  );
}
