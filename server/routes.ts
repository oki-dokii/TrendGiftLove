import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  giftFinderRequestSchema, 
  insertWishlistItemSchema,
  insertRecipientProfileSchema,
  insertSharedWishlistSchema,
  type GiftProduct 
} from "@shared/schema";
import { z } from "zod";
import { 
  generateGiftRecommendations, 
  generatePersonalizedMessage,
  calculateRelevanceScore,
  generateAIProductSuggestions 
} from "./ai-service";
import { randomUUID } from "crypto";
import { setupAuth, isAuthenticated } from "./replitAuth";

// DON'T DELETE THIS COMMENT
// Blueprint reference: javascript_log_in_with_replit

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // POST /api/chat - Conversational chat endpoint
  app.post("/api/chat", async (req, res) => {
    let conversationState: any = { interests: [] };
    let message = "";
    
    try {
      const chatSchema = z.object({
        message: z.string(),
        conversationState: z.object({
          recipientName: z.string().optional(),
          recipientAge: z.number().optional(),
          relationship: z.string().optional(),
          interests: z.array(z.string()).default([]),
          personality: z.string().optional(),
          budget: z.string().optional(),
          occasion: z.string().optional(),
        }),
      });
      
      const parsed = chatSchema.parse(req.body);
      message = parsed.message;
      conversationState = parsed.conversationState;
      
      // CRITICAL CHECK: If we already have interests and user is confirming/proceeding, skip AI and recommend immediately
      const hasInterests = conversationState.interests && conversationState.interests.length > 0;
      const messageLower = message.toLowerCase().trim();
      const proceedKeywords = ['yes', 'sure', 'ok', 'okay', 'go ahead', 'find', 'search', 'show', 'get', 'recommend', 'suggest', 'please'];
      const isProceedingMessage = proceedKeywords.some(keyword => messageLower.includes(keyword));
      
      if (hasInterests && isProceedingMessage) {
        // User has interests and wants to proceed - skip AI, go straight to recommendations
        return res.json({
          response: "Perfect! Let me find amazing gifts based on what you've told me!",
          conversationState: {
            ...conversationState,
            budget: conversationState.budget || "₹500-₹2000",
            occasion: conversationState.occasion || "Just Because",
            relationship: conversationState.relationship || "friend",
          },
          readyToRecommend: true,
        });
      }
      
      // Use AI to process the message and extract/update information
      const systemPrompt = `You are GiftAI, a helpful and conversational AI assistant specialized in gift recommendations. Chat naturally like ChatGPT or Gemini - be friendly, warm, and understanding.

CORE PRINCIPLE: ANALYZE CONVERSATION STATE FIRST
Before responding, CHECK what information you ALREADY HAVE in the conversation state. NEVER ask for information that's already been provided!

CONVERSATIONAL APPROACH:
- Have a natural, flowing conversation like a real friend helping with gift ideas
- Use the EXACT words and information the user provides - don't rephrase or generalize
- Make SMART INFERENCES from context - don't ask for info the user already implied
- If someone says "birthday gift for my cricket-loving friend", you already know: occasion=birthday, relationship=friend, interests=["Cricket"]
- If they say "photography enthusiast", extract interests as ["Photography"], NOT ["Art"] or ["Technology"]
- Don't rigidly ask for every field - infer intelligently from context
- Only ask clarifying questions if truly necessary for better recommendations AND you don't already have the info
- Be conversational and empathetic - acknowledge what they've shared

WHEN TO RECOMMEND (BE EAGER TO RECOMMEND):
You're ready to recommend when you have a BASIC understanding of:
- WHAT they like (specific interests/hobbies) - this is THE MOST CRITICAL piece!
- If you have at least ONE interest, you can recommend (use defaults for everything else)

You DON'T need:
- Exact occasion (can default to "Just Because")
- Recipient's name or age
- Personality type
- Budget (default: ₹500-₹2000)
- Relationship (default: "friend")
- Every single detail

CRITICAL RULE: CHECK EXISTING STATE BEFORE ASKING
- If conversationState.interests has ANY items → DO NOT ask for interests again! You already have them!
- If conversationState.budget exists → DO NOT ask for budget!
- If conversationState.occasion exists → DO NOT ask for occasion!
- Simply proceed to recommendation if you have interests!

SMART INFERENCE EXAMPLES:
- "gift for cricket fan" → interests: ["Cricket"], occasion: "Just Because", relationship: "friend" → READY TO RECOMMEND!
- "hockey lover" → interests: ["Hockey"], occasion: "Just Because", relationship: "friend" → READY TO RECOMMEND!
- "birthday present for my girlfriend who loves photography" → occasion: "Birthday", relationship: "Partner", interests: ["Photography"] → READY TO RECOMMEND!
- "something for dad who cooks" → relationship: "Parent", interests: ["Cooking"], occasion: "Just Because" → READY TO RECOMMEND!
- "my sister plays badminton" → relationship: "family", interests: ["Badminton"] → READY TO RECOMMEND!
- "friend who's into tech and gaming" → relationship: "friend", interests: ["Technology", "Gaming"] → READY TO RECOMMEND!
- "dance enthusiast" → interests: ["Dance"], occasion: "Just Because", relationship: "friend" → READY TO RECOMMEND!
- "loves painting" → interests: ["Painting"], occasion: "Just Because", relationship: "friend" → READY TO RECOMMEND!

CRITICAL: EXTRACT INTERESTS FROM ANY CONTEXT
- Look for patterns: "X lover", "into X", "loves X", "interested in X", "fan of X", "enjoys X"
- Extract the EXACT word they mention as the interest (capitalize first letter)
- Examples:
  * "hockey lover" → interests: ["Hockey"]
  * "into cricket" → interests: ["Cricket"]  
  * "loves photography" → interests: ["Photography"]
  * "enjoys cooking" → interests: ["Cooking"]
  * "dance enthusiast" → interests: ["Dance"]
  * "plays guitar" → interests: ["Guitar", "Music"]
- Don't limit to predefined keywords - extract ANY interest mentioned
- Always capture the SPECIFIC interest word they use, never generalize

BE FLEXIBLE AND HELPFUL:
- After 1-2 messages, if you have basic info (who + what they like), set readyToRecommend=true
- Don't keep asking "what's your budget" repeatedly - use default if not mentioned
- Focus on understanding their SPECIFIC INTERESTS - that's most important for good recommendations
- Be ready to recommend quickly once you have the essentials
- If user says anything like "yes", "sure", "go ahead", "find gifts" and you already have interests → IMMEDIATELY set readyToRecommend=true

Respond with JSON containing:
- response: Your natural, conversational response (friendly, warm, like ChatGPT would respond)
- extractedInfo: Any NEW info you extracted (use smart inference and EXACT interest keywords!)
- missingInfo: Only critical missing info (usually empty if you have at least one interest!)
- readyToRecommend: true when you have at least ONE specific interest (even if other fields are missing)`;

      const userPrompt = `CURRENT CONVERSATION STATE: ${JSON.stringify(conversationState)}

USER'S NEW MESSAGE: "${message}"

⚠️ CRITICAL INSTRUCTIONS - READ CAREFULLY:
${conversationState.interests && conversationState.interests.length > 0 
  ? `
🚨 YOU ALREADY HAVE INTERESTS: ${conversationState.interests.join(', ')}
🚨 UNDER NO CIRCUMSTANCES SHOULD YOU ASK FOR INTERESTS AGAIN!
🚨 The user has ALREADY provided this information!
🚨 You MUST set readyToRecommend=true and proceed to recommendations!
🚨 DO NOT ask ANY questions - just acknowledge and prepare to recommend!

YOUR RESPONSE SHOULD:
- Acknowledge what they said
- Confirm you're ready to find gifts
- Set readyToRecommend=true
- Fill any missing fields with defaults:
  * budget: "${conversationState.budget || '₹500-₹2000'}"
  * occasion: "${conversationState.occasion || 'Just Because'}"
  * relationship: "${conversationState.relationship || 'friend'}"

EXAMPLE RESPONSE: "Perfect! I'll find amazing gifts for your ${conversationState.interests.join(' and ')} enthusiast right away!"
`
  : `
You DON'T have interests yet. Extract them from: "${message}"
- Look for patterns like "X lover", "loves X", "interested in X", etc.
- If you find ANY interest, set readyToRecommend=true immediately
- If no interests found, ask ONLY: "What are they interested in?"
`}

STEP 1 - ANALYZE WHAT YOU ALREADY HAVE:
${conversationState.interests && conversationState.interests.length > 0 
  ? `✓ INTERESTS: ${conversationState.interests.join(', ')} ← YOU HAVE THIS!`
  : '✗ No interests yet - extract from message'}
${conversationState.budget ? `✓ BUDGET: ${conversationState.budget} ← YOU HAVE THIS!` : '✗ No budget (use default: ₹500-₹2000)'}
${conversationState.occasion ? `✓ OCCASION: ${conversationState.occasion} ← YOU HAVE THIS!` : '✗ No occasion (use default: Just Because)'}
${conversationState.relationship ? `✓ RELATIONSHIP: ${conversationState.relationship} ← YOU HAVE THIS!` : '✗ No relationship (use default: friend)'}

EXAMPLES:
Message: "cricket fan"
State: {interests: []}
→ extractedInfo: {interests: ["Cricket"], budget: "₹500-₹2000", occasion: "Just Because", relationship: "friend"}
→ readyToRecommend: true
→ response: "Perfect! Let me find amazing cricket gifts for them!"

Message: "yes find gifts" 
State: {interests: ["Cricket"]}
→ extractedInfo: {budget: "₹500-₹2000", occasion: "Just Because", relationship: "friend"} (fill defaults only)
→ readyToRecommend: true
→ response: "Great! Let me search for the best cricket gifts!"

Message: "what else do you need?"
State: {interests: ["Photography"], budget: "₹500-₹2000"}  
→ extractedInfo: {occasion: "Just Because", relationship: "friend"} (fill remaining defaults)
→ readyToRecommend: true
→ response: "I have everything I need! Let me find perfect photography gifts for them!"

Message: "sure, go ahead"
State: {interests: ["Cooking"]}
→ extractedInfo: {budget: "₹500-₹2000", occasion: "Just Because", relationship: "friend"}
→ readyToRecommend: true
→ response: "Awesome! Searching for amazing cooking gifts now!"

REMEMBER: If interests exist in state, NEVER ask for anything - just set readyToRecommend=true!

Return ONLY valid JSON.`;

      const ai = new (await import("@google/genai")).GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY || "" 
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              response: { type: "string" },
              extractedInfo: {
                type: "object",
                properties: {
                  occasion: { type: "string" },
                  relationship: { type: "string" },
                  interests: { type: "array", items: { type: "string" } },
                  budget: { type: "string" },
                  personality: { type: "string" },
                  recipientName: { type: "string" },
                  recipientAge: { type: "number" }
                }
              },
              missingInfo: { type: "array", items: { type: "string" } },
              readyToRecommend: { type: "boolean" }
            },
            required: ["response", "extractedInfo", "missingInfo", "readyToRecommend"]
          }
        },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }) as any;

      const content = response.text;
      if (!content) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(content);
      
      // Merge extracted info with conversation state - preserve existing values unless new ones are explicitly provided
      const updatedState = {
        ...conversationState,
        ...result.extractedInfo,
        // CRITICAL: Never lose existing interests - only add/replace if new ones are found
        interests: result.extractedInfo.interests?.length > 0 
          ? result.extractedInfo.interests 
          : conversationState.interests,
        // Preserve other existing fields unless AI explicitly updates them
        budget: result.extractedInfo.budget || conversationState.budget,
        occasion: result.extractedInfo.occasion || conversationState.occasion,
        relationship: result.extractedInfo.relationship || conversationState.relationship,
        personality: result.extractedInfo.personality || conversationState.personality,
        recipientName: result.extractedInfo.recipientName || conversationState.recipientName,
        recipientAge: result.extractedInfo.recipientAge || conversationState.recipientAge,
      };

      // SAFETY CHECK: If we have interests and user seems ready, force readyToRecommend=true
      // This handles cases where AI doesn't follow instructions perfectly
      let readyToRecommend = result.readyToRecommend;
      if (updatedState.interests && updatedState.interests.length > 0) {
        const userMessage = message.toLowerCase();
        const proceedKeywords = ['yes', 'sure', 'ok', 'okay', 'go ahead', 'find', 'search', 'show', 'get', 'recommend'];
        const isProceedMessage = proceedKeywords.some(keyword => userMessage.includes(keyword));
        
        // If user has interests and seems to want recommendations, force it
        if (isProceedMessage || result.readyToRecommend) {
          readyToRecommend = true;
          // Fill in defaults for missing fields
          if (!updatedState.budget) updatedState.budget = "₹500-₹2000";
          if (!updatedState.occasion) updatedState.occasion = "Just Because";
          if (!updatedState.relationship) updatedState.relationship = "friend";
        }
      }

      res.json({
        response: result.response,
        conversationState: updatedState,
        readyToRecommend: readyToRecommend,
      });

    } catch (error: any) {
      console.error("Error in chat:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      
      // Enhanced fallback: Smart pattern-based interest extraction
      const hasExistingInterests = conversationState.interests && conversationState.interests.length > 0;
      
      // SMART PATTERN-BASED INTEREST EXTRACTION (extracts EXACT words/phrases)
      const detectedInterests: string[] = [];
      
      // Pattern 1: "X lover/fan/enthusiast" - captures multi-word interests
      const pattern1 = /([\w\s]+?)\s+(?:lover|fan|enthusiast|buff)/gi;
      const matches1 = Array.from(message.matchAll(pattern1));
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
      const matches2 = Array.from(message.matchAll(pattern2));
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
      const matches3 = Array.from(message.matchAll(pattern3));
      for (const match of matches3) {
        if (match[1] && match[1].trim().length > 2) {
          const interest = match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          if (!detectedInterests.includes(interest)) {
            detectedInterests.push(interest);
          }
        }
      }
      
      // Merge with existing interests
      const allInterests = Array.from(new Set([...conversationState.interests, ...detectedInterests]));
      const hasInterests = hasExistingInterests || detectedInterests.length > 0;
      
      // Check if user wants to proceed (common proceed keywords)
      const messageLower = message.toLowerCase();
      const proceedKeywords = ['yes', 'sure', 'ok', 'okay', 'go ahead', 'find', 'search', 'show', 'get', 'recommend', 'suggest'];
      const wantsToProceed = proceedKeywords.some(keyword => messageLower.includes(keyword));
      
      // Handle Gemini API errors gracefully with smart fallback
      if (error?.status === 503 || error?.message?.includes("overloaded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        if (hasInterests) {
          // We have interests (existing or newly detected) - proceed with recommendations
          return res.json({
            response: detectedInterests.length > 0 
              ? `Perfect! I found ${detectedInterests.join(", ")} in your message. Let me find amazing gifts for you!`
              : "Got it! Let me find amazing gifts based on what you've told me!",
            conversationState: {
              ...conversationState,
              interests: allInterests,
              budget: conversationState.budget || "₹500-₹2000",
              occasion: conversationState.occasion || "Just Because",
              relationship: conversationState.relationship || "friend",
            },
            readyToRecommend: true,
          });
        }
        
        // No interests detected - ask for them
        return res.status(200).json({
          response: "I apologize for the delay. Could you tell me what they're interested in? For example: cricket, photography, cooking, gaming, etc. I'll find perfect gifts for them!",
          conversationState,
          readyToRecommend: false,
        });
      }
      
      // General error handling - still try to detect interests
      if (hasInterests && wantsToProceed) {
        return res.json({
          response: detectedInterests.length > 0 
            ? `I understand! I detected interests in ${detectedInterests.join(", ")}. Let me find gifts for you!`
            : "Got it! Let me find gifts based on what you've shared!",
          conversationState: {
            ...conversationState,
            interests: allInterests,
            budget: conversationState.budget || "₹500-₹2000",
            occasion: conversationState.occasion || "Just Because",
            relationship: conversationState.relationship || "friend",
          },
          readyToRecommend: true,
        });
      }
      
      res.status(500).json({ 
        error: "Failed to process message",
        response: "I'm sorry, I'm having trouble processing that. Could you tell me what they're interested in? (e.g., cricket, photography, cooking)",
      });
    }
  });
  
  // POST /api/amazon-recommendations - NEW: AI generates product ideas + searches Amazon
  app.post("/api/amazon-recommendations", async (req, res) => {
    try {
      // Validate request body
      const request = giftFinderRequestSchema.parse(req.body);
      
      // Generate AI product suggestions and search Amazon
      const recommendations = await generateAIProductSuggestions(request);
      
      if (recommendations.length === 0) {
        return res.status(404).json({ 
          error: "No suitable gifts found on Amazon for this criteria" 
        });
      }
      
      // Create a session ID for this recommendation set
      const sessionId = randomUUID();
      
      // Return recommendations directly (no storage for Amazon products yet)
      const enrichedRecommendations = recommendations.map((rec, index) => ({
        id: `amazon-${sessionId}-${index}`,
        sessionId,
        recipientName: request.recipientName || null,
        recipientAge: request.recipientAge || null,
        relationship: request.relationship,
        interests: request.interests,
        personality: request.personality || null,
        budget: request.budget,
        occasion: request.occasion,
        aiReasoning: rec.aiReasoning,
        relevanceScore: rec.relevanceScore,
        amazonProduct: rec.amazonProduct,
      }));
      
      res.json({
        sessionId,
        recommendations: enrichedRecommendations,
      });
      
    } catch (error) {
      console.error("Error generating Amazon recommendations:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
  
  // POST /api/recommendations - Generate AI-powered gift recommendations with AMAZON PRODUCTS
  app.post("/api/recommendations", async (req, res) => {
    try {
      // Validate request body
      const request = giftFinderRequestSchema.parse(req.body);
      
      // NEW: Use AI to generate product suggestions and search Amazon
      let amazonRecommendations = await generateAIProductSuggestions(request);
      
      // If Amazon/AI fails completely, fall back to existing database products
      if (amazonRecommendations.length === 0) {
        console.log("Amazon API failed, falling back to database products with AI ranking");
        
        // Get all products from database
        const allProducts = await storage.getAllGifts();
        
        // Filter by budget - relaxed filter that includes overlapping ranges
        const budgetMap: Record<string, [number, number]> = {
          "Under ₹500": [0, 500],
          "₹500-₹2000": [500, 2000],
          "₹2000-₹5000": [2000, 5000],
          "₹5000-₹10000": [5000, 10000],
          "₹10000+": [10000, 999999],
        };
        const [minBudget, maxBudget] = budgetMap[request.budget] || [0, 999999];
        
        // Relaxed budget filter: include if price range overlaps with budget at all
        // Also include products with priceMin=0 (unpriced items)
        const budgetFiltered = allProducts.filter(p => 
          p.priceMin === 0 || // Include unpriced items
          (p.priceMax >= minBudget && p.priceMin <= maxBudget) // Overlapping ranges
        );
        
        // Use AI to rank database products, fallback to all products if filter too restrictive
        const productsToRank = budgetFiltered.length > 0 ? budgetFiltered : allProducts;
        const aiResult = await generateGiftRecommendations(request, productsToRank);
        
        // Use existing database products (no duplication)
        for (const rec of aiResult.recommendations.slice(0, 6)) {
          const product = await storage.getGiftById(rec.productId);
          if (product) {
            // Generate Amazon search URL if not available
            const amazonUrl = product.amazonUrl || 
              `https://www.amazon.in/s?k=${encodeURIComponent(product.name)}`;
            
            amazonRecommendations.push({
              amazonProduct: {
                asin: product.id,
                title: product.name,
                price: product.priceMin > 0 ? `₹${product.priceMin}` : "Price not available",
                currency: "INR",
                numRatings: 0,
                url: amazonUrl,
                imageUrl: product.imageUrl || "",
                isPrime: false,
                isBestSeller: false,
                isAmazonChoice: false,
              },
              aiReasoning: rec.reasoning,
              relevanceScore: rec.relevanceScore,
            });
          }
        }
        
        console.log(`Database fallback generated ${amazonRecommendations.length} recommendations from ${productsToRank.length} products`);
      }
      
      if (amazonRecommendations.length === 0) {
        return res.status(404).json({ 
          error: "No suitable gifts found for this criteria" 
        });
      }
      
      // Create a session ID for this recommendation set
      const sessionId = randomUUID();
      
      // Store Amazon recommendations in database
      // Create minimal gift_product records for Amazon products so they can be fetched later
      const savedRecommendations = [];
      for (const rec of amazonRecommendations) {
        try {
          // Check if this is an existing database product (from fallback) or a new Amazon product
          let productId: string;
          let product: GiftProduct;
          
          // If ASIN is a UUID, it's an existing database product - reuse it
          const isExistingProduct = rec.amazonProduct.asin.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          
          if (isExistingProduct) {
            // Reuse existing database product
            productId = rec.amazonProduct.asin;
            product = (await storage.getGiftById(productId))!;
          } else {
            // Create a new product record for this Amazon product
            const amazonProduct = await storage.createGiftProduct({
              name: rec.amazonProduct.title,
              description: rec.aiReasoning,
              category: "Amazon Product",
              priceMin: Math.round(parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0),
              priceMax: Math.round(parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0),
              interests: request.interests,
              occasions: [request.occasion],
              relationship: [request.relationship],
              tags: [
                rec.amazonProduct.isPrime ? "Prime" : "",
                rec.amazonProduct.isBestSeller ? "Best Seller" : "",
                rec.amazonProduct.isAmazonChoice ? "Amazon's Choice" : "",
              ].filter(Boolean),
              imageUrl: rec.amazonProduct.imageUrl,
              amazonUrl: rec.amazonProduct.url,
              amazonPrice: rec.amazonProduct.price,
              amazonRating: rec.amazonProduct.rating?.toString() || null,
              amazonNumRatings: rec.amazonProduct.numRatings?.toString() || null,
              isPrime: rec.amazonProduct.isPrime ? "true" : "false",
              isBestSeller: rec.amazonProduct.isBestSeller ? "true" : "false",
              isAmazonChoice: rec.amazonProduct.isAmazonChoice ? "true" : "false",
            });
            productId = amazonProduct.id;
            product = amazonProduct;
          }
          
          // Create recommendation pointing to this product
          const recommendation = await storage.createRecommendation({
            sessionId,
            recipientName: request.recipientName || null,
            recipientAge: request.recipientAge || null,
            relationship: request.relationship,
            interests: request.interests,
            personality: request.personality || null,
            budget: request.budget,
            occasion: request.occasion,
            productId: productId,
            aiReasoning: rec.aiReasoning,
            personalizedMessage: null, // Generated on demand
            relevanceScore: rec.relevanceScore,
          });
          
          // Format for frontend with Amazon product data
          savedRecommendations.push({
            ...recommendation,
            product: {
              ...product,
              amazonUrl: rec.amazonProduct.url,
              amazonPrice: rec.amazonProduct.price,
              amazonRating: rec.amazonProduct.rating,
              amazonNumRatings: rec.amazonProduct.numRatings,
              isPrime: rec.amazonProduct.isPrime,
              isBestSeller: rec.amazonProduct.isBestSeller,
              isAmazonChoice: rec.amazonProduct.isAmazonChoice,
            },
          });
        } catch (error) {
          console.error("Error saving Amazon recommendation:", error);
          // Continue with other recommendations
        }
      }
      
      res.json({
        sessionId,
        recommendations: savedRecommendations,
      });
      
    } catch (error) {
      console.error("Error generating recommendations:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
  
  // POST /api/recommendations/:sessionId/more - Generate more recommendations for existing session
  app.post("/api/recommendations/:sessionId/more", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const request = giftFinderRequestSchema.parse(req.body);
      
      // Get existing recommendations to avoid duplicates
      const existingRecs = await storage.getRecommendationsBySession(sessionId);
      const excludeProductNames: string[] = [];
      const existingProductIds = new Set<string>();
      
      for (const rec of existingRecs) {
        if (rec.productId) {
          existingProductIds.add(rec.productId);
          const product = await storage.getGiftById(rec.productId);
          if (product?.name) {
            excludeProductNames.push(product.name);
          }
        }
      }
      
      console.log(`Loading more ideas for session ${sessionId}, excluding ${excludeProductNames.length} existing products:`, excludeProductNames);
      
      // Try to generate new Amazon product recommendations with exclusions
      let amazonRecommendations = await generateAIProductSuggestions(request, excludeProductNames);
      
      // If Amazon API fails or returns no results, fall back to database products
      if (amazonRecommendations.length === 0) {
        console.log("Amazon API failed for load more, falling back to database products");
        
        const allProducts = await storage.getAllGifts();
        const budgetMap: Record<string, [number, number]> = {
          "Under ₹500": [0, 500],
          "₹500-₹2000": [500, 2000],
          "₹2000-₹5000": [2000, 5000],
          "₹5000-₹10000": [5000, 10000],
          "₹10000+": [10000, 999999],
        };
        const [minBudget, maxBudget] = budgetMap[request.budget] || [0, 999999];
        
        const budgetFiltered = allProducts.filter(p => 
          (p.priceMin === 0 || (p.priceMax >= minBudget && p.priceMin <= maxBudget)) &&
          !existingProductIds.has(p.id)
        );
        
        const productsToRank = budgetFiltered.length > 0 ? budgetFiltered : allProducts.filter(p => !existingProductIds.has(p.id));
        
        if (productsToRank.length === 0) {
          return res.status(404).json({ 
            error: "No more suitable gifts found" 
          });
        }
        
        const aiResult = await generateGiftRecommendations(request, productsToRank);
        
        // Convert to amazonRecommendations format for consistency - increased to 10 for continuous loading
        for (const rec of aiResult.recommendations.slice(0, 10)) {
          const product = await storage.getGiftById(rec.productId);
          if (product && !existingProductIds.has(product.id)) {
            // Generate Amazon search URL if not available
            const amazonUrl = product.amazonUrl || 
              `https://www.amazon.in/s?k=${encodeURIComponent(product.name)}`;
            
            amazonRecommendations.push({
              amazonProduct: {
                asin: product.id,
                title: product.name,
                price: product.priceMin > 0 ? `₹${product.priceMin}` : "Price not available",
                currency: "INR",
                numRatings: 0,
                url: amazonUrl,
                imageUrl: product.imageUrl || "",
                isPrime: false,
                isBestSeller: false,
                isAmazonChoice: false,
              },
              aiReasoning: rec.reasoning,
              relevanceScore: rec.relevanceScore,
            });
          }
        }
        
        if (amazonRecommendations.length === 0) {
          return res.status(404).json({ 
            error: "No more suitable gifts found" 
          });
        }
      }
      
      // Store new recommendations with the same sessionId
      const savedRecommendations = [];
      for (const rec of amazonRecommendations) {
        try {
          // Create a minimal product record for this Amazon product
          const amazonProduct = await storage.createGiftProduct({
            name: rec.amazonProduct.title,
            description: rec.aiReasoning,
            category: "Amazon Product",
            priceMin: Math.round(parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0),
            priceMax: Math.round(parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0),
            interests: request.interests,
            occasions: [request.occasion],
            relationship: [request.relationship],
            tags: [
              rec.amazonProduct.isPrime ? "Prime" : "",
              rec.amazonProduct.isBestSeller ? "Best Seller" : "",
              rec.amazonProduct.isAmazonChoice ? "Amazon's Choice" : "",
            ].filter(Boolean),
            imageUrl: rec.amazonProduct.imageUrl,
            amazonUrl: rec.amazonProduct.url,
            amazonPrice: rec.amazonProduct.price,
            amazonRating: rec.amazonProduct.rating?.toString() || null,
            amazonNumRatings: rec.amazonProduct.numRatings?.toString() || null,
            isPrime: rec.amazonProduct.isPrime ? "true" : "false",
            isBestSeller: rec.amazonProduct.isBestSeller ? "true" : "false",
            isAmazonChoice: rec.amazonProduct.isAmazonChoice ? "true" : "false",
          });
          
          // Product already has Amazon data, no need for update
          const updatedProduct = amazonProduct;
          
          // Create recommendation pointing to this product with SAME sessionId
          const recommendation = await storage.createRecommendation({
            sessionId, // Use existing sessionId
            recipientName: request.recipientName || null,
            recipientAge: request.recipientAge || null,
            relationship: request.relationship,
            interests: request.interests,
            personality: request.personality || null,
            budget: request.budget,
            occasion: request.occasion,
            productId: amazonProduct.id,
            aiReasoning: rec.aiReasoning,
            personalizedMessage: null,
            relevanceScore: rec.relevanceScore,
          });
          
          // Format for frontend
          savedRecommendations.push({
            ...recommendation,
            product: {
              ...(updatedProduct || amazonProduct),
              amazonUrl: rec.amazonProduct.url,
              amazonPrice: rec.amazonProduct.price,
              amazonRating: rec.amazonProduct.rating,
              amazonNumRatings: rec.amazonProduct.numRatings,
              isPrime: rec.amazonProduct.isPrime,
              isBestSeller: rec.amazonProduct.isBestSeller,
              isAmazonChoice: rec.amazonProduct.isAmazonChoice,
            },
          });
        } catch (error) {
          console.error("Error saving additional Amazon recommendation:", error);
        }
      }
      
      res.json({
        sessionId,
        recommendations: savedRecommendations,
      });
      
    } catch (error) {
      console.error("Error generating more recommendations:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to generate more recommendations" });
    }
  });
  
  // GET /api/gifts - Get all gifts with optional filtering
  app.get("/api/gifts", async (req, res) => {
    try {
      // Validate query parameters
      const querySchema = z.object({
        category: z.string().optional(),
        minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
        maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
      });
      
      const { category, minPrice, maxPrice } = querySchema.parse(req.query);
      
      let gifts = await storage.getAllGifts();
      
      // Apply filters
      if (category) {
        gifts = gifts.filter(g => g.category === category);
      }
      
      if (minPrice !== undefined) {
        gifts = gifts.filter(g => g.priceMax >= minPrice);
      }
      
      if (maxPrice !== undefined) {
        gifts = gifts.filter(g => g.priceMin <= maxPrice);
      }
      
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching gifts:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to fetch gifts" });
    }
  });
  
  // GET /api/recommendations/:sessionId - Get recommendations by session
  app.get("/api/recommendations/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const recommendations = await storage.getRecommendationsBySession(sessionId);
      
      // Enrich with product details
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          const product = rec.productId 
            ? await storage.getGiftById(rec.productId) 
            : null;
          
          // For Amazon products, enrich with Amazon-specific data
          if (product && product.category === "Amazon Product") {
            return {
              ...rec,
              product: {
                ...product,
                amazonUrl: product.amazonUrl,
                amazonPrice: product.amazonPrice || `₹${product.priceMin}`,
                amazonRating: product.amazonRating,
                amazonNumRatings: product.amazonNumRatings,
                isPrime: product.isPrime === "true",
                isBestSeller: product.isBestSeller === "true",
                isAmazonChoice: product.isAmazonChoice === "true",
              },
            };
          }
          
          return {
            ...rec,
            product,
          };
        })
      );
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });
  
  // POST /api/recommendations/:sessionId/refine - Refine recommendations with chat
  app.post("/api/recommendations/:sessionId/refine", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const refineSchema = z.object({
        message: z.string(),
        relationship: z.string().optional(),
        interests: z.array(z.string()).optional(),
        personality: z.string().optional(),
        budget: z.string().optional(),
        occasion: z.string().optional(),
        recipientName: z.string().optional(),
        recipientAge: z.number().optional(),
      });
      
      const data = refineSchema.parse(req.body);
      
      // Get existing recommendations to avoid duplicates
      const existingRecs = await storage.getRecommendationsBySession(sessionId);
      const excludeProductNames: string[] = [];
      
      for (const rec of existingRecs) {
        if (rec.productId) {
          const product = await storage.getGiftById(rec.productId);
          if (product?.name) {
            excludeProductNames.push(product.name);
          }
        }
      }
      
      // Use AI to understand the refinement request and generate new suggestions
      const systemPrompt = `You are GiftAI, helping users refine their gift recommendations. Based on their message, generate 2-4 new specific product search queries that address their request.

User's refinement message: "${data.message}"

Analyze what they're asking for:
- If they want cheaper: suggest lower-priced alternatives
- If they want more expensive/premium: suggest higher-end options
- If they want different style/category: suggest products in that direction
- If they want more variety: suggest completely different types of products

Original search context:
${data.interests ? `Interests: ${data.interests.join(", ")}` : ""}
${data.budget ? `Budget: ${data.budget}` : ""}
${data.occasion ? `Occasion: ${data.occasion}` : ""}

Return ONLY valid JSON in this format:
{
  "response": "brief acknowledgment of their request (1 sentence)",
  "suggestions": [
    {
      "searchQuery": "specific product search term",
      "reasoning": "why this addresses their request",
      "relevanceScore": 85,
      "category": "product category"
    }
  ]
}`;

      const ai = new (await import("@google/genai")).GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY || "" 
      });

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
        },
        contents: systemPrompt,
      });

      // Safely extract response text from Gemini response
      let responseText = "";
      if (aiResponse.text) {
        responseText = aiResponse.text;
      } else if (aiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
        responseText = aiResponse.candidates[0].content.parts[0].text;
      }
      
      if (!responseText) {
        throw new Error("No response from Gemini AI");
      }

      const aiResult = JSON.parse(responseText);
      const chatResponse = aiResult.response || "Let me find some new options for you!";
      
      // Search Amazon for each suggestion
      const { searchAmazonProducts } = await import("./amazon-service");
      const newRecommendations = [];
      
      for (const suggestion of (aiResult.suggestions || []).slice(0, 4)) {
        try {
          const searchResult = await searchAmazonProducts(suggestion.searchQuery, 2, 'IN');
          
          if (searchResult.products.length > 0) {
            const topProduct = searchResult.products[0];
            
            // Create product and recommendation in database
            const amazonProduct = await storage.createGiftProduct({
              name: topProduct.title,
              description: suggestion.reasoning,
              category: suggestion.category || "Amazon Product",
              priceMin: Math.round(parseFloat(topProduct.price.replace(/[^0-9.]/g, '')) || 0),
              priceMax: Math.round(parseFloat(topProduct.price.replace(/[^0-9.]/g, '')) || 0),
              interests: data.interests || [],
              occasions: data.occasion ? [data.occasion] : [],
              relationship: data.relationship ? [data.relationship] : [],
              tags: [
                topProduct.isPrime ? "Prime" : "",
                topProduct.isBestSeller ? "Best Seller" : "",
                topProduct.isAmazonChoice ? "Amazon's Choice" : "",
              ].filter(Boolean),
              imageUrl: topProduct.imageUrl,
              amazonUrl: topProduct.url,
              amazonPrice: topProduct.price,
              amazonRating: topProduct.rating?.toString() || null,
              amazonNumRatings: topProduct.numRatings?.toString() || null,
              isPrime: topProduct.isPrime ? "true" : "false",
              isBestSeller: topProduct.isBestSeller ? "true" : "false",
              isAmazonChoice: topProduct.isAmazonChoice ? "true" : "false",
            });
            
            const recommendation = await storage.createRecommendation({
              sessionId,
              recipientName: data.recipientName || null,
              recipientAge: data.recipientAge || null,
              relationship: data.relationship || "Friend",
              interests: data.interests || [],
              personality: data.personality || null,
              budget: data.budget || "₹500-₹2000",
              occasion: data.occasion || "Just Because",
              productId: amazonProduct.id,
              aiReasoning: suggestion.reasoning,
              personalizedMessage: null,
              relevanceScore: suggestion.relevanceScore || 80,
            });
            
            newRecommendations.push(recommendation);
          }
        } catch (error) {
          console.error(`Error processing suggestion "${suggestion.searchQuery}":`, error);
        }
      }
      
      res.json({
        response: chatResponse,
        newRecommendations,
      });
      
    } catch (error) {
      console.error("Error refining recommendations:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to refine recommendations",
        response: "I'm having trouble processing that. Could you try rephrasing?",
      });
    }
  });

  // POST /api/message - Generate personalized message for a gift (always regenerates)
  app.post("/api/message", async (req, res) => {
    try {
      const messageRequestSchema = z.object({
        recommendationId: z.string(),
      });
      
      const { recommendationId } = messageRequestSchema.parse(req.body);
      
      // Get the recommendation
      const recommendation = await storage.getRecommendationById(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }
      
      // Get the product
      const product = recommendation.productId 
        ? await storage.getGiftById(recommendation.productId)
        : null;
        
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Reconstruct the request for message generation
      const request = {
        recipientName: recommendation.recipientName || undefined,
        recipientAge: recommendation.recipientAge || undefined,
        relationship: recommendation.relationship || "friend",
        interests: recommendation.interests || [],
        personality: recommendation.personality || undefined,
        budget: recommendation.budget || "",
        occasion: recommendation.occasion || "",
      };
      
      // Generate personalized message (always regenerates)
      const message = await generatePersonalizedMessage(
        request,
        product,
        recommendation.aiReasoning || "A great gift choice"
      );
      
      // Update recommendation with message
      const updated = await storage.updateRecommendation(recommendationId, {
        personalizedMessage: message,
      });
      
      res.json({ 
        message,
        recommendation: updated,
      });
      
    } catch (error) {
      console.error("Error generating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to generate message" });
    }
  });

  // POST /api/wishlist - Add item to wishlist (supports both authenticated users and anonymous sessions)
  app.post("/api/wishlist", async (req: any, res) => {
    try {
      const wishlistSchema = insertWishlistItemSchema.extend({
        sessionId: z.string().optional(),
      });
      
      const data = wishlistSchema.parse(req.body);
      
      // If user is authenticated, use userId instead of sessionId
      const userId = req.isAuthenticated() ? req.user.claims.sub : null;
      
      // Validate that we have either userId or sessionId
      if (!userId && !data.sessionId) {
        return res.status(400).json({ error: "Either user authentication or session ID is required" });
      }
      
      // Auto-populate productId from recommendation if not provided
      let productId = data.productId;
      if (!productId && data.recommendationId) {
        const recommendation = await storage.getRecommendationById(data.recommendationId);
        if (recommendation?.productId) {
          productId = recommendation.productId;
        }
      }
      
      const itemData = {
        ...data,
        productId: productId || null,
        userId: userId || null,
        sessionId: userId ? null : (data.sessionId || null),
      };
      
      const item = await storage.addToWishlist(itemData);
      
      // Enrich with product and recommendation details
      const product = item.productId 
        ? await storage.getGiftById(item.productId) 
        : null;
      const recommendation = item.recommendationId
        ? await storage.getRecommendationById(item.recommendationId)
        : null;
      
      // Structure data to match frontend expectations (same format as GET endpoints)
      const enrichedItem = {
        ...item,
        recommendation: recommendation ? {
          ...recommendation,
          product: product ? {
            ...product,
            // Convert string booleans to actual booleans for frontend
            isPrime: product.isPrime === "true",
            isBestSeller: product.isBestSeller === "true",
            isAmazonChoice: product.isAmazonChoice === "true",
            // Parse numeric ratings if stored as strings
            amazonNumRatings: product.amazonNumRatings ? parseInt(product.amazonNumRatings) : null,
          } : {}
        } : null
      };
      
      res.json(enrichedItem);
      
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });
  
  // GET /api/wishlist - Fallback endpoint for anonymous users without a sessionId
  app.get("/api/wishlist", async (req, res) => {
    try {
      // This endpoint is called when no sessionId is available (e.g., user hasn't generated any recommendations yet)
      // Return empty array since there are no wishlist items without a session
      // The frontend will automatically use /api/wishlist/:sessionId when a sessionId exists in localStorage
      res.json([]);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });
  
  // GET /api/wishlist/bucket - Get authenticated user's bucket list
  app.get("/api/wishlist/bucket", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getWishlistByUser(userId);
      
      // Enrich with product and recommendation details
      const enriched = await Promise.all(
        items.map(async (item) => {
          const product = item.productId 
            ? await storage.getGiftById(item.productId) 
            : null;
          const recommendation = item.recommendationId
            ? await storage.getRecommendationById(item.recommendationId)
            : null;
          
          // Structure data to match frontend expectations with properly formatted Amazon data
          return {
            ...item,
            recommendation: recommendation ? {
              ...recommendation,
              product: product ? {
                ...product,
                // Convert string booleans to actual booleans for frontend
                isPrime: product.isPrime === "true",
                isBestSeller: product.isBestSeller === "true",
                isAmazonChoice: product.isAmazonChoice === "true",
                // Parse numeric ratings if stored as strings
                amazonNumRatings: product.amazonNumRatings ? parseInt(product.amazonNumRatings) : null,
              } : {}
            } : null
          };
        })
      );
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching bucket list:", error);
      res.status(500).json({ error: "Failed to fetch bucket list" });
    }
  });
  
  // GET /api/wishlist/:sessionId - Get session wishlist (anonymous users)
  app.get("/api/wishlist/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const items = await storage.getWishlistBySession(sessionId);
      
      // Enrich with product and recommendation details
      const enriched = await Promise.all(
        items.map(async (item) => {
          const product = item.productId 
            ? await storage.getGiftById(item.productId) 
            : null;
          const recommendation = item.recommendationId
            ? await storage.getRecommendationById(item.recommendationId)
            : null;
          
          // Structure data to match frontend expectations with properly formatted Amazon data
          return {
            ...item,
            recommendation: recommendation ? {
              ...recommendation,
              product: product ? {
                ...product,
                // Convert string booleans to actual booleans for frontend
                isPrime: product.isPrime === "true",
                isBestSeller: product.isBestSeller === "true",
                isAmazonChoice: product.isAmazonChoice === "true",
                // Parse numeric ratings if stored as strings
                amazonNumRatings: product.amazonNumRatings ? parseInt(product.amazonNumRatings) : null,
              } : {}
            } : null
          };
        })
      );
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });
  
  // DELETE /api/wishlist/:id - Remove item from wishlist
  app.delete("/api/wishlist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.removeFromWishlist(id);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  // POST /api/wishlist/share - Create a shareable wishlist link
  app.post("/api/wishlist/share", async (req: any, res) => {
    try {
      const shareSchema = z.object({
        sessionId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      });
      
      const data = shareSchema.parse(req.body);
      const userId = req.isAuthenticated() ? req.user.claims.sub : null;
      
      // Validate that we have either userId or sessionId
      if (!userId && !data.sessionId) {
        return res.status(400).json({ error: "Either user authentication or session ID is required" });
      }
      
      // Generate unique share token
      const shareToken = randomUUID().replace(/-/g, '').substring(0, 12);
      
      const sharedWishlist = await storage.createSharedWishlist({
        shareToken,
        userId: userId || null,
        sessionId: userId ? null : (data.sessionId || null),
        title: data.title || null,
        description: data.description || null,
      });
      
      res.json({
        ...sharedWishlist,
        shareUrl: `${req.protocol}://${req.get('host')}/shared/${shareToken}`,
      });
      
    } catch (error) {
      console.error("Error creating shareable wishlist:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create shareable wishlist" });
    }
  });

  // GET /api/wishlist/shared/:token - Get wishlist by share token
  app.get("/api/wishlist/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const sharedWishlist = await storage.getSharedWishlistByToken(token);
      
      if (!sharedWishlist) {
        return res.status(404).json({ error: "Shared wishlist not found" });
      }
      
      // Increment view count
      await storage.incrementWishlistViewCount(sharedWishlist.id);
      
      // Get wishlist items
      const items = await storage.getWishlistItemsBySharedWishlist(sharedWishlist.id);
      
      // Enrich with product and recommendation details
      const enriched = await Promise.all(
        items.map(async (item) => {
          const product = item.productId 
            ? await storage.getGiftById(item.productId) 
            : null;
          const recommendation = item.recommendationId
            ? await storage.getRecommendationById(item.recommendationId)
            : null;
          
          return {
            ...item,
            recommendation: recommendation ? {
              ...recommendation,
              product: product ? {
                ...product,
                isPrime: product.isPrime === "true",
                isBestSeller: product.isBestSeller === "true",
                isAmazonChoice: product.isAmazonChoice === "true",
                amazonNumRatings: product.amazonNumRatings ? parseInt(product.amazonNumRatings) : null,
              } : {}
            } : null
          };
        })
      );
      
      res.json({
        wishlist: {
          title: sharedWishlist.title,
          description: sharedWishlist.description,
          viewCount: sharedWishlist.viewCount,
          createdAt: sharedWishlist.createdAt,
        },
        items: enriched,
      });
      
    } catch (error) {
      console.error("Error fetching shared wishlist:", error);
      res.status(500).json({ error: "Failed to fetch shared wishlist" });
    }
  });


  // === RECIPIENT PROFILES ROUTES ===
  
  // GET /api/recipient-profiles - Get all recipient profiles for authenticated user
  app.get("/api/recipient-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profiles = await storage.getRecipientProfilesByUser(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching recipient profiles:", error);
      res.status(500).json({ error: "Failed to fetch recipient profiles" });
    }
  });

  // GET /api/recipient-profiles/:id - Get a specific recipient profile
  app.get("/api/recipient-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getRecipientProfileById(id);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      // Verify the profile belongs to the authenticated user
      if (profile.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching recipient profile:", error);
      res.status(500).json({ error: "Failed to fetch recipient profile" });
    }
  });

  // POST /api/recipient-profiles - Create a new recipient profile
  app.post("/api/recipient-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertRecipientProfileSchema.parse({
        ...req.body,
        userId,
      });
      
      const profile = await storage.createRecipientProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating recipient profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create recipient profile" });
    }
  });

  // PATCH /api/recipient-profiles/:id - Update a recipient profile
  app.patch("/api/recipient-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getRecipientProfileById(id);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      // Verify the profile belongs to the authenticated user
      if (profile.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateRecipientProfile(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipient profile:", error);
      res.status(500).json({ error: "Failed to update recipient profile" });
    }
  });

  // DELETE /api/recipient-profiles/:id - Delete a recipient profile
  app.delete("/api/recipient-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getRecipientProfileById(id);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      // Verify the profile belongs to the authenticated user
      if (profile.userId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteRecipientProfile(id);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting recipient profile:", error);
      res.status(500).json({ error: "Failed to delete recipient profile" });
    }
  });

  // === SHARED WISHLISTS ROUTES ===

  // POST /api/wishlist/share - Create a shareable wishlist link
  app.post("/api/wishlist/share", async (req: any, res) => {
    try {
      const shareToken = randomUUID().substring(0, 8);
      
      const shareData = insertSharedWishlistSchema.parse({
        shareToken,
        userId: req.isAuthenticated() ? req.user.claims.sub : null,
        sessionId: req.body.sessionId || null,
        title: req.body.title || "My Gift Wishlist",
        description: req.body.description || null,
      });
      
      const sharedWishlist = await storage.createSharedWishlist(shareData);
      res.json(sharedWishlist);
    } catch (error) {
      console.error("Error creating shared wishlist:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create shared wishlist" });
    }
  });

  // GET /api/wishlist/shared/:token - Get a shared wishlist by token
  app.get("/api/wishlist/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const sharedWishlist = await storage.getSharedWishlistByToken(token);
      
      if (!sharedWishlist) {
        return res.status(404).json({ error: "Shared wishlist not found" });
      }
      
      // Increment view count
      await storage.incrementWishlistViewCount(sharedWishlist.id);
      
      // Get wishlist items
      const items = await storage.getWishlistItemsBySharedWishlist(sharedWishlist.id);
      
      // Enrich with product details
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const product = item.productId 
            ? await storage.getGiftById(item.productId) 
            : null;
          return {
            ...item,
            product,
          };
        })
      );
      
      res.json({
        ...sharedWishlist,
        items: enrichedItems,
      });
    } catch (error) {
      console.error("Error fetching shared wishlist:", error);
      res.status(500).json({ error: "Failed to fetch shared wishlist" });
    }
  });

  // === TRENDING GIFTS ROUTE ===

  // GET /api/gifts/trending - Get trending gifts based on save count
  app.get("/api/gifts/trending", async (req, res) => {
    try {
      const limitSchema = z.object({
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
      });
      
      const { limit } = limitSchema.parse(req.query);
      
      // Get all gifts
      const allGifts = await storage.getAllGifts();
      
      // Separate Diwali products and other products
      const diwaliGifts = allGifts.filter(gift => 
        gift.occasions.includes("Diwali") || 
        gift.tags?.some(tag => tag.toLowerCase().includes("diwali"))
      );
      const otherGifts = allGifts.filter(gift => 
        !gift.occasions.includes("Diwali") && 
        !gift.tags?.some(tag => tag.toLowerCase().includes("diwali"))
      );
      
      // Shuffle both arrays for variety
      const shuffledDiwali = diwaliGifts.sort(() => Math.random() - 0.5);
      const shuffledOthers = otherGifts.sort(() => Math.random() - 0.5);
      
      // Combine: Show all Diwali products first, then fill remaining with other trending products
      const diwaliCount = Math.min(shuffledDiwali.length, Math.ceil(limit * 0.5)); // At least 50% Diwali if available
      const otherCount = limit - diwaliCount;
      
      const trending = [
        ...shuffledDiwali.slice(0, diwaliCount),
        ...shuffledOthers.slice(0, otherCount)
      ];
      
      res.json(trending);
    } catch (error) {
      console.error("Error fetching trending gifts:", error);
      res.status(500).json({ error: "Failed to fetch trending gifts" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
