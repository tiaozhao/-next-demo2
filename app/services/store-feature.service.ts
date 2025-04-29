import { loggerService } from '../lib/logger';
import { storeFeatureRepository } from '../repositories/store/store-feature.repository';
import { type StoreFeatureRequest, type StoreFeatureResponse } from '../types/store/store-feature.schema';

export class StoreFeatureService {
  /**
   * Get feature configuration for a store
   * @param params Request parameters containing storeName
   * @returns Store feature configuration response
   */
  public async getFeatures(params: StoreFeatureRequest): Promise<StoreFeatureResponse | null> {
    try {
      loggerService.info('Getting store feature configuration', { storeName: params.storeName });
      
      const featureConfig = await storeFeatureRepository.getFeatures(params);
      
      if (!featureConfig) {
        loggerService.warn('No feature configuration found for store', { storeName: params.storeName });
        return null;
      }
      
      return featureConfig as StoreFeatureResponse;
    } catch (error) {
      loggerService.error('Error getting store feature configuration', { 
        error: error instanceof Error ? error.message : 'Unknown error',
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
  ): Promise<StoreFeatureResponse> {
    try {
      loggerService.info('Creating or updating store feature configuration', { 
        storeName, 
        featureCount: features.length 
      });
      
      const result = await storeFeatureRepository.createOrUpdateFeatures(storeName, features);
      
      return result as StoreFeatureResponse;
    } catch (error) {
      loggerService.error('Error creating or updating store feature configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName
      });
      throw error;
    }
  }
}

export const storeFeatureService = new StoreFeatureService(); 