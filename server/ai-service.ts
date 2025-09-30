import OpenAI from "openai";
import type { GiftFinderRequest, GiftProduct } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI prompt for generating gift recommendations
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error generating gift recommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

// AI prompt for generating personalized messages
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const message = completion.choices[0]?.message?.content?.trim();
    if (!message) {
      throw new Error("No message generated");
    }

    return message;
  } catch (error) {
    console.error("Error generating personalized message:", error);
    throw new Error("Failed to generate message");
  }
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
    free: { min: 0, max: 0 },
    low: { min: 1, max: 500 },
    medium: { min: 500, max: 2000 },
    high: { min: 2000, max: 5000 },
    premium: { min: 5000, max: 1000000 },
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
