import { GoogleGenAI } from "@google/genai";
import type { GiftFinderRequest, GiftProduct } from "@shared/schema";
import { searchAmazonProducts, type AmazonProduct } from "./amazon-service";

// DON'T DELETE THIS COMMENT
// Using Gemini 2.5 Flash for gift recommendations
// Blueprint reference: javascript_gemini

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export interface AIProductSuggestion {
  searchQuery: string;
  reasoning: string;
  relevanceScore: number;
  category: string;
}

export interface AIGeneratedRecommendation {
  amazonProduct: AmazonProduct;
  aiReasoning: string;
  relevanceScore: number;
}

/**
 * NEW AI APPROACH: Generate product suggestions and search Amazon
 * This replaces the curated dataset approach with unlimited real products
 */
export async function generateAIProductSuggestions(
  request: GiftFinderRequest,
  excludeProductNames: string[] = []
): Promise<AIGeneratedRecommendation[]> {
  const systemPrompt = `You are an expert gift advisor. Your PRIMARY goal is to understand the EXACT interests and needs the user expresses and suggest ONLY products that directly relate to those specific interests.

CRITICAL RULES:
1. READ THE USER'S INTERESTS CAREFULLY - If they say "cricket", recommend ONLY cricket-related products (cricket bat, cricket ball, cricket gloves, cricket helmet, cricket shoes, etc.)
2. DO NOT map interests to broad categories - "cricket" should NOT give "sports equipment", it should give cricket-specific items
3. DO NOT show random products from a category - be laser-focused on what they actually want
4. If they mention a specific sport (cricket, football, tennis, etc.), ALL 6-8 suggestions MUST be for that exact sport
5. If they mention multiple interests, distribute suggestions across those specific interests

Based on the recipient's profile, generate 10-12 HIGHLY SPECIFIC product suggestions available on Amazon India (more products ensure continuous loading):

SEARCH QUERY RULES:
- Include the EXACT interest keyword in the search query
- Examples for CRICKET: "cricket bat leather grip", "cricket helmet with face guard", "cricket ball leather pack", "cricket gloves batting", "cricket shoes spikes", "cricket practice net", "cricket kit bag", "cricket stumps set"
- Examples for FOOTBALL: "football nike size 5", "football shoes studs", "football goalkeeper gloves", "football training cones", "football jersey"  
- Examples for PHOTOGRAPHY: "camera tripod dslr", "camera lens cleaning kit", "camera memory card 128gb", "camera lens filter uv"
- Examples for COOKING: "chef knife set stainless steel", "non stick pan set", "silicone spatula set", "measuring cups spoons"

For each suggestion provide:
- searchQuery: 3-6 words with the EXACT interest keyword (e.g., "cricket batting gloves" NOT "sports gloves")
- reasoning: Why this specific item is perfect for someone who loves [exact interest]
- relevanceScore: 1-100 based on direct match to their stated interest
- category: The specific interest category (e.g., "Cricket Equipment" not "Sports")

Return suggestions as JSON array ordered by relevance score (highest first).`;

  const excludeSection = excludeProductNames.length > 0 
    ? `\n\nIMPORTANT: These products have already been suggested. Generate DIFFERENT suggestions and avoid similar products:
${excludeProductNames.map(name => `- ${name}`).join('\n')}`
    : '';

  const userPrompt = `Recipient Profile:
${request.recipientName ? `Name: ${request.recipientName}` : ""}
${request.recipientAge ? `Age: ${request.recipientAge}` : ""}
Relationship: ${request.relationship}
Interests: ${request.interests.join(", ")}
${request.personality ? `Personality/Style: ${request.personality}` : ""}
Budget: ${request.budget}
Occasion: ${request.occasion}${excludeSection}

Generate 10-12 HIGHLY SPECIFIC product suggestions for gifts available on Amazon India. Focus on the EXACT interests mentioned (e.g., if Cricket is mentioned, ALL suggestions should be cricket-specific products). ${excludeProductNames.length > 0 ? 'Suggest NEW and DIFFERENT products than the ones listed above.' : ''} Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "searchQuery": "wireless noise cancelling headphones",
      "reasoning": "why this gift is perfect for them based on their interests and personality",
      "relevanceScore": 95,
      "category": "Electronics"
    }
  ]
}`;

  try {
    // Add timeout to prevent hanging - increased to 30 seconds for better reliability
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), 30000);
    });

    const apiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  searchQuery: { type: "string" },
                  reasoning: { type: "string" },
                  relevanceScore: { type: "number" },
                  category: { type: "string" }
                },
                required: ["searchQuery", "reasoning", "relevanceScore", "category"]
              }
            }
          },
          required: ["suggestions"]
        }
      },
      contents: userPrompt,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]) as any;
    const content = response.text;
    
    if (!content) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(content);
    const suggestions: AIProductSuggestion[] = result.suggestions || [];

    // Search Amazon for each AI suggestion
    const recommendations: AIGeneratedRecommendation[] = [];
    
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      try {
        // Add delay between API calls to avoid rate limiting (except for first call)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
        
        // Search Amazon India first for Indian pricing, fallback to US
        const searchResult = await searchAmazonProducts(suggestion.searchQuery, 3, 'IN');
        
        // Take the top result and combine with AI reasoning
        if (searchResult.products.length > 0) {
          const topProduct = searchResult.products[0];
          recommendations.push({
            amazonProduct: topProduct,
            aiReasoning: suggestion.reasoning,
            relevanceScore: suggestion.relevanceScore,
          });
        }
      } catch (error) {
        console.error(`Error searching Amazon for "${suggestion.searchQuery}":`, error);
        // Continue with other suggestions
      }
    }

    return recommendations;
  } catch (error) {
    console.error("Error generating AI product suggestions:", error);
    console.log("Falling back to rule-based product suggestions");
    
    // Fallback to rule-based suggestions
    return generateRuleBasedProductSuggestions(request, excludeProductNames);
  }
}

/**
 * Rule-based fallback for product suggestions
 */
async function generateRuleBasedProductSuggestions(
  request: GiftFinderRequest,
  excludeProductNames: string[] = []
): Promise<AIGeneratedRecommendation[]> {
  // Generate simple product ideas based on interests
  const searchQueries: string[] = [];
  
  // Map interests to SPECIFIC product search queries - ALWAYS include the interest keyword
  const interestMap: Record<string, string[]> = {
    "Technology": ["wireless noise cancelling earbuds", "smart fitness watch", "fast charging power bank", "phone camera lens kit"],
    "Reading": ["kindle paperwhite waterproof", "led book reading light", "decorative metal bookends", "book lover gift set"],
    "Fitness": ["non slip yoga mat", "resistance bands workout set", "insulated gym water bottle", "foam roller massage"],
    "Cooking": ["professional chef knife set", "indian cooking cookbook", "multi purpose kitchen gadget", "silicone baking mat"],
    "Gaming": ["rgb gaming headset", "wireless game controller", "ergonomic gaming mouse", "gaming mouse pad large"],
    "Music": ["portable bluetooth speaker waterproof", "over ear headphones wireless", "spotify gift card india"],
    "Art": ["professional art supplies set", "spiral bound sketchbook", "acrylic painting set canvas", "artist brush set"],
    "Travel": ["anti theft travel backpack", "personalized luggage tags", "memory foam travel pillow", "travel organizer bag"],
    "Fashion": ["genuine leather wallet", "polarized uv sunglasses", "stainless steel watch", "fashion jewelry gift"],
    "Sports": ["badminton racket set", "gym duffle bag waterproof", "smart fitness tracker band"],
    "Cricket": ["cricket bat leather grip", "cricket ball leather pack", "cricket helmet face guard", "cricket gloves batting", "cricket shoes spikes", "cricket practice net", "cricket kit bag", "cricket stumps set"],
    "Football": ["football nike size 5", "football shoes studs", "football goalkeeper gloves", "football training cones", "football jersey original"],
    "Tennis": ["tennis racket wilson", "tennis ball pack", "tennis shoes court", "tennis bag backpack"],
    "Badminton": ["badminton racket yonex", "badminton shuttlecock feather", "badminton shoes court", "badminton net portable"],
    "Basketball": ["basketball spalding official", "basketball shoes nike", "basketball hoop portable", "basketball jersey"],
    "Dancing": ["dance practice mat portable", "dance shoes for women", "wireless bluetooth dance speaker", "dancewear accessories"],
    "Photography": ["camera lens filter kit", "camera tripod dslr", "camera lens cleaning kit", "camera memory card 128gb"],
    "Writing": ["fountain pen gift set", "leather journal notebook", "creative writing book", "calligraphy pen set"],
    "Gardening": ["gardening tools set", "indoor herb garden kit", "plant pot decorative", "gardening gloves"],
  };

  // Generate search queries based on interests - get MORE queries for continuous loading
  for (const interest of request.interests) {
    const queries = interestMap[interest];
    if (queries) {
      // Take MORE queries per interest to ensure enough products
      searchQueries.push(...queries.slice(0, 4));
    }
  }

  // If no matches, use generic gift ideas
  if (searchQueries.length === 0) {
    searchQueries.push("gift set", "personalized gift", "luxury gift", "unique gift items", "premium gift box");
  }

  // Search Amazon for each query - increased from 6 to 10 for continuous loading
  const recommendations: AIGeneratedRecommendation[] = [];
  const uniqueQueries = Array.from(new Set(searchQueries)).slice(0, 10);

  for (let i = 0; i < uniqueQueries.length; i++) {
    const query = uniqueQueries[i];
    try {
      // Add delay between API calls to avoid rate limiting (except for first call)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
      
      // Search Amazon India for Indian pricing - get more results to filter from
      const searchResult = await searchAmazonProducts(query, 5, 'IN');
      
      // Filter out already shown products
      const newProducts = searchResult.products.filter(
        product => !excludeProductNames.some(excluded => 
          product.title.toLowerCase().includes(excluded.toLowerCase()) ||
          excluded.toLowerCase().includes(product.title.toLowerCase())
        )
      );
      
      if (newProducts.length > 0) {
        const product = newProducts[0];
        // Generate unique reasoning based on product and recipient profile
        const reasoningTemplates = [
          `Perfect for ${request.relationship === 'romantic partner' ? 'your partner' : `a ${request.relationship}`} who loves ${request.interests[0] || 'exploring new things'}. ${product.title.split(' ').slice(0, 3).join(' ')} makes an excellent ${request.occasion} gift.`,
          `This ${product.title.toLowerCase().includes('premium') || product.title.toLowerCase().includes('luxury') ? 'premium' : 'thoughtful'} choice aligns perfectly with their ${request.interests.slice(0, 2).join(' and ')} interests${request.personality ? `, especially for someone with a ${request.personality.toLowerCase()} personality` : ''}.`,
          `Ideal for someone passionate about ${request.interests[Math.floor(Math.random() * request.interests.length)] || 'quality gifts'}. ${product.isPrime ? 'Fast delivery with Prime ensures it arrives in time.' : 'A well-rated choice that shows you care.'}`,
          `A standout gift that combines practicality with thoughtfulness for ${request.occasion === 'Just Because' ? 'any occasion' : request.occasion.toLowerCase()}. Perfect match for their ${request.interests.join(', ')} lifestyle.`,
        ];
        
        const reasoningIndex = (product.title.charCodeAt(0) + i) % reasoningTemplates.length;
        
        recommendations.push({
          amazonProduct: product,
          aiReasoning: reasoningTemplates[reasoningIndex],
          relevanceScore: 70 + (product.isPrime ? 5 : 0) + (product.isBestSeller ? 5 : 0),
        });
      }
    } catch (error) {
      console.error(`Error searching Amazon for "${query}":`, error);
    }
  }

  return recommendations;
}

// AI-powered gift recommendations using Gemini
export async function generateGiftRecommendations(
  request: GiftFinderRequest,
  availableProducts: GiftProduct[]
): Promise<{
  recommendations: Array<{
    productId: string;
    reasoning: string;
    relevanceScore: number;
  }>;
}> {
  const systemPrompt = `You are an expert gift advisor with deep knowledge of personality psychology, relationships, and thoughtful gift-giving. Your task is to analyze the recipient's profile and recommend the most suitable gifts from the available product catalog.

Consider:
- The recipient's interests and hobbies
- Their personality traits and style
- The occasion and emotional context
- The relationship between giver and recipient
- The budget constraints
- Age appropriateness

Return recommendations as a JSON array with each item containing:
- productId: the exact ID from the provided products
- reasoning: a compelling 2-3 sentence explanation of why this gift is perfect (personalize it to their specific interests and personality)
- relevanceScore: a number from 1-100 indicating how well this gift matches

Order recommendations by relevance score (highest first). Provide 5-8 recommendations if enough suitable products exist.`;

  const userPrompt = `Recipient Profile:
${request.recipientName ? `Name: ${request.recipientName}` : ""}
${request.recipientAge ? `Age: ${request.recipientAge}` : ""}
Relationship: ${request.relationship}
Interests: ${request.interests.join(", ")}
${request.personality ? `Personality/Style: ${request.personality}` : ""}
Budget: ${request.budget}
Occasion: ${request.occasion}

Available Products (JSON):
${JSON.stringify(availableProducts, null, 2)}

Analyze this profile and recommend the best matching products. Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "productId": "exact-product-id-from-catalog",
      "reasoning": "why this gift is perfect for them",
      "relevanceScore": 95
    }
  ]
}`;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), 15000);
    });

    const apiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  reasoning: { type: "string" },
                  relevanceScore: { type: "number" }
                },
                required: ["productId", "reasoning", "relevanceScore"]
              }
            }
          },
          required: ["recommendations"]
        }
      },
      contents: userPrompt,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]) as any;

    const content = response.text;
    if (!content) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error generating gift recommendations with Gemini:", error);
    console.log("Falling back to rule-based recommendations");
    
    // Fallback to rule-based system
    return generateRuleBasedRecommendations(request, availableProducts);
  }
}

// Rule-based fallback for recommendations
function generateRuleBasedRecommendations(
  request: GiftFinderRequest,
  availableProducts: GiftProduct[]
): {
  recommendations: Array<{
    productId: string;
    reasoning: string;
    relevanceScore: number;
  }>;
} {
  // Score and rank all products
  const scoredProducts = availableProducts.map(product => ({
    product,
    score: calculateRelevanceScore(request, product),
    reasoning: generateReasoning(request, product)
  }));

  // Sort by score and take top recommendations
  const recommendations = scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(item => ({
      productId: item.product.id,
      reasoning: item.reasoning,
      relevanceScore: item.score
    }));

  return { recommendations };
}

// Helper to generate reasoning
function generateReasoning(
  request: GiftFinderRequest,
  product: GiftProduct
): string {
  const parts: string[] = [];
  
  // Check interest matches
  const matchingInterests = request.interests.filter(interest =>
    product.interests.includes(interest)
  );
  
  if (matchingInterests.length > 0) {
    parts.push(`Perfect for someone who loves ${matchingInterests.join(" and ")}`);
  }
  
  // Check occasion match
  if (product.occasions.includes(request.occasion)) {
    parts.push(`ideal for ${request.occasion}`);
  }
  
  // Check relationship
  if (product.relationship && product.relationship.includes(request.relationship)) {
    parts.push(`great gift for your ${request.relationship}`);
  }
  
  // Add price context
  const priceRange = product.priceMin === product.priceMax 
    ? `₹${product.priceMin}`
    : `₹${product.priceMin}-₹${product.priceMax}`;
  parts.push(`fits your budget at ${priceRange}`);
  
  return parts.join(", ") + ".";
}

// AI-powered personalized message generation using Gemini
export async function generatePersonalizedMessage(
  request: GiftFinderRequest,
  product: GiftProduct,
  reasoning: string
): Promise<string> {
  const systemPrompt = `You are a creative writer specializing in heartfelt, personalized gift messages. Create warm, thoughtful messages that make the recipient feel special and show that the gift was chosen with care.

The message should:
- Be 2-4 sentences long
- Reference why this specific gift was chosen for them
- Incorporate their interests or personality naturally
- Match the occasion's tone (celebratory, thoughtful, fun, etc.)
- Feel personal and genuine, not generic

Do NOT include greetings like "Dear [name]" or signatures - just the message body.`;

  const userPrompt = `Create a personalized message for this gift:

Recipient: ${request.recipientName || "your special someone"}
${request.recipientAge ? `Age: ${request.recipientAge}` : ""}
Relationship: ${request.relationship}
Interests: ${request.interests.join(", ")}
${request.personality ? `Personality: ${request.personality}` : ""}
Occasion: ${request.occasion}

Gift: ${product.name}
Why this gift: ${reasoning}

Write a warm, personalized message (2-4 sentences, message body only):`;

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), 10000);
    });

    const apiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
      contents: userPrompt,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]) as any;

    const message = response.text?.trim();
    if (!message) {
      throw new Error("No message generated");
    }

    return message;
  } catch (error) {
    console.error("Error generating personalized message with Gemini:", error);
    console.log("Falling back to template-based message");
    
    // Fallback to template-based message
    return generateTemplateMessage(request, product, reasoning);
  }
}

// Template-based message fallback
function generateTemplateMessage(
  request: GiftFinderRequest,
  product: GiftProduct,
  reasoning: string
): string {
  const recipientName = request.recipientName || "them";
  const occasion = request.occasion.toLowerCase();
  const interests = request.interests.slice(0, 2).join(" and ");
  
  // Template-based message generation
  const templates = [
    `I chose this ${product.name} because I know how much you love ${interests}. ${reasoning} Hope this makes your ${occasion} extra special!`,
    `This ${product.name} reminded me of you and your passion for ${interests}. ${reasoning} Wishing you a wonderful ${occasion}!`,
    `Knowing your interest in ${interests}, I thought this ${product.name} would be perfect for you. ${reasoning} Enjoy your special ${occasion}!`,
    `I found this ${product.name} and immediately thought of ${recipientName}. ${reasoning} Have an amazing ${occasion}!`
  ];

  // Select a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return template;
}

// Helper to calculate relevance score for fallback scenarios
export function calculateRelevanceScore(
  request: GiftFinderRequest,
  product: GiftProduct
): number {
  let score = 0;

  // Interest matching (40 points max)
  const matchingInterests = request.interests.filter(interest =>
    product.interests.includes(interest)
  );
  score += (matchingInterests.length / Math.max(request.interests.length, 1)) * 40;

  // Occasion matching (20 points max)
  if (product.occasions.includes(request.occasion)) {
    score += 20;
  }

  // Relationship matching (20 points max)
  if (product.relationship && product.relationship.includes(request.relationship)) {
    score += 20;
  }

  // Budget matching (20 points max)
  const budgetMap: Record<string, { min: number; max: number }> = {
    "Under ₹500": { min: 0, max: 500 },
    "₹500 - ₹2000": { min: 500, max: 2000 },
    "₹2000 - ₹5000": { min: 2000, max: 5000 },
    "₹5000 - ₹10000": { min: 5000, max: 10000 },
    "₹10000+": { min: 10000, max: 1000000 },
  };

  const budgetRange = budgetMap[request.budget];
  if (budgetRange) {
    if (product.priceMin >= budgetRange.min && product.priceMax <= budgetRange.max) {
      score += 20;
    } else if (
      (product.priceMin <= budgetRange.max && product.priceMax >= budgetRange.min)
    ) {
      score += 10; // Partial match
    }
  }

  return Math.round(score);
}
