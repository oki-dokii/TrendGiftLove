import { Brain, DollarSign, MessageSquare, Heart } from "lucide-react";
import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: Brain,
    title: "Smart Recommendations",
    description: "Personalized gift suggestions based on interests and personality.",
  },
  {
    icon: DollarSign,
    title: "Budget Filters",
    description: "Filter by price tiers and get options that fit any budget.",
  },
  {
    icon: MessageSquare,
    title: "AI Wishes",
    description: "Generate heartfelt birthday messages crafted by AI.",
  },
  {
    icon: Heart,
    title: "Wishlist",
    description: "Save favorites to your cozy gift bag for later.",
  },
];

const Features = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
