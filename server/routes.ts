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
      
      const { message, conversationState } = chatSchema.parse(req.body);
      
      // Use AI to process the message and extract/update information
      const systemPrompt = `You are GiftAI, a friendly and conversational gift recommendation assistant. Your role is to help users find the perfect gift by gathering information through natural conversation.

You need to collect the following information:
- occasion (Birthday, Anniversary, Wedding, Graduation, Festival, or Just Because)
- relationship (Friend, Partner, Parent, Sibling, Colleague, Child, or other)
- interests (at least one: Technology, Books, Music, Art, Sports, Cooking, Travel, Gaming, Fashion, Fitness, etc.)
- budget (Under ₹500, ₹500-₹2000, ₹2000-₹5000, ₹5000-₹10000, ₹10000+)
- personality (optional: Adventurous, Minimalist, Traditional, Trendy, Practical, Romantic, etc.)
- recipientName (optional)
- recipientAge (optional)

Based on the user's message and current conversation state:
1. Extract any new information from their message
2. Determine what information is still missing
3. Respond naturally and conversationally
4. Ask for missing information in a friendly way
5. When you have enough info (occasion, relationship, interests, budget), indicate readiness to generate recommendations

Respond with JSON containing:
- response: Your conversational response to the user
- extractedInfo: Object with any newly extracted information fields
- missingInfo: Array of field names still needed
- readyToRecommend: boolean indicating if we have enough info to recommend gifts`;

      const userPrompt = `Current conversation state: ${JSON.stringify(conversationState)}

User's message: "${message}"

Extract information from the user's message, update the conversation state, and respond naturally. Return ONLY valid JSON.`;

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
      
      // Merge extracted info with conversation state
      const updatedState = {
        ...conversationState,
        ...result.extractedInfo,
        interests: result.extractedInfo.interests?.length > 0 
          ? result.extractedInfo.interests 
          : conversationState.interests,
      };

      res.json({
        response: result.response,
        conversationState: updatedState,
        readyToRecommend: result.readyToRecommend,
      });

    } catch (error) {
      console.error("Error in chat:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to process message",
        response: "I'm sorry, I'm having trouble understanding. Could you please rephrase that?",
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
            amazonRecommendations.push({
              amazonProduct: {
                asin: product.id,
                title: product.name,
                price: product.priceMin > 0 ? `₹${product.priceMin}` : "Price not available",
                currency: "INR",
                numRatings: 0,
                url: product.amazonUrl || "#",
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
        
        // Convert to amazonRecommendations format for consistency
        for (const rec of aiResult.recommendations.slice(0, 6)) {
          const product = await storage.getGiftById(rec.productId);
          if (product && !existingProductIds.has(product.id)) {
            amazonRecommendations.push({
              amazonProduct: {
                asin: product.id,
                title: product.name,
                price: product.priceMin > 0 ? `₹${product.priceMin}` : "Price not available",
                currency: "INR",
                numRatings: 0,
                url: product.amazonUrl || product.flipkartUrl || "#",
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
      
      const itemData = {
        ...data,
        userId: userId || null,
        sessionId: userId ? null : (data.sessionId || null),
      };
      
      const item = await storage.addToWishlist(itemData);
      
      // Enrich with product details
      const product = item.productId 
        ? await storage.getGiftById(item.productId) 
        : null;
      const recommendation = item.recommendationId
        ? await storage.getRecommendationById(item.recommendationId)
        : null;
      
      res.json({
        ...item,
        product,
        recommendation,
      });
      
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
          return {
            ...item,
            product,
            recommendation,
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
          return {
            ...item,
            product,
            recommendation,
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
      
      // Get all gifts and sort by popularity (based on wishlist saves)
      const allGifts = await storage.getAllGifts();
      
      // For now, return random selection of gifts as "trending"
      // In production, you'd track actual save counts
      const shuffled = allGifts.sort(() => Math.random() - 0.5);
      const trending = shuffled.slice(0, limit);
      
      res.json(trending);
    } catch (error) {
      console.error("Error fetching trending gifts:", error);
      res.status(500).json({ error: "Failed to fetch trending gifts" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
