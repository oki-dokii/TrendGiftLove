import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRecipientProfileSchema, type RecipientProfile } from "@shared/schema";
import { z } from "zod";
import { X } from "lucide-react";

const formSchema = insertRecipientProfileSchema.extend({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const AVAILABLE_INTERESTS = [
  "Technology",
  "Books",
  "Music",
  "Art",
  "Sports",
  "Cooking",
  "Travel",
  "Gaming",
  "Fashion",
  "Fitness",
  "Photography",
  "Gardening",
];

const OCCASIONS = ["Birthday", "Anniversary", "Wedding", "Graduation", "Festival"];

interface RecipientProfileFormProps {
  profile?: RecipientProfile | null;
  onSuccess?: () => void;
}

export default function RecipientProfileForm({ profile, onSuccess }: RecipientProfileFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      name: profile?.name || "",
      gender: profile?.gender || "",
      age: profile?.age || undefined,
      interests: profile?.interests || [],
      personality: profile?.personality || "",
      relationship: profile?.relationship || "",
      favoriteOccasions: profile?.favoriteOccasions || [],
      notes: profile?.notes || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/recipient-profiles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-profiles"] });
      toast({
        title: "Profile Created",
        description: "Recipient profile has been saved successfully.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("PATCH", `/api/recipient-profiles/${profile!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-profiles"] });
      toast({
        title: "Profile Updated",
        description: "Recipient profile has been updated successfully.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (profile) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleInterest = (interest: string) => {
    const current = form.getValues("interests");
    if (current.includes(interest)) {
      form.setValue(
        "interests",
        current.filter((i) => i !== interest)
      );
    } else {
      form.setValue("interests", [...current, interest]);
    }
  };

  const toggleOccasion = (occasion: string) => {
    const current = form.getValues("favoriteOccasions") || [];
    if (current.includes(occasion)) {
      form.setValue(
        "favoriteOccasions",
        current.filter((o) => o !== occasion)
      );
    } else {
      form.setValue("favoriteOccasions", [...current, occasion]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter recipient's name" data-testid="input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="Age"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-age"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="relationship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger data-testid="select-relationship">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Colleague">Colleague</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="interests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interests *</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {field.value.map((interest) => (
                  <Badge
                    key={interest}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => toggleInterest(interest)}
                    data-testid={`badge-interest-${interest.toLowerCase()}`}
                  >
                    {interest}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.filter((i) => !field.value.includes(i)).map((interest) => (
                  <Badge
                    key={interest}
                    variant="outline"
                    className="cursor-pointer hover-elevate"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personality</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger data-testid="select-personality">
                    <SelectValue placeholder="Select personality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Adventurous">Adventurous</SelectItem>
                  <SelectItem value="Minimalist">Minimalist</SelectItem>
                  <SelectItem value="Traditional">Traditional</SelectItem>
                  <SelectItem value="Trendy">Trendy</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                  <SelectItem value="Romantic">Romantic</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="favoriteOccasions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Favorite Occasions</FormLabel>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occasion) => {
                  const isSelected = (field.value || []).includes(occasion);
                  return (
                    <Badge
                      key={occasion}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleOccasion(occasion)}
                    >
                      {occasion}
                    </Badge>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="Any additional notes about this person..."
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-submit"
          >
            {profile ? "Update Profile" : "Save Profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
