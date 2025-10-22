import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, Gift } from "lucide-react";
import Header from "@/components/Header";
import RecipientProfileForm from "@/components/RecipientProfileForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RecipientProfile } from "@shared/schema";

export default function RecipientProfilesPage() {
  const [, setLocation] = useLocation();
  const [editingProfile, setEditingProfile] = useState<RecipientProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<RecipientProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: profiles, isLoading } = useQuery<RecipientProfile[]>({
    queryKey: ["/api/recipient-profiles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/recipient-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-profiles"] });
      toast({
        title: "Profile Deleted",
        description: "Recipient profile has been deleted successfully.",
      });
      setDeletingProfile(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleUseProfile = (profile: RecipientProfile) => {
    setLocation(`/chat?profile=${profile.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Saved Recipients</h1>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingProfile(null)} data-testid="button-add-profile">
                <Plus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? "Edit Recipient Profile" : "Add New Recipient"}
                </DialogTitle>
              </DialogHeader>
              <RecipientProfileForm
                profile={editingProfile}
                onSuccess={handleFormSuccess}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="hover-elevate"
                data-testid={`card-profile-${profile.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span data-testid={`text-profile-name-${profile.id}`}>
                      {profile.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProfile(profile);
                          setIsFormOpen(true);
                        }}
                        data-testid={`button-edit-${profile.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingProfile(profile)}
                        data-testid={`button-delete-${profile.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {profile.relationship && (
                      <Badge variant="secondary">{profile.relationship}</Badge>
                    )}
                    {profile.age && (
                      <Badge variant="outline">{profile.age} years old</Badge>
                    )}
                    {profile.gender && (
                      <Badge variant="outline">{profile.gender}</Badge>
                    )}
                  </div>

                  {profile.interests.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Interests:</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.interests.slice(0, 3).map((interest) => (
                          <Badge key={interest} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {profile.interests.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.interests.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.personality && (
                    <p className="text-sm text-muted-foreground">
                      Personality: {profile.personality}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => handleUseProfile(profile)}
                    data-testid={`button-use-profile-${profile.id}`}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Find Gifts
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground mb-4">
              No saved recipient profiles yet
            </p>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-first-profile">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Recipient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Recipient</DialogTitle>
                </DialogHeader>
                <RecipientProfileForm onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        )}

        <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recipient Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the profile for {deletingProfile?.name}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingProfile && deleteMutation.mutate(deletingProfile.id)}
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
