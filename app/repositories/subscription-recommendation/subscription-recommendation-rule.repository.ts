import prisma from '../../db.server';
import { loggerService } from '~/lib/logger';
import type { SubscriptionRecommendationRule } from '@prisma/client';

/**
 * Repository class for managing subscription recommendation rules
 * Handles database operations for recommendation rules including queries and updates
 */
export class SubscriptionRecommendationRuleRepository {
  private readonly CLASS_NAME = 'SubscriptionRecommendationRuleRepository';

  /**
   * Find a subscription recommendation rule by store name and rule key
   * @param storeName - The store identifier
   * @param ruleKey - The unique rule identifier within the store
   * @returns The rule if found, null otherwise
   */
  public async findByStoreAndKey(
    storeName: string,
    ruleKey: string
  ): Promise<SubscriptionRecommendationRule | null> {
    const METHOD = 'findByStoreAndKey';
    try {
      const currentDate = new Date();

      const rule = await prisma.subscriptionRecommendationRule.findFirst({
        where: {
          storeName,
          ruleKey,
          enabled: true,
          AND: [
            {
              OR: [
                { validTo: null },
                { validTo: { gt: currentDate } }
              ]
            },
            {
              OR: [
                { validFrom: null },
                { validFrom: { lte: currentDate } }
              ]
            }
          ]
        },
        orderBy: {
          version: 'desc'
        }
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Rule lookup result`, {
        storeName,
        ruleKey,
        found: !!rule
      });

      return rule;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to find rule`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName,
        ruleKey
      });
      throw error;
    }
  }

  /**
   * Find all active rules for a given store
   * @param storeName - The store identifier
   * @returns Array of active rules sorted by ruleType and priority
   */
  public async findAllRulesByStore(storeName: string): Promise<SubscriptionRecommendationRule[]> {
    const METHOD = 'findAllRulesByStore';
    try {
      const currentDate = new Date();

      const rules = await prisma.subscriptionRecommendationRule.findMany({
        where: {
          storeName,
          enabled: true,
          AND: [
            {
              OR: [
                { validTo: null },
                { validTo: { gt: currentDate } }
              ]
            },
            {
              OR: [
                { validFrom: null },
                { validFrom: { lte: currentDate } }
              ]
            }
          ]
        },
        orderBy: [
          { ruleType: 'asc' },
          { priority: 'desc' },
          { version: 'desc' }
        ]
      });

      // Get latest version of each rule (by ruleKey)
      const latestRules = new Map<string, SubscriptionRecommendationRule>();

      for (const rule of rules) {
        if (!latestRules.has(rule.ruleKey) ||
          latestRules.get(rule.ruleKey)!.version < rule.version) {
          latestRules.set(rule.ruleKey, rule);
        }
      }

      const result = Array.from(latestRules.values());

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found rules for store`, {
        storeName,
        ruleCount: result.length
      });

      return result;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to find rules`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName
      });
      return [];
    }
  }

  /**
   * Transform rule execution score from 0-1 scale to 0-10 scale
   * @param score - Original score in 0-1 range
   * @returns Transformed score in 0-10 range
   */
  public transformRuleScore(score: number): number {
    // Ensure score is within 0-1 range before transforming
    const normalizedScore = Math.max(0, Math.min(1, score));
    // Transform to 0-10 scale and round to 1 decimal place
    return Math.round(normalizedScore * 10 * 10) / 10;
  }

  /**
   * Calculate rank for a collection of rule results based on their scores
   * @param ruleResults - Array of rule results to rank
   * @returns The same rule results with rank added to metadata
   */
  public addRankToRuleResults<T extends { score: number; metadata: Record<string, any> }>(
    ruleResults: T[]
  ): T[] {
    if (!ruleResults || ruleResults.length === 0) {
      return [];
    }

    // Sort by score in descending order
    const sortedResults = [...ruleResults].sort((a, b) => b.score - a.score);

    // Add rank to each result
    return sortedResults.map((result, index) => ({
      ...result,
      metadata: {
        ...result.metadata,
        rank: index + 1
      }
    }));
  }
}

/**
 * Singleton instance of the rule repository
 */
export const subscriptionRecommendationRuleRepository = new SubscriptionRecommendationRuleRepository(); 