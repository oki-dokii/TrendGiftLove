const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-flipkart-api.p.rapidapi.com';

async function testFlipkartAPI() {
  console.log('Testing Flipkart API...\n');
  
  const url = new URL('https://real-time-flipkart-api.p.rapidapi.com/product-search');
  url.searchParams.append('query', 'bluetooth headphones');
  url.searchParams.append('page', '1');
  url.searchParams.append('sort_by', 'popularity');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    console.log('Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API is working!');
    console.log('Found', data.products?.length || 0, 'products');
    
    if (data.products && data.products.length > 0) {
      const firstProduct = data.products[0];
      console.log('\nExample product:');
      console.log('- Title:', firstProduct.title);
      console.log('- Price:', firstProduct.current_price);
      console.log('- URL:', firstProduct.product_url);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFlipkartAPI();
