const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-flipkart-data2.p.rapidapi.com';

async function testNewFlipkartAPI() {
  console.log('Testing Real-Time Flipkart Data2 API...\n');
  
  // Test 1: Search for products
  try {
    console.log('Testing product search...');
    const searchUrl = new URL('https://real-time-flipkart-data2.p.rapidapi.com/product-search');
    searchUrl.searchParams.append('query', 'bluetooth headphones');
    searchUrl.searchParams.append('page', '1');

    const searchResponse = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    console.log('Search Status:', searchResponse.status);
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      console.log('✅ Search works!');
      console.log('Found', data.products?.length || 0, 'products\n');
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0];
        console.log('Example product:');
        console.log('- Title:', product.title);
        console.log('- Price:', product.current_price);
        console.log('- PID:', product.pid);
        console.log('- URL:', product.product_url);
      }
    } else {
      const errorText = await searchResponse.text();
      console.log('Search error:', errorText);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

testNewFlipkartAPI();
