import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";

const FindGifts = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipientName: "",
    age: "",
    interests: "",
    budget: "",
    occasion: "birthday",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/results", { state: formData });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold">Gift Finder</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            Let's Find the{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Perfect Gift
            </span>
          </motion.h1>
          <p className="text-lg text-muted-foreground">
            Tell us about the recipient and we'll curate personalized recommendations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.1}
        >
          <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Gift Details</CardTitle>
            <CardDescription>
              Fill in the information below to get AI-powered gift suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient's Name</Label>
                <Input
                  id="recipientName"
                  placeholder="e.g., Sarah"
                  value={formData.recipientName}
                  onChange={(e) =>
                    setFormData({ ...formData, recipientName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g., 25"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests & Hobbies</Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., Reading, hiking, photography, cooking..."
                  value={formData.interests}
                  onChange={(e) =>
                    setFormData({ ...formData, interests: e.target.value })
                  }
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Select
                  value={formData.budget}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budget: value })
                  }
                  required
                >
                  <SelectTrigger id="budget">
                    <SelectValue placeholder="Select your budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-25">Under $25</SelectItem>
                    <SelectItem value="25-50">$25 - $50</SelectItem>
                    <SelectItem value="50-100">$50 - $100</SelectItem>
                    <SelectItem value="100-200">$100 - $200</SelectItem>
                    <SelectItem value="200-plus">$200+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occasion">Occasion</Label>
                <Select
                  value={formData.occasion}
                  onValueChange={(value) =>
                    setFormData({ ...formData, occasion: value })
                  }
                >
                  <SelectTrigger id="occasion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="just-because">Just Because</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300"
                >
                  Generate Gift Ideas
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default FindGifts;
