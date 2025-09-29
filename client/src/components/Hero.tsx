import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/Gift_giving_hero_image_acb0ba0c.png";

export default function Hero() {
  const scrollToGiftFinder = () => {
    const giftFinderElement = document.getElementById('gift-finder');
    if (giftFinderElement) {
      giftFinderElement.scrollIntoView({ behavior: 'smooth' });
    }
    console.log('Scrolling to gift finder');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-chart-2/5">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="People exchanging gifts"
          className="w-full h-full object-cover opacity-20"
          data-testid="img-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/60"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-24 lg:py-32">
        <div className="max-w-3xl">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 leading-tight" data-testid="text-hero-title">
            Find the <span className="text-primary">Perfect Gift</span><br />
            for Every Occasion
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl" data-testid="text-hero-description">
            Discover personalized gift recommendations powered by AI. From heartfelt DIY ideas to premium surprises, find gifts that create lasting memories.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={scrollToGiftFinder}
              className="text-lg px-8 py-6"
              data-testid="button-start-finding"
            >
              Start Finding Gifts
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                const howItWorksElement = document.getElementById('how-it-works');
                if (howItWorksElement) {
                  howItWorksElement.scrollIntoView({ behavior: 'smooth' });
                }
                console.log('Scrolling to how it works');
              }}
              className="text-lg px-8 py-6 bg-background/20 backdrop-blur-sm"
              data-testid="button-how-it-works"
            >
              How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}