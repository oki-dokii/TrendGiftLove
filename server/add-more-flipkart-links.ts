import { storage } from './storage';

/**
 * Add Flipkart search URLs to more products using correct database names
 */
async function addMoreFlipkartLinks() {
  console.log('Adding Flipkart search links to products...\n');
  
  const productsToUpdate = [
    // Technology
    { name: 'Laptop Cooling Pad', search: 'laptop cooling pad gaming' },
    { name: 'External SSD 1TB', search: 'external SSD 1TB portable' },
    { name: 'Bluetooth Adapter USB', search: 'bluetooth USB adapter dongle' },
    { name: 'Cable Organizer Set', search: 'cable organizer management set' },
    { name: 'LED Desk Lamp with USB Charging', search: 'LED desk lamp USB charging' },
    { name: 'Book Light Reading Lamp', search: 'book reading light clip LED' },
    
    // Sports & Fitness
    { name: 'Football/Soccer Ball', search: 'football soccer ball professional' },
    { name: 'Hiking Boots Professional', search: 'hiking boots trekking waterproof' },
    { name: 'Backpack Laptop Stylish', search: 'laptop backpack stylish office' },
    
    // Fashion & Accessories
    { name: 'Leather Wallet Premium', search: 'leather wallet men premium' },
    { name: 'Belt Leather Reversible', search: 'leather belt reversible men' },
    { name: 'Gloves Leather Winter', search: 'leather gloves winter warm' },
    { name: 'Hat Fedora Classic', search: 'fedora hat classic men' },
    { name: 'Bracelet Charm Personalized', search: 'charm bracelet personalized women' },
    { name: 'Cufflinks Designer Set', search: 'designer cufflinks men formal' },
    { name: 'Designer Handbag Leather', search: 'designer handbag leather women' },
    { name: 'Jewelry Earrings Sterling Silver', search: 'sterling silver earrings women' },
    { name: 'Perfume Gift Set Luxury', search: 'perfume gift set luxury men women' },
    
    // Home & Living
    { name: 'Home Theater Sound System', search: 'home theater system 5.1 surround sound' },
    { name: 'Bath Bombs Gift Set Luxury', search: 'bath bombs gift set spa' },
    { name: 'Jewelry Box Organizer', search: 'jewelry box organizer storage' },
    
    // Books & Journals
    { name: 'Leather Journal Handmade', search: 'leather journal handmade diary' },
    { name: 'Pen Set Luxury Writing', search: 'luxury pen set fountain ballpoint' },
    { name: 'Bestselling Fiction Novel Set', search: 'bestselling fiction books bundle' },
    { name: 'Cookbook Vegetarian Recipes', search: 'vegetarian cookbook recipes healthy' },
    { name: 'Mystery Thriller Book Bundle', search: 'mystery thriller books collection' },
    { name: 'Coffee Table Art Book', search: 'coffee table book art photography' },
    { name: 'Biography Collection Famous Personalities', search: 'biography books famous personalities' },
    { name: 'Gardening Book Encyclopedia', search: 'gardening encyclopedia book complete guide' },
    { name: 'Graphic Novel Collection', search: 'graphic novel collection comics' },
    { name: 'Comic Book Collectible Edition', search: 'comic book collectible limited edition' },
    { name: "Children's Book Collection", search: 'children books collection storybooks' },
    { name: 'Business Strategy Books Set', search: 'business strategy books management' },
    { name: 'Bartending Recipe Book', search: 'bartending recipe book cocktails' },
    
    // Premium Items
    { name: 'Leather Messenger Bag', search: 'leather messenger bag men laptop' },
    { name: 'Diamond Jewelry Ring', search: 'diamond ring women gold' },
  ];

  let updated = 0;

  for (const item of productsToUpdate) {
    try {
      const allProducts = await storage.getAllGiftProducts();
      const dbProduct = allProducts.find(p => p.name === item.name);
      
      if (dbProduct) {
        const searchQuery = encodeURIComponent(item.search);
        const flipkartUrl = `https://www.flipkart.com/search?q=${searchQuery}`;
        
        await storage.updateGiftProduct(dbProduct.id, {
          flipkartUrl: flipkartUrl,
        });
        
        console.log(`✅ ${item.name}`);
        updated++;
      } else {
        console.log(`⚠️  Not found: ${item.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${item.name}`, error);
    }
  }

  console.log(`\n🎉 Successfully added Flipkart links to ${updated} products!`);
}

addMoreFlipkartLinks()
  .then(() => {
    console.log('\nComplete!');
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
