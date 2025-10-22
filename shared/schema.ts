import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// DON'T DELETE THIS COMMENT
// Blueprint reference: javascript_log_in_with_replit, javascript_database

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  amazonProductId: text("amazon_product_id"), // Link to real Amazon product
  amazonUrl: text("amazon_url"), // Direct link to buy on Amazon
  amazonPrice: text("amazon_price"), // Current price on Amazon
  amazonRating: text("amazon_rating"), // Amazon product rating
  amazonNumRatings: text("amazon_num_ratings"), // Number of ratings
  isPrime: text("is_prime"), // Amazon Prime eligible
  isBestSeller: text("is_best_seller"), // Amazon Best Seller badge
  isAmazonChoice: text("is_amazon_choice"), // Amazon's Choice badge
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

// Saved recipient profiles (for repeat gift finding)
export const recipientProfiles = pgTable("recipient_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  gender: text("gender"),
  age: integer("age"),
  interests: text("interests").array().notNull(),
  personality: text("personality"),
  relationship: text("relationship"),
  favoriteOccasions: text("favorite_occasions").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User wishlists/buckets (bucket list for logged in users)
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  recommendationId: varchar("recommendation_id").references(() => giftRecommendations.id),
  productId: varchar("product_id").references(() => giftProducts.id),
  notes: text("notes"),
  reminder: timestamp("reminder"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shared wishlists for public viewing
export const sharedWishlists = pgTable("shared_wishlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareToken: varchar("share_token").unique().notNull(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  title: text("title"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  viewCount: integer("view_count").default(0),
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

export const insertRecipientProfileSchema = createInsertSchema(recipientProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSharedWishlistSchema = createInsertSchema(sharedWishlists).omit({
  id: true,
  createdAt: true,
  viewCount: true,
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

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

// Export types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type GiftProduct = typeof giftProducts.$inferSelect;
export type InsertGiftProduct = z.infer<typeof insertGiftProductSchema>;

export type GiftRecommendation = typeof giftRecommendations.$inferSelect;
export type InsertGiftRecommendation = z.infer<typeof insertGiftRecommendationSchema>;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

export type RecipientProfile = typeof recipientProfiles.$inferSelect;
export type InsertRecipientProfile = z.infer<typeof insertRecipientProfileSchema>;

export type SharedWishlist = typeof sharedWishlists.$inferSelect;
export type InsertSharedWishlist = z.infer<typeof insertSharedWishlistSchema>;

export type GiftFinderRequest = z.infer<typeof giftFinderRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
