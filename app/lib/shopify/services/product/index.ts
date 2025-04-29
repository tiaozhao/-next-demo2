import { ShopifyProductService } from './product.service';
export * from './product.types';

/**
 * Singleton instance of ProductService
 */
export const shopifyProductService = new ShopifyProductService();



