import { db } from "./db";
import { giftProducts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { searchFlipkartProducts } from "./flipkart-service";

/**
 * Utility to enrich gift products with Flipkart links
 * This will search Flipkart for products matching our curated gifts
 * and update them with real product URLs
 */
async function enrichProductsWithFlipkart() {
  console.log("Starting Flipkart enrichment...");
  
  // Get all products without Flipkart links
  const products = await db.select().from(giftProducts);
  const productsToEnrich = products.filter(p => !p.flipkartUrl);
  
  console.log(`Found ${productsToEnrich.length} products to enrich`);
  
  let enriched = 0;
  let failed = 0;
  
  for (const product of productsToEnrich.slice(0, 10)) { // Limit to 10 to avoid rate limits
    try {
      console.log(`\nSearching Flipkart for: ${product.name}`);
      
      // Search Flipkart using product name and category
      const searchQuery = `${product.name} ${product.category}`.trim();
      const results = await searchFlipkartProducts(searchQuery, 1, 'popularity');
      
      if (results.products && results.products.length > 0) {
        // Get the first matching product
        const flipkartProduct = results.products[0];
        
        // Filter by price range if available
        const matchingProduct = results.products.find(p => {
          const price = p.current_price;
          return price >= product.priceMin && price <= product.priceMax;
        }) || flipkartProduct;
        
        // Update the product with Flipkart data
        await db.update(giftProducts)
          .set({
            flipkartProductId: matchingProduct.product_id,
            flipkartUrl: matchingProduct.product_url,
            imageUrl: matchingProduct.thumbnail || product.imageUrl,
          })
          .where(eq(giftProducts.id, product.id));
        
        console.log(`✓ Enriched: ${product.name} -> ${matchingProduct.title}`);
        enriched++;
      } else {
        console.log(`✗ No results for: ${product.name}`);
        failed++;
      }
      
      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error enriching ${product.name}:`, error);
      failed++;
    }
  }
  
  console.log(`\n\nEnrichment complete!`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enrichProductsWithFlipkart()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Enrichment failed:', error);
      process.exit(1);
    });
}

export { enrichProductsWithFlipkart };
