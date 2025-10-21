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
  request: GiftFinderRequest
): Promise<AIGeneratedRecommendation[]> {
  const systemPrompt = `You are an expert gift advisor with deep knowledge of personality psychology, relationships, and thoughtful gift-giving. Your task is to analyze the recipient's profile and suggest specific product ideas that would make perfect gifts.

Based on the recipient's profile, generate 4-6 specific product suggestions that can be purchased on Amazon India. For each suggestion:
- Provide a specific search query (2-5 words) that will find the product on Amazon
- Write a compelling 2-3 sentence explanation of why this gift is perfect for them
- Give a relevance score from 1-100
- Specify the product category

Consider:
- The recipient's interests and hobbies
- Their personality traits and style
- The occasion and emotional context
- The relationship between giver and recipient
- The budget constraints
- Age appropriateness

Return suggestions as a JSON array ordered by relevance score (highest first).`;

  const userPrompt = `Recipient Profile:
${request.recipientName ? `Name: ${request.recipientName}` : ""}
${request.recipientAge ? `Age: ${request.recipientAge}` : ""}
Relationship: ${request.relationship}
Interests: ${request.interests.join(", ")}
${request.personality ? `Personality/Style: ${request.personality}` : ""}
Budget: ${request.budget}
Occasion: ${request.occasion}

Generate 4-6 specific product suggestions for gifts available on Amazon India. Return ONLY valid JSON in this exact format:
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
    
    for (const suggestion of suggestions) {
      try {
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
    return generateRuleBasedProductSuggestions(request);
  }
}

/**
 * Rule-based fallback for product suggestions
 */
async function generateRuleBasedProductSuggestions(
  request: GiftFinderRequest
): Promise<AIGeneratedRecommendation[]> {
  // Generate simple product ideas based on interests
  const searchQueries: string[] = [];
  
  // Map interests to product search queries
  const interestMap: Record<string, string[]> = {
    "Technology": ["wireless earbuds", "smart watch", "portable charger"],
    "Reading": ["kindle paperwhite", "book light", "bookends"],
    "Fitness": ["yoga mat", "resistance bands", "water bottle"],
    "Cooking": ["chef knife", "cookbook", "kitchen gadget"],
    "Gaming": ["gaming headset", "game controller", "gaming mouse"],
    "Music": ["bluetooth speaker", "headphones", "music streaming gift card"],
    "Art": ["art supplies", "sketchbook", "painting set"],
    "Travel": ["travel backpack", "luggage tags", "travel pillow"],
    "Fashion": ["wallet", "sunglasses", "watch"],
    "Sports": ["sports equipment", "gym bag", "fitness tracker"],
  };

  // Generate search queries based on interests
  for (const interest of request.interests) {
    const queries = interestMap[interest];
    if (queries) {
      searchQueries.push(...queries.slice(0, 2));
    }
  }

  // If no matches, use generic gift ideas
  if (searchQueries.length === 0) {
    searchQueries.push("gift set", "personalized gift", "luxury gift");
  }

  // Search Amazon for each query
  const recommendations: AIGeneratedRecommendation[] = [];
  const uniqueQueries = [...new Set(searchQueries)].slice(0, 6);

  for (const query of uniqueQueries) {
    try {
      // Search Amazon India for Indian pricing
      const searchResult = await searchAmazonProducts(query, 1, 'IN');
      
      if (searchResult.products.length > 0) {
        recommendations.push({
          amazonProduct: searchResult.products[0],
          aiReasoning: `Great gift for someone interested in ${request.interests.join(", ")}`,
          relevanceScore: 70,
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
