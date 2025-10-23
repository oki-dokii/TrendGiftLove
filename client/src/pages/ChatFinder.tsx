import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import type { ChatMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConversationState {
  recipientName?: string;
  recipientAge?: number;
  relationship?: string;
  interests: string[];
  personality?: string;
  budget?: string;
  occasion?: string;
}

export default function ChatFinder() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm GiftAI, your personal gift recommendation assistant! 🎁 Tell me who you're shopping for and what they like, and I'll find perfect gifts for them!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [conversationState, setConversationState] = useState<ConversationState>({
    interests: [],
  });
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [readyToRecommend, setReadyToRecommend] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userInput = inputValue.trim();
    addMessage("user", userInput);
    setInputValue("");
    setIsTyping(true);

    try {
      // If ready to recommend, generate recommendations
      if (readyToRecommend) {
        await generateRecommendations();
        return;
      }

      // CLIENT-SIDE SAFETY: Simple interest detection from user's message
      // This provides instant fallback if AI fails to extract properly
      const lowerMessage = userInput.toLowerCase();
      const interestKeywords = {
        'cricket': 'Cricket',
        'badminton': 'Badminton',
        'football': 'Football',
        'tennis': 'Tennis',
        'basketball': 'Basketball',
        'photography': 'Photography',
        'cooking': 'Cooking',
        'gaming': 'Gaming',
        'reading': 'Reading',
        'music': 'Music',
        'art': 'Art',
        'painting': 'Painting',
        'drawing': 'Drawing',
        'writing': 'Writing',
        'gardening': 'Gardening',
        'fitness': 'Fitness',
        'yoga': 'Yoga',
        'dancing': 'Dancing',
        'technology': 'Technology',
        'tech': 'Technology',
      };

      let detectedInterests: string[] = [];
      for (const [keyword, interest] of Object.entries(interestKeywords)) {
        if (lowerMessage.includes(keyword)) {
          detectedInterests.push(interest);
        }
      }

      // Otherwise, process the message conversationally
      const response = await apiRequest("POST", "/api/chat", {
        message: userInput,
        conversationState,
      });

      const data = await response.json();
      
      // Simulate typing delay for more natural feel
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsTyping(false);
      
      // CLIENT-SIDE FALLBACK: If AI didn't extract interests but we detected them, add them
      let updatedState = data.conversationState;
      if (detectedInterests.length > 0 && (!updatedState.interests || updatedState.interests.length === 0)) {
        console.log('Client-side fallback: detected interests', detectedInterests);
        updatedState = {
          ...updatedState,
          interests: detectedInterests,
          budget: updatedState.budget || "₹500-₹2000",
          occasion: updatedState.occasion || "Just Because",
          relationship: updatedState.relationship || "friend",
        };
      }
      
      // Update conversation state
      setConversationState(updatedState);
      
      // CLIENT-SIDE DECISION: If we have interests now, we're ready to recommend
      const shouldRecommend = data.readyToRecommend || (updatedState.interests && updatedState.interests.length > 0);
      setReadyToRecommend(shouldRecommend);
      
      // Add AI response (or override if we're forcing recommendations)
      if (shouldRecommend && !data.readyToRecommend && updatedState.interests.length > 0) {
        // Override response to be more enthusiastic since we're forcing it
        addMessage("assistant", `Perfect! I can see they love ${updatedState.interests.join(' and ')}! Let me find amazing gifts for them! 🎁`);
      } else {
        addMessage("assistant", data.response);
      }

      // If ready to recommend, automatically generate recommendations
      if (shouldRecommend) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await generateRecommendations();
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      addMessage("assistant", "I apologize, but I'm having trouble processing that. Could you please try again?");
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateRecommendations = async () => {
    // Check for essential info (interests only - everything else can have defaults)
    if (conversationState.interests.length === 0) {
      toast({
        title: "Add Interests",
        description: "Please tell me at least one thing they're interested in.",
        variant: "destructive",
      });
      setIsTyping(false);
      addMessage("assistant", "What are they interested in? This will help me find the perfect gift!");
      return;
    }

    setIsGenerating(true);
    setIsTyping(false);
    addMessage("assistant", "Perfect! Let me search Amazon for the best gifts based on what they love... 🎁✨");

    try {
      // Use smart defaults for missing values
      const response = await apiRequest("POST", "/api/recommendations", {
        relationship: conversationState.relationship || "friend",
        interests: conversationState.interests,
        personality: conversationState.personality,
        budget: conversationState.budget || "₹500-₹2000",
        occasion: conversationState.occasion || "Just Because",
        recipientName: conversationState.recipientName,
        recipientAge: conversationState.recipientAge,
      });

      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", data.sessionId] });
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      addMessage("assistant", `Wonderful! I found ${data.recommendations.length} amazing gift ideas on Amazon that I think they'll absolutely love! Let me show you...`);

      setTimeout(() => {
        setLocation(`/results/${data.sessionId}`);
      }, 1000);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      addMessage("assistant", "I'm sorry, I encountered an error while searching for gifts. Could you try again?");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="hover-elevate active-elevate-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-switch-form"
            className="hover-elevate active-elevate-2"
          >
            Switch to Form Mode
          </Button>
        </div>

        <Card className="flex flex-col h-[calc(100vh-250px)] overflow-hidden border-2 shadow-lg">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
                data-testid={`message-${message.role}-${index}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-md ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-semibold">GiftAI</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in" data-testid="typing-indicator">
                <div className="bg-muted rounded-2xl px-5 py-4 max-w-[80%] shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-semibold">GiftAI</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 flex gap-3 bg-muted/20">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message here..."
              disabled={isGenerating || isTyping}
              data-testid="input-message"
              className="text-base shadow-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating || isTyping}
              size="icon"
              data-testid="button-send"
              className="hover-elevate active-elevate-2 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
