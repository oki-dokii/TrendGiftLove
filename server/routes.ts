import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  giftFinderRequestSchema, 
  insertWishlistItemSchema,
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
import { searchGiftProducts, searchFlipkartProducts } from "./flipkart-service";

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
      const amazonRecommendations = await generateAIProductSuggestions(request);
      
      if (amazonRecommendations.length === 0) {
        return res.status(404).json({ 
          error: "No suitable gifts found on Amazon for this criteria" 
        });
      }
      
      // Create a session ID for this recommendation set
      const sessionId = randomUUID();
      
      // Store Amazon recommendations in database
      // Create minimal gift_product records for Amazon products so they can be fetched later
      const savedRecommendations = [];
      for (const rec of amazonRecommendations) {
        try {
          // Create a minimal product record for this Amazon product
          const amazonProduct = await storage.createGiftProduct({
            name: rec.amazonProduct.title,
            description: rec.aiReasoning,
            category: "Amazon Product",
            priceMin: parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0,
            priceMax: parseFloat(rec.amazonProduct.price.replace(/[^0-9.]/g, '')) || 0,
            interests: request.interests,
            occasions: [request.occasion],
            relationship: [request.relationship],
            tags: [
              rec.amazonProduct.isPrime ? "Prime" : "",
              rec.amazonProduct.isBestSeller ? "Best Seller" : "",
              rec.amazonProduct.isAmazonChoice ? "Amazon's Choice" : "",
            ].filter(Boolean),
            imageUrl: rec.amazonProduct.imageUrl,
            flipkartUrl: null, // Not using Flipkart for these
          });
          
          // Update the product with Amazon-specific data (these fields should be in the schema)
          const updatedProduct = await storage.updateGiftProduct(amazonProduct.id, {
            flipkartUrl: rec.amazonProduct.url, // Store Amazon URL in flipkartUrl field for now
          });
          
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
            productId: amazonProduct.id,
            aiReasoning: rec.aiReasoning,
            personalizedMessage: null, // Generated on demand
            relevanceScore: rec.relevanceScore,
          });
          
          // Format for frontend with Amazon product data
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
                amazonUrl: product.flipkartUrl, // We stored Amazon URL in flipkartUrl field
                amazonPrice: `$${product.priceMin.toFixed(2)}`,
                // Extract Amazon badges from tags
                isPrime: product.tags?.includes("Prime") || false,
                isBestSeller: product.tags?.includes("Best Seller") || false,
                isAmazonChoice: product.tags?.includes("Amazon's Choice") || false,
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

  // POST /api/recommendations/:sessionId/more - Generate more recommendations for existing session
  app.post("/api/recommendations/:sessionId/more", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get existing recommendations to retrieve session context
      const existingRecs = await storage.getRecommendationsBySession(sessionId);
      if (existingRecs.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Use first recommendation to get search context
      const firstRec = existingRecs[0];
      const request = {
        recipientName: firstRec.recipientName || undefined,
        recipientAge: firstRec.recipientAge || undefined,
        relationship: firstRec.relationship || "friend",
        interests: firstRec.interests || [],
        personality: firstRec.personality || undefined,
        budget: firstRec.budget || "",
        occasion: firstRec.occasion || "",
      };
      
      // Get all products from storage
      const allProducts = await storage.getAllGifts();
      
      // Filter products by budget
      const budgetMap: Record<string, { min: number; max: number }> = {
        "Under ₹500": { min: 0, max: 500 },
        "₹500 - ₹2000": { min: 500, max: 2000 },
        "₹2000 - ₹5000": { min: 2000, max: 5000 },
        "₹5000 - ₹10000": { min: 5000, max: 10000 },
        "₹10000+": { min: 10000, max: 1000000 },
      };
      
      const budgetRange = budgetMap[request.budget] || { min: 0, max: 1000000 };
      
      // Get already recommended product IDs to exclude them
      const existingProductIds = new Set(existingRecs.map(r => r.productId).filter(Boolean));
      
      // Pre-filter products by budget and exclude already recommended
      const filteredProducts = allProducts
        .filter(product => 
          product.priceMax >= budgetRange.min && 
          product.priceMin <= budgetRange.max &&
          !existingProductIds.has(product.id)
        )
        .map(product => ({
          product,
          score: calculateRelevanceScore(request, product)
        }))
        .filter(item => item.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map(item => item.product);
      
      if (filteredProducts.length === 0) {
        return res.status(404).json({ 
          error: "No more suitable gifts found for this criteria" 
        });
      }
      
      // Generate AI recommendations
      const aiResult = await generateGiftRecommendations(request, filteredProducts);
      
      // Save new recommendations to same session
      const savedRecommendations = [];
      for (const rec of aiResult.recommendations) {
        const product = await storage.getGiftById(rec.productId);
        if (!product || existingProductIds.has(product.id)) {
          continue;
        }
        
        const recommendation = await storage.createRecommendation({
          sessionId,
          recipientName: request.recipientName || null,
          recipientAge: request.recipientAge || null,
          relationship: request.relationship,
          interests: request.interests,
          personality: request.personality || null,
          budget: request.budget,
          occasion: request.occasion,
          productId: rec.productId,
          aiReasoning: rec.reasoning,
          personalizedMessage: null,
          relevanceScore: rec.relevanceScore,
        });
        
        savedRecommendations.push({
          ...recommendation,
          product,
        });
      }
      
      // If no new recommendations were generated, return 404
      if (savedRecommendations.length === 0) {
        return res.status(404).json({ 
          error: "No more suitable gifts found for this criteria" 
        });
      }
      
      res.json({
        recommendations: savedRecommendations,
      });
      
    } catch (error) {
      console.error("Error generating more recommendations:", error);
      res.status(500).json({ error: "Failed to generate more recommendations" });
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

  // GET /api/flipkart/search - Search Flipkart products via RapidAPI
  app.get("/api/flipkart/search", async (req, res) => {
    try {
      const searchSchema = z.object({
        query: z.string(),
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        sortBy: z.enum(['popularity', 'price_low_to_high', 'price_high_to_low', 'relevance']).optional().default('popularity'),
      });
      
      const { query, page, sortBy } = searchSchema.parse(req.query);
      
      const results = await searchFlipkartProducts(query, page, sortBy);
      
      res.json(results);
    } catch (error) {
      console.error("Error searching Flipkart:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to search Flipkart products",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
