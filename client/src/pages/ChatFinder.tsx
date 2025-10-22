import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const QUESTIONS = [
  {
    id: "occasion",
    question: "What's the occasion?",
    quickReplies: ["Birthday", "Anniversary", "Wedding", "Graduation", "Just Because", "Festival"],
  },
  {
    id: "relationship",
    question: "What's your relationship with them?",
    quickReplies: ["Friend", "Partner", "Parent", "Sibling", "Colleague", "Child"],
  },
  {
    id: "interests",
    question: "What are their interests? (You can select multiple)",
    quickReplies: ["Technology", "Books", "Music", "Art", "Sports", "Cooking", "Travel", "Gaming", "Fashion", "Fitness"],
    multiple: true,
  },
  {
    id: "budget",
    question: "What's your budget?",
    quickReplies: ["Under ₹500", "₹500 - ₹2000", "₹2000 - ₹5000", "₹5000 - ₹10000", "₹10000+"],
  },
  {
    id: "personality",
    question: "How would you describe their personality?",
    quickReplies: ["Adventurous", "Minimalist", "Traditional", "Trendy", "Practical", "Romantic"],
  },
];

export default function ChatFinder() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm GiftAI. Let me help you find the perfect gift! What's the occasion?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [conversationState, setConversationState] = useState<ConversationState>({
    interests: [],
  });
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const simulateTyping = async (message: string) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsTyping(false);
    addMessage("assistant", message);
  };

  const handleQuickReply = async (value: string) => {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    
    addMessage("user", value);

    if (currentQuestion.id === "interests" && currentQuestion.multiple) {
      const newInterests = conversationState.interests.includes(value)
        ? conversationState.interests.filter((i) => i !== value)
        : [...conversationState.interests, value];
      
      setConversationState({ ...conversationState, interests: newInterests });
      
      if (newInterests.length > 0) {
        await simulateTyping(
          `Great! I've noted that they're into ${newInterests.join(", ")}. Feel free to add more or click "Continue" when you're done.`
        );
      }
    } else {
      setConversationState({
        ...conversationState,
        [currentQuestion.id]: value,
      });

      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        await simulateTyping(QUESTIONS[currentQuestionIndex + 1].question);
      } else {
        await generateRecommendations();
      }
    }
  };

  const handleContinue = async () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      await simulateTyping(QUESTIONS[currentQuestionIndex + 1].question);
    } else {
      await generateRecommendations();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userInput = inputValue.trim();
    addMessage("user", userInput);
    setInputValue("");

    await simulateTyping(
      "Thanks for sharing that! Let me use the quick options to make this faster."
    );
  };

  const generateRecommendations = async () => {
    if (!conversationState.relationship || !conversationState.budget || !conversationState.occasion) {
      toast({
        title: "Missing Information",
        description: "Please answer all the questions to generate recommendations.",
        variant: "destructive",
      });
      return;
    }

    if (conversationState.interests.length === 0) {
      toast({
        title: "Add Interests",
        description: "Please select at least one interest.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    await simulateTyping("Perfect! Let me find the best gifts for you...");

    try {
      const response = await apiRequest("POST", "/api/recommendations", {
        relationship: conversationState.relationship,
        interests: conversationState.interests,
        personality: conversationState.personality,
        budget: conversationState.budget,
        occasion: conversationState.occasion,
        recipientName: conversationState.recipientName,
        recipientAge: conversationState.recipientAge,
      });

      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", data.sessionId] });
      
      await simulateTyping(
        `I found ${data.recommendations.length} amazing gift ideas for you! Let me show you...`
      );

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
    }
  };

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const showQuickReplies = currentQuestion && !isGenerating;

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
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-switch-form"
          >
            Switch to Form Mode
          </Button>
        </div>

        <Card className="flex flex-col h-[calc(100vh-250px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`message-${message.role}-${index}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">GiftAI</span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start" data-testid="typing-indicator">
                <div className="bg-muted rounded-lg px-4 py-3 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">GiftAI</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showQuickReplies && (
            <div className="border-t p-4 bg-muted/30">
              <div className="flex flex-wrap gap-2 mb-3">
                {currentQuestion.quickReplies.map((reply) => {
                  const isSelected =
                    currentQuestion.id === "interests" &&
                    conversationState.interests.includes(reply);
                  
                  return (
                    <Badge
                      key={reply}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleQuickReply(reply)}
                      data-testid={`quick-reply-${reply.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {reply}
                    </Badge>
                  );
                })}
              </div>

              {currentQuestion.multiple && conversationState.interests.length > 0 && (
                <Button
                  onClick={handleContinue}
                  className="w-full"
                  data-testid="button-continue"
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          <div className="border-t p-4 flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={isGenerating}
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating}
              size="icon"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
