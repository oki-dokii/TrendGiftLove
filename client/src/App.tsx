import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Results from "@/pages/Results";
import Auth from "@/pages/Auth";
import Wishlist from "@/pages/Wishlist";
import ChatFinder from "@/pages/ChatFinder";
import TrendingPage from "@/pages/TrendingPage";
import RecipientProfilesPage from "@/pages/RecipientProfilesPage";
import PublicWishlistPage from "@/pages/PublicWishlistPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/results/:sessionId" component={Results} />
      <Route path="/chat" component={ChatFinder} />
      <Route path="/trending" component={TrendingPage} />
      <Route path="/recipients" component={RecipientProfilesPage} />
      <Route path="/shared/:token" component={PublicWishlistPage} />
      <Route path="/wishlist/shared/:token" component={PublicWishlistPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
