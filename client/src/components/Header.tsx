import { Button } from "@/components/ui/button";
import { Gift, TrendingUp, MessageSquare } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useLocation } from "wouter";

export default function Header() {
  const [, navigate] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <button onClick={() => navigate("/")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Gift className="h-8 w-8 text-primary" data-testid="icon-logo" />
          <span className="text-xl font-bold text-foreground" data-testid="text-brand">GiftAI</span>
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/trending")}
            className="gap-2 hidden sm:flex hover-elevate active-elevate-2"
            data-testid="button-trending"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Trending</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/chat")}
            className="gap-2 hidden sm:flex hover-elevate active-elevate-2"
            data-testid="button-chatbot"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </Button>
          <ThemeToggle />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/wishlist")}
            className="gap-2 hover-elevate active-elevate-2"
            data-testid="button-wishlist"
          >
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Wishlist</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
