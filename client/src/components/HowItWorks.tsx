import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, Brain, Gift, Heart } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Tell Us About Them",
    description: "Share details about the recipient - their age, interests, personality, and your relationship with them."
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description: "Our AI analyzes their preferences and matches them with our curated gift database for personalized recommendations."
  },
  {
    icon: Gift,
    title: "Perfect Matches",
    description: "Get tailored gift suggestions across all budgets - from heartfelt DIY ideas to premium surprises."
  },
  {
    icon: Heart,
    title: "Save & Share",
    description: "Create wishlists, save favorites, and get AI-generated personalized messages to accompany your gifts."
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-how-it-works-title">
            How GiftAI Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-how-it-works-description">
            Our AI-powered platform makes finding the perfect gift simple, personal, and meaningful
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative" data-testid={`step-${index}`}>
              <Card className="h-full hover-elevate">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <div className="p-4 bg-primary/10 rounded-full">
                        <step.icon className="h-8 w-8 text-primary" data-testid={`icon-step-${index}`} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold" data-testid={`number-step-${index}`}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3" data-testid={`text-step-title-${index}`}>
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground" data-testid={`text-step-description-${index}`}>
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border transform -translate-y-1/2"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}