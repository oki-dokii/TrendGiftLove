import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <motion.div
      drag
      dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
      dragElastic={0.1}
      whileHover={{ scale: 1.05, rotateY: 5, rotateX: 5 }}
      whileTap={{ scale: 0.95 }}
      style={{ perspective: 1000 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="group relative overflow-hidden border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)]">
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-300" />
        
        <CardHeader className="relative">
          <motion.div 
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            whileHover={{ rotateY: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <CardDescription className="text-base text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FeatureCard;
