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
  calculateRelevanceScore 
} from "./ai-service";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // POST /api/recommendations - Generate AI-powered gift recommendations
  app.post("/api/recommendations", async (req, res) => {
    try {
      // Validate request body
      const request = giftFinderRequestSchema.parse(req.body);
      
      // Get all products from storage
      const allProducts = await storage.getAllGifts();
      
      // Filter products by budget and basic criteria
      const budgetMap: Record<string, { min: number; max: number }> = {
        "Under ₹500": { min: 0, max: 500 },
        "₹500 - ₹2000": { min: 500, max: 2000 },
        "₹2000 - ₹5000": { min: 2000, max: 5000 },
        "₹5000 - ₹10000": { min: 5000, max: 10000 },
        "₹10000+": { min: 10000, max: 1000000 },
      };
      
      const budgetRange = budgetMap[request.budget] || { min: 0, max: 1000000 };
      
      // Pre-filter products by budget and calculate relevance scores
      const filteredProducts = allProducts
        .filter(product => 
          product.priceMax >= budgetRange.min && 
          product.priceMin <= budgetRange.max
        )
        .map(product => ({
          product,
          score: calculateRelevanceScore(request, product)
        }))
        .filter(item => item.score > 30) // Only keep reasonably relevant products
        .sort((a, b) => b.score - a.score)
        .slice(0, 30) // Limit to top 30 for AI to consider
        .map(item => item.product);
      
      if (filteredProducts.length === 0) {
        return res.status(404).json({ 
          error: "No suitable gifts found for this criteria" 
        });
      }
      
      // Generate AI recommendations
      const aiResult = await generateGiftRecommendations(request, filteredProducts);
      
      // Create a session ID for this recommendation set
      const sessionId = randomUUID();
      
      // Save recommendations to storage (validate product exists first)
      const savedRecommendations = [];
      for (const rec of aiResult.recommendations) {
        // Validate product exists in storage before creating recommendation
        const product = await storage.getGiftById(rec.productId);
        if (!product) {
          console.warn(`AI recommended non-existent product: ${rec.productId}`);
          continue; // Skip invalid products
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
          personalizedMessage: null, // Generated on demand
          relevanceScore: rec.relevanceScore,
        });
        
        savedRecommendations.push({
          ...recommendation,
          product,
        });
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
  
  // POST /api/message - Generate personalized message for a gift
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
      
      // Generate personalized message
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
  
  // POST /api/wishlist - Add item to wishlist
  app.post("/api/wishlist", async (req, res) => {
    try {
      const wishlistSchema = insertWishlistItemSchema.extend({
        sessionId: z.string(),
      });
      
      const data = wishlistSchema.parse(req.body);
      const item = await storage.addToWishlist(data);
      
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
  
  // GET /api/wishlist/:sessionId - Get user's wishlist
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

  const httpServer = createServer(app);

  return httpServer;
}
