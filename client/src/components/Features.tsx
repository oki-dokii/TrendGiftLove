import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Brain, Wallet, Users } from "lucide-react";

const features = [
  {
    icon: Heart,
    title: "Personalized",
    description: "Tailored recommendations based on personality, interests, and budget",
    badge: "Smart AI"
  },
  {
    icon: Brain,
    title: "AI-Powered",
    description: "Smart suggestions that get better with every search",
    badge: "Intelligent"
  },
  {
    icon: Wallet,
    title: "All Budgets",
    description: "From free DIY ideas to premium gifts, we've got you covered",
    badge: "₹0 - ₹5000+"
  },
  {
    icon: Users,
    title: "Personal Touch",
    description: "Custom messages and wishes for every occasion",
    badge: "Thoughtful"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-features-title">
            Why Choose GiftAI?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-description">
            Our platform combines artificial intelligence with human insight to make gift-giving meaningful and effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover-elevate" data-testid={`card-feature-${index}`}>
              <CardContent className="p-6">
                <div className="mb-4 flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="h-8 w-8 text-primary" data-testid={`icon-feature-${index}`} />
                  </div>
                </div>
                
                <Badge variant="secondary" className="mb-3" data-testid={`badge-feature-${index}`}>
                  {feature.badge}
                </Badge>
                
                <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`text-feature-title-${index}`}>
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground" data-testid={`text-feature-description-${index}`}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}