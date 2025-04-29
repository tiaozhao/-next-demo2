import prisma from '../../db.server';
import { loggerService } from '../../lib/logger';
import { type StoreFeatureRequest } from '../../types/store/store-feature.schema';

/**
 * Repository for store feature configuration operations
 */
export class StoreFeatureRepository {
  /**
   * Get feature configuration for a store
   * @param params Request parameters containing storeName
   * @returns Store feature configuration or null if not found
   */
  public async getFeatures(params: StoreFeatureRequest) {
    try {
      loggerService.info('Fetching store feature configuration', { storeName: params.storeName });
      
      // Using raw query to access the actual table name in the database
      const storeFeatureConfig = await prisma.$queryRaw`
        SELECT * FROM "store_feature_config" WHERE "storeName" = ${params.storeName} LIMIT 1
      `;
      
      // Check if result exists and contains data
      if (!storeFeatureConfig || !Array.isArray(storeFeatureConfig) || storeFeatureConfig.length === 0) {
        loggerService.warn('Store feature configuration not found', { storeName: params.storeName });
        return null;
      }
      
      const record = storeFeatureConfig[0];
      
      return {
        storeName: record.storeName,
        features: record.features,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };
    } catch (error) {
      loggerService.error('Error fetching store feature configuration', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        storeName: params.storeName
      });
      throw error;
    }
  }

  /**
   * Create or update store feature configuration
   * @param storeName Store name
   * @param features Array of feature objects
   * @returns The created or updated feature configuration
   */
  public async createOrUpdateFeatures(
    storeName: string,
    features: Array<{
      key: string;
      label: string;
      children?: Array<{ key: string; label: string; }>;
    }>
  ) {
    try {
      loggerService.info('Creating or updating store feature configuration', { 
        storeName, 
        featureCount: features.length 
      });

      // Using raw query to access the actual table name in the database
      // Check if the record exists
      const existingRecord = await prisma.$queryRaw`
        SELECT * FROM "store_feature_config" WHERE "storeName" = ${storeName} LIMIT 1
      `;
      
      let result;
      
      if (!existingRecord || !Array.isArray(existingRecord) || existingRecord.length === 0) {
        // Create new record
        await prisma.$executeRaw`
          INSERT INTO "store_feature_config" ("storeName", "features", "createdAt", "updatedAt")
          VALUES (${storeName}, ${JSON.stringify(features)}, NOW(), NOW())
        `;
        
        // Fetch the newly created record
        const newRecord = await prisma.$queryRaw`
          SELECT * FROM "store_feature_config" WHERE "storeName" = ${storeName} LIMIT 1
        `;
        
        if (Array.isArray(newRecord) && newRecord.length > 0) {
          result = newRecord[0];
        }
      } else {
        // Update existing record
        await prisma.$executeRaw`
          UPDATE "store_feature_config"
          SET "features" = ${JSON.stringify(features)}, "updatedAt" = NOW()
          WHERE "storeName" = ${storeName}
        `;
        
        // Fetch the updated record
        const updatedRecord = await prisma.$queryRaw`
          SELECT * FROM "store_feature_config" WHERE "storeName" = ${storeName} LIMIT 1
        `;
        
        if (Array.isArray(updatedRecord) && updatedRecord.length > 0) {
          result = updatedRecord[0];
        }
      }

      if (!result) {
        throw new Error('Failed to create or update store feature configuration');
      }
      
      return {
        storeName: result.storeName,
        features: result.features,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      };
    } catch (error) {
      loggerService.error('Error creating or updating store feature configuration', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        storeName
      });
      throw error;
    }
  }
}

export const storeFeatureRepository = new StoreFeatureRepository(); 