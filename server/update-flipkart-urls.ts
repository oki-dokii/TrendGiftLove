import { storage } from './storage';
import { searchFlipkartProducts } from './flipkart-service';

/**
 * Update products with real Flipkart product URLs
 */
async function updateFlipkartUrls() {
  console.log('Fetching products that need Flipkart URLs...');
  
  // Products to update with their search queries
  const productsToUpdate = [
    { name: 'Water Bottle Insulated 1L', query: 'insulated steel water bottle 1L' },
    { name: 'Bluetooth Wireless Headphones', query: 'bluetooth wireless headphones' },
    { name: 'Yoga Mat with Carrying Strap', query: 'yoga mat with carrying strap' },
    { name: 'Smart Watch Fitness Tracker', query: 'smart watch fitness tracker' },
    { name: 'Kindle E-Reader', query: 'kindle e-reader amazon' },
    { name: 'Premium Notebook Set', query: 'premium notebook diary set' },
    { name: 'Wireless Mouse', query: 'wireless mouse computer' },
    { name: 'Bluetooth Portable Speaker', query: 'bluetooth portable speaker' },
    { name: 'Premium Sports Duffle Bag', query: 'sports gym duffle bag' },
    { name: 'Designer Sunglasses', query: 'designer sunglasses' },
    { name: 'Cooking Utensils Set', query: 'cooking utensils kitchen set' },
    { name: 'Gardening Tool Kit', query: 'gardening tools kit set' },
    { name: 'Travel Backpack 40L', query: 'travel backpack 40L hiking' },
    { name: 'Running Shoes', query: 'running shoes sports' },
    { name: 'Desk Organizer Set', query: 'desk organizer office set' },
    { name: 'LED Desk Lamp', query: 'LED desk lamp study' },
    { name: 'Wall Art Canvas Print', query: 'wall art canvas print' },
    { name: 'Scented Candle Gift Set', query: 'scented candles gift set' },
    { name: 'Travel Journal Leather', query: 'travel journal leather notebook' },
    { name: 'Phone Camera Lens Kit', query: 'phone camera lens kit' },
    { name: 'Portable Phone Charger 10000mAh', query: 'power bank 10000mAh portable charger' },
    { name: 'Resistance Bands Set', query: 'resistance bands fitness set' },
    { name: 'Chess Board Wooden', query: 'chess board wooden set' },
  ];

  let updated = 0;
  let failed = 0;

  for (const item of productsToUpdate) {
    try {
      console.log(`\nSearching Flipkart for: ${item.name}`);
      
      // Search for the product on Flipkart
      const results = await searchFlipkartProducts(item.query, 1, 'popularity');
      
      if (results.products && results.products.length > 0) {
        // Get the first (most popular) product
        const flipkartProduct = results.products[0];
        
        // Find our product in the database
        const allProducts = await storage.getAllGiftProducts();
        const dbProduct = allProducts.find(p => p.name === item.name);
        
        if (dbProduct) {
          // Update with real Flipkart URL and product ID
          await storage.updateGiftProduct(dbProduct.id, {
            flipkartUrl: flipkartProduct.product_url,
            flipkartProductId: flipkartProduct.product_id,
          });
          
          console.log(`✅ Updated: ${item.name}`);
          console.log(`   URL: ${flipkartProduct.product_url}`);
          updated++;
        } else {
          console.log(`⚠️  Product not found in database: ${item.name}`);
          failed++;
        }
      } else {
        console.log(`⚠️  No Flipkart results for: ${item.name}`);
        failed++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error updating ${item.name}:`, error);
      failed++;
    }
  }

  console.log(`\n✅ Successfully updated ${updated} products`);
  console.log(`❌ Failed to update ${failed} products`);
}

// Run the update
updateFlipkartUrls()
  .then(() => {
    console.log('\nUpdate complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });
