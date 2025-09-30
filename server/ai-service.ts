import type { GiftFinderRequest, GiftProduct } from "@shared/schema";

// Rule-based gift recommendations (no external API needed)
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

// Rule-based personalized message generation
export async function generatePersonalizedMessage(
  request: GiftFinderRequest,
  product: GiftProduct,
  reasoning: string
): Promise<string> {
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

// Helper to calculate relevance score
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
