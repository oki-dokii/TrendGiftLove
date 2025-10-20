import { db } from "./db";
import { giftProducts, giftRecommendations } from "@shared/schema";
import { eq, sql, and, inArray } from "drizzle-orm";

/**
 * One-time cleanup script to remove duplicate gift products
 * and consolidate foreign key references
 */
async function cleanupDuplicates() {
  console.log("Starting duplicate cleanup...");
  
  // Get all products grouped by name and category
  const allProducts = await db.select().from(giftProducts);
  
  // Group products by name + category
  const productGroups = new Map<string, typeof allProducts>();
  for (const product of allProducts) {
    const key = `${product.name}||${product.category}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(product);
  }
  
  console.log(`Found ${productGroups.size} unique products with ${allProducts.length} total rows`);
  
  // Process each group
  for (const [key, products] of Array.from(productGroups.entries())) {
    if (products.length === 1) continue; // No duplicates
    
    // Choose canonical product: prefer one with Flipkart URL, otherwise first by ID
    const canonical = products.find((p) => p.flipkartUrl) || products[0];
    const duplicateIds = products.filter((p) => p.id !== canonical.id).map((p) => p.id);
    
    if (duplicateIds.length === 0) continue;
    
    console.log(`Consolidating "${canonical.name}" (${canonical.category}): keeping ${canonical.id}, removing ${duplicateIds.length} duplicates`);
    
    // Update all recommendations to point to the canonical product
    await db
      .update(giftRecommendations)
      .set({ productId: canonical.id })
      .where(inArray(giftRecommendations.productId, duplicateIds));
    
    // Delete duplicate products
    await db
      .delete(giftProducts)
      .where(inArray(giftProducts.id, duplicateIds));
  }
  
  console.log("Duplicate cleanup complete!");
  
  // Verify results
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(giftProducts);
  console.log(`Final product count: ${finalCount[0].count}`);
}

// Run cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicates()
    .then(() => {
      console.log("✓ Cleanup successful");
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Cleanup failed:", error);
      process.exit(1);
    });
}

export { cleanupDuplicates };
