import { storage } from "./storage";
import { seedGiftProducts } from "./seed-data";

export async function seedDatabase() {
  console.log("Seeding gift products database...");
  
  let seededCount = 0;
  
  for (const product of seedGiftProducts) {
    try {
      await storage.createGiftProduct(product);
      seededCount++;
    } catch (error) {
      console.error(`Failed to seed product: ${product.name}`, error);
    }
  }
  
  console.log(`Successfully seeded ${seededCount} gift products`);
  return seededCount;
}
