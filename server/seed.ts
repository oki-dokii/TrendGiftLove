import { storage } from "./storage";
import { seedGiftProducts } from "./seed-data";

export async function seedDatabase() {
  console.log("Seeding gift products database...");
  
  let seededCount = 0;
  let skippedCount = 0;
  
  const existingProducts = await storage.getAllGifts();
  
  for (const product of seedGiftProducts) {
    try {
      const exists = existingProducts.some(p => p.name === product.name && p.category === product.category);
      
      if (!exists) {
        await storage.createGiftProduct(product);
        seededCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`Failed to seed product: ${product.name}`, error);
    }
  }
  
  console.log(`Successfully seeded ${seededCount} gift products (${skippedCount} already existed)`);
  return seededCount;
}
