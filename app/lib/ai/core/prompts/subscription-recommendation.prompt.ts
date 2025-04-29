
import type { LLMInputProduct } from '../types/subscription-recommendation/recommendation.types';

/**
 * Subscription recommendation prompts
 * Contains templates for generating LLM prompts for B2B subscription recommendations
 */


/**
 * Generates a prompt for product recommendations
 *
 * @param products List of products to be evaluated
 * @returns Prompt text for LLM
 */
export function getRecommendationPrompt(products: LLMInputProduct[]): string {
  // Collect all unique rule prompts across all products
  const allRulePrompts = new Set<string>();
  products.forEach(p => {
    if ((p as any).rulePrompts && Array.isArray((p as any).rulePrompts)) {
      (p as any).rulePrompts.forEach((prompt: string) => allRulePrompts.add(prompt));
    }
  });

  // Create a summary of all rule prompts
  const ruleGuidanceSection = allRulePrompts.size > 0 ?
    `RULE-SPECIFIC GUIDANCE:
${Array.from(allRulePrompts).map((prompt, index) => `${index + 1}. ${prompt}`).join('\n')}

` : '';

  return `
You are a trusted B2B sales advisor helping businesses make smarter procurement decisions. Create diverse, value-focused subscription recommendations.

${ruleGuidanceSection}PRODUCTS:
${formatProductsForPrompt(products)}

CRITICAL: Do NOT include specific percentages or dollar amounts in recommendations, as you don't have verified pricing data.

IMPORTANT: You MUST follow the Rule-Specific Guidance provided above. These are specialized instructions from business rules that should take precedence over general guidelines.

REQUIREMENTS:
1. Each recommendation reason MUST BE 45 CHARACTERS OR LESS (absolute maximum)
2. NEVER repeat similar reasons across different products
3. Each reason MUST indicate value WITHOUT SPECIFIC NUMBERS:
   - Use "Save with bulk pricing" (not "Save 15%")
   - Use "Reduce inventory costs" (not "Reduce costs by 20%")
   - Use "Avoid rush delivery fees" (not "Avoid $300+ fees")
4. Vary your recommendation openers - use diverse benefit statements
5. Ensure natural language flow - avoid choppy phrases

EXCELLENT EXAMPLES:
- "Save plus get priority during shortages"
- "Cut paperwork with automatic reordering"
- "Avoid rush fees with planned deliveries"
- "Finish projects faster with reliable stock"
- "Lock in prices against future increases"
- "Eliminate emergency ordering hassles"
- "Reduce inventory costs with auto-delivery"
- "Convert storage space to productive use"

BAD EXAMPLES (avoid these patterns):
- "Save 15% with subscription" (uses unverified percentage)
- "Avoid $250+ in emergency fees" (uses unverified amount)
- "Always have X in stock" (vague, lacks specific value)
- "Streamline X procurement" (vague, lacks specific value)

Provide recommendations in this JSON format:
[
  {
    "skuId": "PRODUCT_SKU",
    "reason": "Value-focused reason without specific numbers",
    "score": 8.5  // Scale of 0-10
  }
]

FINAL CHECK: Verify that NO recommendation includes specific percentages or dollar amounts.
`;
}

/**
 * Formats product data for prompt
 */
function formatProductsForPrompt(products: LLMInputProduct[]): string {
  return products.map(p => `
SKU: ${p.skuId}
Title: ${p.title}
Description: ${p.description}
${p.category ? `Category: ${p.category}` : ''}
${p.inventoryQuantity !== undefined ? `Inventory Quantity: ${p.inventoryQuantity}` : ''}

Customer Context:
- In Wishlist: ${p.isInWishlist ? 'Yes' : 'No'}
- Already Subscribed: ${p.isSubscribed ? 'Yes' : 'No'}
- Top Selling Product: ${p.isTopSelling ? 'Yes' : 'No'}
- Shopify Recommended: ${p.isShopifyRecommendation ? 'Yes' : 'No'}
- Previous Orders: ${p.orderCount || 0}
- Total Quantity Ordered: ${p.totalQuantity || 0}
${p.lastOrderDate ? `- Last Ordered: ${p.lastOrderDate}` : ''}
${p.subscriptionFrequency ? `- Current Subscription Frequency: ${p.subscriptionFrequency}` : ''}
${p.nextDeliveryDate ? `- Next Delivery Date: ${p.nextDeliveryDate}` : ''}

Rule Evaluation:
- Score: ${p.score}
- Matched Rules: ${p.matchedRules.join(', ')}
`).join('\n---\n');
}