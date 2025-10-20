import type { Request, Response } from "express";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-flipkart-api.p.rapidapi.com';

export interface FlipkartProduct {
  product_id: string;
  title: string;
  current_price: number;
  original_price?: number;
  discount?: number;
  rating?: number;
  reviews_count?: number;
  thumbnail?: string;
  product_url: string;
  availability?: boolean;
  brand?: string;
}

export interface FlipkartSearchResponse {
  total_results?: number;
  current_page?: number;
  query: string;
  products: FlipkartProduct[];
}

/**
 * Search for products on Flipkart using RapidAPI
 */
export async function searchFlipkartProducts(
  query: string,
  page: number = 1,
  sortBy: string = 'popularity'
): Promise<FlipkartSearchResponse> {
  if (!RAPIDAPI_KEY) {
    throw new Error('RapidAPI key not configured');
  }

  try {
    const url = new URL('https://real-time-flipkart-api.p.rapidapi.com/product-search');
    url.searchParams.append('query', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('sort_by', sortBy);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flipkart API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as FlipkartSearchResponse;
  } catch (error) {
    console.error('Error searching Flipkart products:', error);
    throw error;
  }
}

/**
 * Search for gift products on Flipkart based on category keywords
 */
export async function searchGiftProducts(
  category: string,
  interests: string[],
  minPrice?: number,
  maxPrice?: number
): Promise<FlipkartProduct[]> {
  // Build search query from category and interests
  const searchTerms = [category, ...interests.slice(0, 2)].join(' ');
  
  try {
    const results = await searchFlipkartProducts(searchTerms, 1, 'popularity');
    
    let products = results.products || [];
    
    // Filter by price range if specified
    if (minPrice !== undefined || maxPrice !== undefined) {
      products = products.filter(product => {
        const price = product.current_price;
        if (minPrice !== undefined && price < minPrice) return false;
        if (maxPrice !== undefined && price > maxPrice) return false;
        return true;
      });
    }
    
    // Return top products
    return products.slice(0, 10);
  } catch (error) {
    console.error('Error searching gift products:', error);
    // Return empty array on error to allow graceful degradation
    return [];
  }
}

/**
 * Get product categories from Flipkart
 */
export async function getFlipkartCategories(): Promise<any> {
  if (!RAPIDAPI_KEY) {
    throw new Error('RapidAPI key not configured');
  }

  try {
    const response = await fetch('https://real-time-flipkart-api.p.rapidapi.com/get-categories', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`Flipkart API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Flipkart categories:', error);
    throw error;
  }
}
