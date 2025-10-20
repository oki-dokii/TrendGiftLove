import { storage } from './storage';

/**
 * Add Flipkart search URLs to products
 * These URLs will take users directly to Flipkart search results for the product
 */
async function addFlipkartSearchLinks() {
  console.log('Adding Flipkart search links to products...');
  
  // Products with optimized search queries
  const productsToUpdate = [
    { name: 'Water Bottle Insulated 1L', search: 'insulated steel water bottle 1 liter' },
    { name: 'Bluetooth Wireless Headphones', search: 'bluetooth wireless headphones' },
    { name: 'Yoga Mat with Carrying Strap', search: 'yoga mat 6mm with carrying strap' },
    { name: 'Smart Watch Fitness Tracker', search: 'smart watch fitness tracker' },
    { name: 'Kindle E-Reader', search: 'kindle e-reader' },
    { name: 'Premium Notebook Set', search: 'premium diary notebook set leather' },
    { name: 'Wireless Mouse', search: 'wireless mouse computer' },
    { name: 'Bluetooth Portable Speaker', search: 'bluetooth portable speaker waterproof' },
    { name: 'Premium Sports Duffle Bag', search: 'sports gym duffle bag' },
    { name: 'Designer Sunglasses', search: 'designer sunglasses UV protection' },
    { name: 'Cooking Utensils Set', search: 'cooking utensils kitchen tool set' },
    { name: 'Gardening Tool Kit', search: 'gardening tools kit complete set' },
    { name: 'Travel Backpack 40L', search: 'travel backpack 40L hiking trekking' },
    { name: 'Running Shoes', search: 'running shoes sports men women' },
    { name: 'Desk Organizer Set', search: 'desk organizer office accessories' },
    { name: 'LED Desk Lamp', search: 'LED desk lamp study rechargeable' },
    { name: 'Wall Art Canvas Print', search: 'wall art canvas painting home decor' },
    { name: 'Scented Candle Gift Set', search: 'scented candles gift set aromatic' },
    { name: 'Travel Journal Leather', search: 'travel journal leather diary notebook' },
    { name: 'Phone Camera Lens Kit', search: 'mobile phone camera lens kit' },
    { name: 'Portable Phone Charger 10000mAh', search: 'power bank 10000mAh fast charging' },
    { name: 'Resistance Bands Set', search: 'resistance bands exercise fitness set' },
    { name: 'Chess Board Wooden', search: 'wooden chess board premium' },
    { name: 'Sketchbook Art Set', search: 'sketchbook drawing art set pencils' },
    { name: 'Wireless Keyboard', search: 'wireless keyboard bluetooth' },
    { name: 'Coffee Maker', search: 'coffee maker machine automatic' },
    { name: 'Digital Photo Frame', search: 'digital photo frame WiFi' },
    { name: 'Fitness Tracker Band', search: 'fitness tracker smart band' },
    { name: 'Portable Hammock', search: 'portable hammock camping outdoor' },
    { name: 'Insulated Lunch Box', search: 'insulated lunch box steel' },
  ];

  let updated = 0;

  for (const item of productsToUpdate) {
    try {
      // Find product in database
      const allProducts = await storage.getAllGiftProducts();
      const dbProduct = allProducts.find(p => p.name === item.name);
      
      if (dbProduct) {
        // Create Flipkart search URL
        const searchQuery = encodeURIComponent(item.search);
        const flipkartUrl = `https://www.flipkart.com/search?q=${searchQuery}`;
        
        // Update product with Flipkart URL
        await storage.updateGiftProduct(dbProduct.id, {
          flipkartUrl: flipkartUrl,
        });
        
        console.log(`✅ ${item.name}`);
        updated++;
      } else {
        console.log(`⚠️  Product not found: ${item.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${item.name}:`, error);
    }
  }

  console.log(`\n✅ Successfully added Flipkart links to ${updated} products!`);
}

// Run the update
addFlipkartSearchLinks()
  .then(() => {
    console.log('\nAll done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });
