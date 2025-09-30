import {
  type GiftProduct,
  type InsertGiftProduct,
  type GiftRecommendation,
  type InsertGiftRecommendation,
  type WishlistItem,
  type InsertWishlistItem,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
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

  // Gift Recommendations
  getRecommendationsBySession(sessionId: string): Promise<GiftRecommendation[]>;
  getRecommendationById(id: string): Promise<GiftRecommendation | undefined>;
  createRecommendation(recommendation: InsertGiftRecommendation): Promise<GiftRecommendation>;
  updateRecommendation(id: string, updates: Partial<GiftRecommendation>): Promise<GiftRecommendation | undefined>;

  // Wishlist
  getWishlistBySession(sessionId: string): Promise<WishlistItem[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private giftProducts: Map<string, GiftProduct>;
  private recommendations: Map<string, GiftRecommendation>;
  private wishlistItems: Map<string, WishlistItem>;

  constructor() {
    this.giftProducts = new Map();
    this.recommendations = new Map();
    this.wishlistItems = new Map();
  }

  // Gift Products
  async getAllGiftProducts(): Promise<GiftProduct[]> {
    return Array.from(this.giftProducts.values());
  }

  async getAllGifts(): Promise<GiftProduct[]> {
    return this.getAllGiftProducts();
  }

  async getGiftProductById(id: string): Promise<GiftProduct | undefined> {
    return this.giftProducts.get(id);
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
    let products = Array.from(this.giftProducts.values());

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
    const id = randomUUID();
    const product: GiftProduct = {
      ...insertProduct,
      id,
      ageGroup: insertProduct.ageGroup ?? null,
      relationship: insertProduct.relationship ?? null,
      personality: insertProduct.personality ?? null,
      affiliateLink: insertProduct.affiliateLink ?? null,
      imageUrl: insertProduct.imageUrl ?? null,
      tags: insertProduct.tags ?? null,
    };
    this.giftProducts.set(id, product);
    return product;
  }

  // Gift Recommendations
  async getRecommendationsBySession(sessionId: string): Promise<GiftRecommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      r => r.sessionId === sessionId
    );
  }

  async getRecommendationById(id: string): Promise<GiftRecommendation | undefined> {
    return this.recommendations.get(id);
  }

  async createRecommendation(
    insertRecommendation: InsertGiftRecommendation
  ): Promise<GiftRecommendation> {
    const id = randomUUID();
    const recommendation: GiftRecommendation = {
      ...insertRecommendation,
      id,
      recipientName: insertRecommendation.recipientName ?? null,
      recipientAge: insertRecommendation.recipientAge ?? null,
      relationship: insertRecommendation.relationship ?? null,
      interests: insertRecommendation.interests ?? null,
      personality: insertRecommendation.personality ?? null,
      budget: insertRecommendation.budget ?? null,
      occasion: insertRecommendation.occasion ?? null,
      productId: insertRecommendation.productId ?? null,
      aiReasoning: insertRecommendation.aiReasoning ?? null,
      personalizedMessage: insertRecommendation.personalizedMessage ?? null,
      relevanceScore: insertRecommendation.relevanceScore ?? null,
      createdAt: new Date(),
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async updateRecommendation(
    id: string, 
    updates: Partial<GiftRecommendation>
  ): Promise<GiftRecommendation | undefined> {
    const existing = this.recommendations.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: GiftRecommendation = {
      ...existing,
      ...updates,
      id, // Ensure id doesn't change
      createdAt: existing.createdAt, // Preserve createdAt
    };

    this.recommendations.set(id, updated);
    return updated;
  }

  // Wishlist
  async getWishlistBySession(sessionId: string): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values()).filter(
      item => item.sessionId === sessionId
    );
  }

  async addToWishlist(insertItem: InsertWishlistItem): Promise<WishlistItem> {
    const id = randomUUID();
    const item: WishlistItem = {
      ...insertItem,
      id,
      recommendationId: insertItem.recommendationId ?? null,
      productId: insertItem.productId ?? null,
      notes: insertItem.notes ?? null,
      reminder: insertItem.reminder ?? null,
      createdAt: new Date(),
    };
    this.wishlistItems.set(id, item);
    return item;
  }

  async removeFromWishlist(id: string): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }
}

export const storage = new MemStorage();
