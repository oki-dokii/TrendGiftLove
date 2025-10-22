import {
  type User,
  type UpsertUser,
  type GiftProduct,
  type InsertGiftProduct,
  type GiftRecommendation,
  type InsertGiftRecommendation,
  type WishlistItem,
  type InsertWishlistItem,
  type RecipientProfile,
  type InsertRecipientProfile,
  type SharedWishlist,
  type InsertSharedWishlist,
  giftProducts,
  giftRecommendations,
  wishlistItems,
  users,
  recipientProfiles,
  sharedWishlists,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, or, desc, sql } from "drizzle-orm";

// DON'T DELETE THIS COMMENT
// Blueprint reference: javascript_database

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Gift Products
  getAllGiftProducts(): Promise<GiftProduct[]>;
  getAllGifts(): Promise<GiftProduct[]>; // Alias for getAllGiftProducts
  getGiftProductById(id: string): Promise<GiftProduct | undefined>;
  getGiftById(id: string): Promise<GiftProduct | undefined>; // Alias for getGiftProductById
  getGiftProductsByFilters(filters: {
    category?: string;
    interests?: string[];
    budget?: string;
    occasion?: string;
    relationship?: string;
  }): Promise<GiftProduct[]>;
  createGiftProduct(product: InsertGiftProduct): Promise<GiftProduct>;
  updateGiftProduct(id: string, updates: Partial<GiftProduct>): Promise<GiftProduct | undefined>;

  // Gift Recommendations
  getRecommendationsBySession(sessionId: string): Promise<GiftRecommendation[]>;
  getRecommendationById(id: string): Promise<GiftRecommendation | undefined>;
  createRecommendation(recommendation: InsertGiftRecommendation): Promise<GiftRecommendation>;
  updateRecommendation(id: string, updates: Partial<GiftRecommendation>): Promise<GiftRecommendation | undefined>;

  // Wishlist
  getWishlistBySession(sessionId: string): Promise<WishlistItem[]>;
  getWishlistByUser(userId: string): Promise<WishlistItem[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(id: string): Promise<boolean>;

  // Recipient Profiles
  getRecipientProfilesByUser(userId: string): Promise<RecipientProfile[]>;
  getRecipientProfileById(id: string): Promise<RecipientProfile | undefined>;
  createRecipientProfile(profile: InsertRecipientProfile): Promise<RecipientProfile>;
  updateRecipientProfile(id: string, updates: Partial<RecipientProfile>): Promise<RecipientProfile | undefined>;
  deleteRecipientProfile(id: string): Promise<boolean>;

  // Shared Wishlists
  createSharedWishlist(data: InsertSharedWishlist): Promise<SharedWishlist>;
  getSharedWishlistByToken(token: string): Promise<SharedWishlist | undefined>;
  incrementWishlistViewCount(id: string): Promise<void>;
  getWishlistItemsBySharedWishlist(wishlistId: string): Promise<WishlistItem[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Gift Products
  async getAllGiftProducts(): Promise<GiftProduct[]> {
    return await db.select().from(giftProducts);
  }

  async getAllGifts(): Promise<GiftProduct[]> {
    return this.getAllGiftProducts();
  }

  async getGiftProductById(id: string): Promise<GiftProduct | undefined> {
    const [product] = await db.select().from(giftProducts).where(eq(giftProducts.id, id));
    return product;
  }

  async getGiftById(id: string): Promise<GiftProduct | undefined> {
    return this.getGiftProductById(id);
  }

  async getGiftProductsByFilters(filters: {
    category?: string;
    interests?: string[];
    budget?: string;
    occasion?: string;
    relationship?: string;
  }): Promise<GiftProduct[]> {
    let query = db.select().from(giftProducts);
    let products = await query;

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.interests && filters.interests.length > 0) {
      products = products.filter(p =>
        filters.interests!.some(interest => p.interests.includes(interest))
      );
    }

    if (filters.budget) {
      const budgetMap: Record<string, { min: number; max: number }> = {
        free: { min: 0, max: 0 },
        low: { min: 1, max: 500 },
        medium: { min: 500, max: 2000 },
        high: { min: 2000, max: 5000 },
        premium: { min: 5000, max: 1000000 },
      };

      const range = budgetMap[filters.budget];
      if (range) {
        products = products.filter(p =>
          p.priceMin <= range.max && p.priceMax >= range.min
        );
      }
    }

    if (filters.occasion) {
      products = products.filter(p => p.occasions.includes(filters.occasion!));
    }

    if (filters.relationship) {
      products = products.filter(p =>
        p.relationship && p.relationship.includes(filters.relationship!)
      );
    }

    return products;
  }

  async createGiftProduct(insertProduct: InsertGiftProduct): Promise<GiftProduct> {
    const [product] = await db
      .insert(giftProducts)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateGiftProduct(id: string, updates: Partial<GiftProduct>): Promise<GiftProduct | undefined> {
    const [updated] = await db
      .update(giftProducts)
      .set(updates)
      .where(eq(giftProducts.id, id))
      .returning();
    return updated;
  }

  // Gift Recommendations
  async getRecommendationsBySession(sessionId: string): Promise<GiftRecommendation[]> {
    return await db
      .select()
      .from(giftRecommendations)
      .where(eq(giftRecommendations.sessionId, sessionId));
  }

  async getRecommendationById(id: string): Promise<GiftRecommendation | undefined> {
    const [recommendation] = await db
      .select()
      .from(giftRecommendations)
      .where(eq(giftRecommendations.id, id));
    return recommendation;
  }

  async createRecommendation(
    insertRecommendation: InsertGiftRecommendation
  ): Promise<GiftRecommendation> {
    const [recommendation] = await db
      .insert(giftRecommendations)
      .values(insertRecommendation)
      .returning();
    return recommendation;
  }

  async updateRecommendation(
    id: string,
    updates: Partial<GiftRecommendation>
  ): Promise<GiftRecommendation | undefined> {
    const [updated] = await db
      .update(giftRecommendations)
      .set(updates)
      .where(eq(giftRecommendations.id, id))
      .returning();
    return updated;
  }

  // Wishlist
  async getWishlistBySession(sessionId: string): Promise<WishlistItem[]> {
    return await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.sessionId, sessionId));
  }

  async getWishlistByUser(userId: string): Promise<WishlistItem[]> {
    return await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId));
  }

  async addToWishlist(insertItem: InsertWishlistItem): Promise<WishlistItem> {
    const [item] = await db
      .insert(wishlistItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async removeFromWishlist(id: string): Promise<boolean> {
    const result = await db
      .delete(wishlistItems)
      .where(eq(wishlistItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Recipient Profiles
  async getRecipientProfilesByUser(userId: string): Promise<RecipientProfile[]> {
    return await db
      .select()
      .from(recipientProfiles)
      .where(eq(recipientProfiles.userId, userId))
      .orderBy(desc(recipientProfiles.updatedAt));
  }

  async getRecipientProfileById(id: string): Promise<RecipientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(recipientProfiles)
      .where(eq(recipientProfiles.id, id));
    return profile;
  }

  async createRecipientProfile(insertProfile: InsertRecipientProfile): Promise<RecipientProfile> {
    const [profile] = await db
      .insert(recipientProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async updateRecipientProfile(id: string, updates: Partial<RecipientProfile>): Promise<RecipientProfile | undefined> {
    const [updated] = await db
      .update(recipientProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recipientProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteRecipientProfile(id: string): Promise<boolean> {
    const result = await db
      .delete(recipientProfiles)
      .where(eq(recipientProfiles.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Shared Wishlists
  async createSharedWishlist(data: InsertSharedWishlist): Promise<SharedWishlist> {
    const [wishlist] = await db
      .insert(sharedWishlists)
      .values(data)
      .returning();
    return wishlist;
  }

  async getSharedWishlistByToken(token: string): Promise<SharedWishlist | undefined> {
    const [wishlist] = await db
      .select()
      .from(sharedWishlists)
      .where(eq(sharedWishlists.shareToken, token));
    return wishlist;
  }

  async incrementWishlistViewCount(id: string): Promise<void> {
    await db
      .update(sharedWishlists)
      .set({ viewCount: sql`${sharedWishlists.viewCount} + 1` })
      .where(eq(sharedWishlists.id, id));
  }

  async getWishlistItemsBySharedWishlist(wishlistId: string): Promise<WishlistItem[]> {
    const wishlist = await db
      .select()
      .from(sharedWishlists)
      .where(eq(sharedWishlists.id, wishlistId));
    
    if (!wishlist[0]) return [];
    
    const { userId, sessionId } = wishlist[0];
    
    if (userId) {
      return this.getWishlistByUser(userId);
    } else if (sessionId) {
      return this.getWishlistBySession(sessionId);
    }
    
    return [];
  }
}

export const storage = new DatabaseStorage();
