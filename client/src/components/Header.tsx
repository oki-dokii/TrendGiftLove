import { Button } from "@/components/ui/button";
import { Gift, Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Gift className="h-8 w-8 text-primary" data-testid="icon-logo" />
          <span className="text-xl font-bold text-foreground" data-testid="text-brand">GiftAI</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">
            How It Works
          </a>
          <a href="#gift-finder" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-gift-finder">
            Gift Finder
          </a>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
            Features
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button size="icon" variant="ghost" className="md:hidden" data-testid="button-menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}