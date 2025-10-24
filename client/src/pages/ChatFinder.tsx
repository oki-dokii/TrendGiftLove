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
import { setCurrentSessionId } from "@/lib/sessionUtils";

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
      if (readyToRecommend && conversationState.interests.length > 0) {
        await generateRecommendations(conversationState);
        return;
      }

      // SMART PATTERN-BASED INTEREST DETECTION (extracts EXACT words, not generic categories)
      let detectedInterests: string[] = [];
      
      // Pattern 1: "X lover/fan/enthusiast" - captures multi-word interests
      const pattern1 = /([\w\s]+?)\s+(?:lover|fan|enthusiast|buff)/gi;
      const matches1 = Array.from(userInput.matchAll(pattern1));
      for (const match of matches1) {
        if (match[1] && match[1].trim().length > 2) {
          const interest = match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (!detectedInterests.includes(interest)) {
            detectedInterests.push(interest);
          }
        }
      }
      
      // Pattern 2: "loves/enjoys/likes X" - captures multi-word interests
      const pattern2 = /(?:loves|enjoys|likes|into)\s+([\w\s]+?)(?:\s+and|\s+or|\.|,|$)/gi;
      const matches2 = Array.from(userInput.matchAll(pattern2));
      for (const match of matches2) {
        if (match[1] && match[1].trim().length > 2) {
          const interest = match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (!detectedInterests.includes(interest)) {
            detectedInterests.push(interest);
          }
        }
      }
      
      // Pattern 3: "plays X" - for instruments/sports
      const pattern3 = /plays\s+([\w\s]+?)(?:\s+and|\s+or|\.|,|$)/gi;
      const matches3 = Array.from(userInput.matchAll(pattern3));
      for (const match of matches3) {
        if (match[1] && match[1].trim().length > 2) {
          const interest = match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (!detectedInterests.includes(interest)) {
            detectedInterests.push(interest);
          }
        }
      }
      
      // If we detected interests from patterns, proceed immediately
      if (detectedInterests.length > 0 && conversationState.interests.length === 0) {
        console.log('Pattern-based detected interests (EXACT):', detectedInterests);
        
        const updatedState = {
          ...conversationState,
          interests: detectedInterests,
          budget: conversationState.budget || "₹500-₹2000",
          occasion: conversationState.occasion || "Just Because",
          relationship: conversationState.relationship || "friend",
        };
        
        setConversationState(updatedState);
        setReadyToRecommend(true);
        setIsTyping(false);
        
        addMessage("assistant", `Awesome! I can see they're interested in ${detectedInterests.join(' and ')}! Let me find the perfect gifts! 🎁`);
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        await generateRecommendations(updatedState);
        return;
      }

      // Otherwise, use AI for conversation
      const response = await apiRequest("POST", "/api/chat", {
        message: userInput,
        conversationState,
      });

      const data = await response.json();
      
      // Simulate typing delay for more natural feel
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsTyping(false);
      
      // Update conversation state from AI
      const updatedState = {
        ...conversationState,
        ...data.conversationState,
        interests: data.conversationState.interests?.length > 0 
          ? data.conversationState.interests 
          : conversationState.interests,
      };
      
      console.log('Updated conversation state:', updatedState);
      console.log('Ready to recommend:', data.readyToRecommend);
      
      setConversationState(updatedState);
      setReadyToRecommend(data.readyToRecommend);
      
      // Add AI response
      addMessage("assistant", data.response);

      // If ready to recommend, automatically generate recommendations with updated state
      if (data.readyToRecommend && updatedState.interests.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsTyping(true);
        await generateRecommendations(updatedState);
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

  const generateRecommendations = async (stateOverride?: ConversationState) => {
    const currentState = stateOverride || conversationState;
    console.log('generateRecommendations called with state:', currentState);
    
    // Check for essential info (interests only - everything else can have defaults)
    if (!currentState.interests || currentState.interests.length === 0) {
      console.log('No interests found, showing error');
      toast({
        title: "Add Interests",
        description: "Please tell me at least one thing they're interested in.",
        variant: "destructive",
      });
      setIsTyping(false);
      setReadyToRecommend(false);
      addMessage("assistant", "What are they interested in? This will help me find the perfect gift!");
      return;
    }

    console.log('Generating recommendations with interests:', currentState.interests);
    setIsGenerating(true);
    setIsTyping(false);
    addMessage("assistant", "Perfect! Let me search Amazon for the best gifts based on what they love... 🎁✨");

    try {
      // Use smart defaults for missing values
      const response = await apiRequest("POST", "/api/recommendations", {
        relationship: currentState.relationship || "friend",
        interests: currentState.interests,
        personality: currentState.personality,
        budget: currentState.budget || "₹500-₹2000",
        occasion: currentState.occasion || "Just Because",
        recipientName: currentState.recipientName,
        recipientAge: currentState.recipientAge,
      });

      const data = await response.json();
      
      // Save the current sessionId
      setCurrentSessionId(data.sessionId);
      
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
