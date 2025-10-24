import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveSessionData } from "@/lib/sessionUtils";

const interests = [
  "Technology", "Books", "Music", "Art", "Sports", "Travel", 
  "Cooking", "Gaming", "Fashion", "Photography", "Fitness", 
  "Movies", "Nature", "DIY/Crafts", "Food"
];

const relationships = [
  { value: "friend", label: "Friend" },
  { value: "partner", label: "Partner/Spouse" },
  { value: "family", label: "Family Member" },
  { value: "colleague", label: "Colleague" },
  { value: "acquaintance", label: "Acquaintance" }
];

const budgetRanges = [
  { value: "Under ₹500", label: "Under ₹500" },
  { value: "₹500 - ₹2000", label: "₹500 - ₹2,000" },
  { value: "₹2000 - ₹5000", label: "₹2,000 - ₹5,000" },
  { value: "₹5000 - ₹10000", label: "₹5,000 - ₹10,000" },
  { value: "₹10000+", label: "₹10,000+" }
];

const occasions = [
  "Birthday", "Anniversary", "Graduation", "Holiday", "Just Because"
];

interface GiftFinderProps {
  onSuccess?: () => void;
}

export default function GiftFinder({ onSuccess }: GiftFinderProps = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    relationship: "",
    interests: [] as string[],
    personality: "",
    budget: "",
    occasion: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
    console.log(`Interest ${interest} toggled`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.relationship || formData.interests.length === 0 || !formData.budget || !formData.occasion) {
      toast({
        title: "Missing Information",
        description: "Please fill in relationship, at least one interest, budget, and occasion.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    console.log('Gift finder form submitted:', formData);
    
    try {
      const requestData = {
        recipientName: formData.name || undefined,
        recipientAge: formData.age ? parseInt(formData.age) : undefined,
        relationship: formData.relationship,
        interests: formData.interests,
        personality: formData.personality || undefined,
        budget: formData.budget,
        occasion: formData.occasion,
      };
      
      // This now uses Amazon products with AI-generated suggestions
      const response = await apiRequest("POST", "/api/recommendations", requestData);
      
      const data = await response.json();
      
      if (data.sessionId) {
        // Store request data in localStorage for "Load More" functionality and track current session
        saveSessionData(data.sessionId, requestData);
        onSuccess?.();
        navigate(`/results/${data.sessionId}`);
      } else {
        throw new Error("No session ID returned");
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="gift-finder" className="py-16 lg:py-24 bg-gradient-to-br from-primary/5 to-chart-2/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-gift-finder-title">
            Tell Us About Your Special Someone
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-gift-finder-description">
            The more we know, the better recommendations we can provide. Let's find the perfect gift together!
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-form-title">
              <Sparkles className="h-6 w-6 text-primary" />
              Gift Finder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" data-testid="label-name">Recipient's Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter their name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age" data-testid="label-age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    data-testid="input-age"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label data-testid="label-relationship">Your Relationship</Label>
                <Select value={formData.relationship} onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}>
                  <SelectTrigger data-testid="select-relationship">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label data-testid="label-interests">What are they interested in?</Label>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant={formData.interests.includes(interest) ? "default" : "outline"}
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleInterest(interest)}
                      data-testid={`badge-interest-${interest.toLowerCase()}`}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality" data-testid="label-personality">Personality/Style</Label>
                <Input
                  id="personality"
                  placeholder="e.g., adventurous, minimalist, traditional, quirky"
                  value={formData.personality}
                  onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                  data-testid="input-personality"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label data-testid="label-budget">Budget Range</Label>
                  <Select value={formData.budget} onValueChange={(value) => setFormData(prev => ({ ...prev, budget: value }))}>
                    <SelectTrigger data-testid="select-budget">
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetRanges.map((budget) => (
                        <SelectItem key={budget.value} value={budget.value}>
                          {budget.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-occasion">Occasion</Label>
                  <Select value={formData.occasion} onValueChange={(value) => setFormData(prev => ({ ...prev, occasion: value }))}>
                    <SelectTrigger data-testid="select-occasion">
                      <SelectValue placeholder="Select occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      {occasions.map((occasion) => (
                        <SelectItem key={occasion} value={occasion.toLowerCase()}>
                          {occasion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full text-lg py-6"
                disabled={isLoading}
                data-testid="button-find-gifts"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                    Finding Perfect Gifts...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Find Perfect Gifts
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}