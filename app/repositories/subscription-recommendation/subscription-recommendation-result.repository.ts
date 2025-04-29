import { prisma } from '~/lib/prisma.server';
import { loggerService } from '~/lib/logger';
import type {
  IRuleExecutionResults,
  IProductInfo
} from '~/types/subscription-contracts/subscription-recommendation.types';

/**
 * Repository for managing subscription recommendation result cache
 * Handles database operations for storing and retrieving recommendation results
 */
export class SubscriptionRecommendationResultRepository {
  private readonly CLASS_NAME = 'SubscriptionRecommendationResultRepository';

  /**
   * Save recommendation results to the cache
   * @param params Cache entry parameters
   * @returns The created cache entry or null if recommendations are empty
   */
  public async saveResults(params: any) {
    const METHOD = 'saveResults';
    try {
      const {
        storeName,
        customerId,
        companyLocationId,
        ruleResults,
        llmOutput,
        finalRecommendations,
        version = 'v1',
      } = params;

      // Safety check - don't cache empty recommendation results
      if (!finalRecommendations || !Array.isArray(finalRecommendations) || finalRecommendations.length === 0) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Refusing to cache empty recommendations`, {
          storeName,
          customerId
        });
        return null;
      }

      // Create or update the cache entry
      const result = await prisma.subscriptionRecommendationResult.upsert({
        where: {
          storeName_customerId_companyLocationId_version: {
            storeName,
            customerId,
            companyLocationId,
            version
          }
        },
        update: {
          ruleResults: ruleResults as any,
          llmOutput: llmOutput || null,
          finalRecommendations: finalRecommendations as any,
          updatedAt: new Date()
        },
        create: {
          storeName,
          customerId,
          companyLocationId,
          ruleResults: ruleResults as any,
          llmOutput: llmOutput || null,
          finalRecommendations: finalRecommendations as any,
          version,
          expiresAt: new Date(2099, 12, 30) // Set a far-future expiration date
        }
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Saved recommendation results with ${finalRecommendations.length} items`, {
        storeName,
        customerId,
        cacheId: result.id.toString(),
        expiresAt: new Date(2099, 12, 30),
        version
      });

      return result;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to save recommendation results`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          storeName: params.storeName,
          customerId: params.customerId,
          companyLocationId: params.companyLocationId,
          version: params.version
        }
      });
      throw error;
    }
  }

  /**
   * Get cached recommendation results
   * @param params Cache lookup parameters
   * @returns Cached results if found and valid, null otherwise
   */
  public async getResults(params: {
    storeName: string;
    customerId: string;
    companyLocationId: string;
    version?: string;
  }): Promise<{
    ruleResults: IRuleExecutionResults;
    llmOutput?: any;
    finalRecommendations: IProductInfo[];
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const METHOD = 'getResults';
    const { storeName, customerId, companyLocationId, version = 'v1' } = params;

    try {
      // Get the most recent cached entry for this customer and store
      // Simple query only using storeName, customerId, and companyLocationId to match front-end
      const result = await prisma.subscriptionRecommendationResult.findFirst({
        where: {
          storeName,
          customerId,
          companyLocationId,
          version, // Default version is 'v1' if not provided
          expiresAt: {
            gt: new Date() // Only if not manually expired
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (!result) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: No valid cache entry found`, {
          storeName,
          customerId,
          companyLocationId
        });
        return null;
      }

      // Check if the cached recommendations are empty - return null if they are
      const recommendationsArray = result.finalRecommendations as unknown as IProductInfo[];
      if (!recommendationsArray || !Array.isArray(recommendationsArray) || recommendationsArray.length === 0) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: Found cache entry with empty recommendations, ignoring it`, {
          storeName,
          customerId,
          cacheId: result.id.toString(),
          createdAt: result.createdAt
        });

        // Invalidate this cache entry to prevent future hits
        await this.invalidateResults({
          storeName,
          customerId,
          companyLocationId,
          version
        });

        return null;
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Retrieved cached recommendation results`, {
        storeName,
        customerId,
        cacheId: result.id.toString(),
        finalRecommendationsCount: recommendationsArray.length,
        createdAt: result.createdAt,
        cacheAge: Math.round((Date.now() - result.createdAt.getTime()) / (1000 * 60)) + ' minutes'
      });

      return {
        ruleResults: result.ruleResults as unknown as IRuleExecutionResults,
        llmOutput: result.llmOutput,
        finalRecommendations: recommendationsArray,
        metadata: result.metadata || { cacheHit: true, generatedAt: result.createdAt.toISOString() },
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to get recommendation results`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          storeName,
          customerId,
          companyLocationId
        }
      });
      return null; // Return null on error for graceful fallback
    }
  }

  /**
   * Invalidate cached results for a customer
   * @param params Cache invalidation parameters
   * @returns True if cache was invalidated, false otherwise
   */
  public async invalidateResults(params: {
    storeName: string;
    customerId: string;
    companyLocationId: string;
    version?: string;
  }): Promise<boolean> {
    const METHOD = 'invalidateResults';
    const { storeName, customerId, companyLocationId, version } = params;

    try {
      const whereCondition = {
        storeName,
        customerId,
        companyLocationId,
        ...(version ? { version } : {}) // Only include version if provided
      };

      const result = await prisma.subscriptionRecommendationResult.updateMany({
        where: whereCondition,
        data: {
          expiresAt: new Date() // Set expiration to now (invalidate)
        }
      });

      const success = result.count > 0;
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: ${success ? 'Invalidated' : 'No'} cache entries`, {
        storeName,
        customerId,
        companyLocationId,
        version,
        entriesAffected: result.count
      });

      return success;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to invalidate recommendation results`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: {
          storeName,
          customerId,
          companyLocationId,
          version
        }
      });
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   * @param maxAgeDays Maximum age in days for entries to clean up
   * @returns Number of removed entries
   */
  public async cleanupOldResults(maxAgeDays = 30): Promise<number> {
    const METHOD = 'cleanupOldResults';
    try {
      // Calculate cutoff date (entries older than this will be deleted)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      // Delete old entries regardless of expiration status
      const result = await prisma.subscriptionRecommendationResult.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate // Older than max age
          }
        }
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Cleaned up old recommendation results`, {
        entriesRemoved: result.count,
        maxAgeDays,
        cutoffDate
      });

      return result.count;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Failed to clean up old recommendation results`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        maxAgeDays
      });
      return 0;
    }
  }
}

/**
 * Singleton instance of the recommendation result repository
 */
export const subscriptionRecommendationResultRepository = new SubscriptionRecommendationResultRepository(); 