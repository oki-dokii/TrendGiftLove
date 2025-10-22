import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Check } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SharedWishlist } from "@shared/schema";

interface ShareWishlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  sessionId?: string;
}

export default function ShareWishlistModal({
  open,
  onOpenChange,
  userId,
  sessionId,
}: ShareWishlistModalProps) {
  const [sharedWishlist, setSharedWishlist] = useState<SharedWishlist | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const createShareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wishlist/share", {
        userId,
        sessionId,
        title: "My Gift Wishlist",
        description: "Check out my wishlist!",
      });
      return response.json();
    },
    onSuccess: (data: SharedWishlist) => {
      setSharedWishlist(data);
      toast({
        title: "Wishlist Shared!",
        description: "Your wishlist link has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create shareable link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const shareUrl = sharedWishlist
    ? `${window.location.origin}/wishlist/shared/${sharedWishlist.shareToken}`
    : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    
    const message = encodeURIComponent(
      `Check out my gift wishlist: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSharedWishlist(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="modal-share-wishlist">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Wishlist
          </DialogTitle>
          <DialogDescription>
            Create a shareable link to your wishlist that anyone can view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!sharedWishlist ? (
            <Button
              onClick={() => createShareMutation.mutate()}
              disabled={createShareMutation.isPending}
              className="w-full"
              data-testid="button-create-link"
            >
              Create Shareable Link
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-url">Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                    data-testid="input-share-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Share via</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleWhatsAppShare}
                  data-testid="button-share-whatsapp"
                >
                  <SiWhatsapp className="h-4 w-4 mr-2" />
                  Share on WhatsApp
                </Button>
              </div>

              <div className="bg-muted/30 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can view your wishlist. The link will remain
                  active unless you delete it.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
