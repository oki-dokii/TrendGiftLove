import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Gift products database (curated)
export const giftProducts = pgTable("gift_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // Technology, Books, Music, Art, Sports, etc.
  priceMin: integer("price_min").notNull(), // in rupees
  priceMax: integer("price_max").notNull(),
  interests: text("interests").array().notNull(), // matching user interests
  occasions: text("occasions").array().notNull(), // Birthday, Anniversary, etc.
  ageGroup: text("age_group"), // child, teen, adult, senior
  relationship: text("relationship").array(), // friend, partner, family, etc.
  personality: text("personality").array(), // adventurous, minimalist, traditional, etc.
  affiliateLink: text("affiliate_link"),
  imageUrl: text("image_url"),
  tags: text("tags").array(),
});

// Gift recommendations (AI-generated for users)
export const giftRecommendations = pgTable("gift_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // groups recommendations from same search
  recipientName: text("recipient_name"),
  recipientAge: integer("recipient_age"),
  relationship: text("relationship"),
  interests: text("interests").array(),
  personality: text("personality"),
  budget: text("budget"),
  occasion: text("occasion"),
  productId: varchar("product_id").references(() => giftProducts.id),
  aiReasoning: text("ai_reasoning"), // Why this gift was recommended
  personalizedMessage: text("personalized_message"), // AI-generated message
  relevanceScore: integer("relevance_score"), // 1-100
  createdAt: timestamp("created_at").defaultNow(),
});

// User wishlists/buckets
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(), // anonymous users use sessionId
  recommendationId: varchar("recommendation_id").references(() => giftRecommendations.id),
  productId: varchar("product_id").references(() => giftProducts.id),
  notes: text("notes"),
  reminder: timestamp("reminder"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertGiftProductSchema = createInsertSchema(giftProducts).omit({
  id: true,
});

export const insertGiftRecommendationSchema = createInsertSchema(giftRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true,
});

// Request schemas
export const giftFinderRequestSchema = z.object({
  recipientName: z.string().optional(),
  recipientAge: z.number().optional(),
  relationship: z.string(),
  interests: z.array(z.string()),
  personality: z.string().optional(),
  budget: z.string(),
  occasion: z.string(),
});

// Export types
export type GiftProduct = typeof giftProducts.$inferSelect;
export type InsertGiftProduct = z.infer<typeof insertGiftProductSchema>;

export type GiftRecommendation = typeof giftRecommendations.$inferSelect;
export type InsertGiftRecommendation = z.infer<typeof insertGiftRecommendationSchema>;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

export type GiftFinderRequest = z.infer<typeof giftFinderRequestSchema>;
