import { storage } from './storage';

/**
 * Add Flipkart search URLs to ALL products in the database
 */
async function addFlipkartToAllProducts() {
  console.log('Adding Flipkart links to ALL products...\n');
  
  const allProducts = await storage.getAllGiftProducts();
  console.log(`Found ${allProducts.length} products in database\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of allProducts) {
    try {
      // Skip if already has Flipkart URL
      if (product.flipkartUrl) {
        skipped++;
        continue;
      }
      
      // Create search query from product name and category
      const searchTerms = `${product.name} ${product.category}`;
      const searchQuery = encodeURIComponent(searchTerms);
      const flipkartUrl = `https://www.flipkart.com/search?q=${searchQuery}`;
      
      // Update product with Flipkart URL
      await storage.updateGiftProduct(product.id, {
        flipkartUrl: flipkartUrl,
      });
      
      updated++;
      
      if (updated % 20 === 0) {
        console.log(`Progress: ${updated} products updated...`);
      }
      
    } catch (error) {
      console.error(`Error updating ${product.name}:`, error);
    }
  }

  console.log(`\n✅ Successfully added Flipkart links to ${updated} products`);
  console.log(`⏭️  Skipped ${skipped} products (already had links)`);
  console.log(`📦 Total products with Flipkart links: ${updated + skipped}`);
}

addFlipkartToAllProducts()
  .then(() => {
    console.log('\n🎉 All products now have Flipkart purchase links!');
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
