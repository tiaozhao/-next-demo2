import { z } from 'zod';
import type { ILLMInputProduct } from '~/types/subscription-contracts/subscription-recommendation.types';

/**
 * Type definitions for subscription recommendation
 */

/**
 * LLM input product structure for simplified recommendation flow
 * Reuses the application layer type for consistency
 */
export type LLMInputProduct = ILLMInputProduct;

/**
 * Zod schema for final recommendation
 */
export const finalRecommendationSchema = z.object({
  skuId: z.string(),
  reason: z.string(),
  score: z.number() // Score on a scale of 0-10
}).strict();

/**
 * Final recommendation output structure for simplified flow
 */
export interface FinalRecommendation extends z.infer<typeof finalRecommendationSchema> {}

// Type exports
export type FinalRecommendationType = z.infer<typeof finalRecommendationSchema>;