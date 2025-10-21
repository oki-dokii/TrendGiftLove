/**
 * Amazon Product Search Service
 * Uses Real-Time Amazon Data API from RapidAPI
 */

export interface AmazonProduct {
  asin: string;
  title: string;
  price: string;
  originalPrice?: string;
  currency: string;
  rating?: string;
  numRatings: number;
  url: string;
  imageUrl: string;
  isPrime: boolean;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  delivery?: string;
  badge?: string;
}

export interface AmazonSearchResult {
  products: AmazonProduct[];
  totalProducts: number;
  query: string;
}

/**
 * Search for products on Amazon
 */
export async function searchAmazonProducts(
  query: string,
  maxResults: number = 10,
  country: string = 'US'
): Promise<AmazonSearchResult> {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }

  try {
    const url = new URL('https://real-time-amazon-data.p.rapidapi.com/search');
    url.searchParams.append('query', query);
    url.searchParams.append('page', '1');
    url.searchParams.append('country', country);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      throw new Error(`Amazon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.data?.products) {
      throw new Error('Invalid response from Amazon API');
    }

    // Transform API response to our format
    const products: AmazonProduct[] = data.data.products
      .slice(0, maxResults)
      .map((product: any) => ({
        asin: product.asin,
        title: product.product_title,
        price: product.product_price || 'N/A',
        originalPrice: product.product_original_price,
        currency: product.currency || 'USD',
        rating: product.product_star_rating,
        numRatings: product.product_num_ratings || 0,
        url: product.product_url,
        imageUrl: product.product_photo,
        isPrime: product.is_prime || false,
        isBestSeller: product.is_best_seller || false,
        isAmazonChoice: product.is_amazon_choice || false,
        delivery: product.delivery,
        badge: product.product_badge,
      }));

    return {
      products,
      totalProducts: data.data.total_products,
      query: data.parameters.query,
    };
  } catch (error) {
    console.error('Error searching Amazon products:', error);
    throw error;
  }
}

/**
 * Get product details by ASIN
 */
export async function getAmazonProductDetails(
  asin: string,
  country: string = 'US'
): Promise<AmazonProduct | null> {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }

  try {
    const url = new URL('https://real-time-amazon-data.p.rapidapi.com/product-details');
    url.searchParams.append('asin', asin);
    url.searchParams.append('country', country);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      throw new Error(`Amazon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.data) {
      return null;
    }

    const product = data.data;
    return {
      asin: product.asin,
      title: product.product_title,
      price: product.product_price || 'N/A',
      originalPrice: product.product_original_price,
      currency: product.currency || 'USD',
      rating: product.product_star_rating,
      numRatings: product.product_num_ratings || 0,
      url: product.product_url,
      imageUrl: product.product_photo,
      isPrime: product.is_prime || false,
      isBestSeller: product.is_best_seller || false,
      isAmazonChoice: product.is_amazon_choice || false,
      delivery: product.delivery,
      badge: product.product_badge,
    };
  } catch (error) {
    console.error('Error getting Amazon product details:', error);
    return null;
  }
}
