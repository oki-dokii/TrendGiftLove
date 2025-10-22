import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import GiftFinder from "./GiftFinder";

export default function Hero() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            data-testid="badge-ai-powered"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Powered by AI</span>
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ perspective: 1000 }}
            data-testid="text-hero-title"
          >
            <motion.span
              style={{ display: "inline-block" }}
              whileHover={{ scale: 1.05, rotateX: 5 }}
            >
              Find the Perfect{" "}
            </motion.span>
            <motion.span 
              className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              style={{ display: "inline-block", transformStyle: "preserve-3d" }}
              whileHover={{ scale: 1.1, rotateY: 5 }}
            >
              Gift
            </motion.span>
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            data-testid="text-hero-description"
          >
            Discover thoughtful birthday gifts curated by AI — personal, relevant, and heartfelt.
          </motion.p>

          <motion.div 
            className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:shadow-[0_0_60px_rgba(168,85,247,0.6)]"
                    data-testid="button-start-finding"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Start Finding Gifts
                  </Button>
                </motion.div>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Find the Perfect Gift</DrawerTitle>
                  <DrawerDescription>
                    Tell us about the recipient to get personalized gift recommendations
                  </DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto max-h-[85vh] px-4 pb-8">
                  <GiftFinder onSuccess={() => setIsOpen(false)} />
                </div>
              </DrawerContent>
            </Drawer>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/chat")}
                className="h-14 px-8 text-lg font-semibold border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                data-testid="button-chat-finder"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat with AI
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/trending")}
                className="h-14 px-8 text-lg font-semibold border-2 border-accent/50 hover:bg-accent/10 hover:border-accent transition-all duration-300"
                data-testid="button-trending-gifts"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Trending Gifts
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
