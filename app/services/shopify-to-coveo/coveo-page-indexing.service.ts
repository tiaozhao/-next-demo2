import { DocumentBuilder, PushSource } from '@coveo/push-api-client';
import { loggerService } from '~/lib/logger';
import { ShopifyClientManager } from '~/lib/shopify/client';
import { PAGE_LIST } from '~/lib/shopify/queries/page';
import { getServicesConfig } from '~/config/configLoader';
import { convert } from 'html-to-text';
import type { 
  shopifyPageSchema, 
  coveoConfigSchema 
} from '~/types/coveo/coveo-page.schema';
import { 
  shopifyPageResponseSchema, 
  coveoPageSchema 
} from '~/types/coveo/coveo-page.schema';
import type { z } from 'zod';

// Define types from Zod schemas
type ShopifyPage = z.infer<typeof shopifyPageSchema>;
type CoveoPage = z.infer<typeof coveoPageSchema>;
type CoveoConfig = z.infer<typeof coveoConfigSchema>;

/**
 * Service for indexing Shopify pages to Coveo
 */
export class CoveoPageIndexingService {
  private readonly CLASS_NAME = 'CoveoPageIndexingService';
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly pushSource: PushSource;
  private readonly coveoConfig: CoveoConfig;

  /**
   * Constructor for the CoveoPageIndexingService
   * @param storeName - The name of the Shopify store
   */
  constructor(
    private readonly storeName: string,
  ) {
    const servicesConfig = getServicesConfig();

    this.coveoConfig = servicesConfig.coveo || {};
    
    // Log configuration for debugging
    loggerService.info(`${this.CLASS_NAME}.constructor: Coveo configuration`, {
      coveoConfig: JSON.stringify(this.coveoConfig)
    });
    
    // Check if required configuration exists
    const apiKey = this.coveoConfig.apiKey;
    const organizationId = this.coveoConfig.organizationId;
    
    if (!apiKey) {
      throw new Error('Coveo API key is missing. Please check your configuration or set COVEO_PUSH_RDS_API_KEY environment variable.');
    }
    
    if (!organizationId) {
      throw new Error('Coveo Organization ID is missing. Please check your configuration or set COVEO_ORGANIZATION_ID environment variable.');
    }
    
    this.pushSource = new PushSource(apiKey, organizationId);
  }

  /**
   * Main method to orchestrate the entire indexing process
   */
  public async indexPages(): Promise<void> {
    try {
      loggerService.info(`${this.CLASS_NAME}.indexPages: Starting page indexing for store: ${this.storeName}`);
      
      // Step 1: Fetch all pages from Shopify
      const shopifyPages = await this.fetchShopifyPages();
      
      // Filter out unpublished pages
      const publishedPages = shopifyPages.filter(page => page.isPublished === true);
      
      loggerService.info(`${this.CLASS_NAME}.indexPages: Filtered ${shopifyPages.length - publishedPages.length} unpublished pages, proceeding with ${publishedPages.length} published pages`);
      
      // Step 2: Transform pages to Coveo format
      const coveoPages = this.transformShopifyPagesToCoveoFormat(publishedPages);
      
      // Step 3: Push transformed pages to Coveo
      await this.pushPagesToCoveo(coveoPages);
      
      loggerService.info(`${this.CLASS_NAME}.indexPages: Successfully completed page indexing for store: ${this.storeName}`);
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.indexPages: Failed to index pages`, {
        storeName: this.storeName,
        error: this.formatError(error),
      });
      throw error;
    }
  }

  /**
   * Fetch all pages from Shopify
   * @returns Promise<ShopifyPage[]> Array of Shopify pages
   */
  private async fetchShopifyPages(): Promise<ShopifyPage[]> {
    const METHOD = 'fetchShopifyPages';
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting pages fetch`, {
        storeName: this.storeName,
      });

      let allPages: ShopifyPage[] = [];
      let hasNextPage = true;
      let endCursor = null;

      while (hasNextPage) {
        const pagesResponse = await ShopifyClientManager.query(PAGE_LIST, this.storeName, {
          variables: {
            first: this.DEFAULT_BATCH_SIZE,
            after: endCursor
          },
        });

        // Validate response against schema
        const validatedResponse = shopifyPageResponseSchema.safeParse(pagesResponse);
        
        if (!validatedResponse.success) {
          loggerService.error(`${this.CLASS_NAME}.${METHOD}: Invalid response from Shopify API`, {
            errors: validatedResponse.error.format(),
          });
          throw new Error('Invalid response from Shopify API');
        }

        const currentPages = validatedResponse.data?.data?.pages?.edges?.map((edge) => edge.node) || [];
        allPages = [...allPages, ...currentPages];

        hasNextPage = validatedResponse.data?.data?.pages?.pageInfo?.hasNextPage || false;
        endCursor = validatedResponse.data?.data?.pages?.pageInfo?.endCursor || null;

        loggerService.debug(`${this.CLASS_NAME}.${METHOD}: Fetched batch`, {
          count: currentPages.length,
          total: allPages.length,
          hasNextPage,
        });
      }

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${allPages.length} pages`);
      return allPages;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error fetching pages`, {
        storeName: this.storeName,
        error: this.formatError(error),
      });
      throw error;
    }
  }

  /**
   * Transform Shopify pages to Coveo format
   * @param shopifyPages - Array of Shopify pages
   * @returns CoveoPage[] - Array of transformed Coveo pages
   */
  private transformShopifyPagesToCoveoFormat(shopifyPages: ShopifyPage[]): CoveoPage[] {
    const METHOD = 'transformShopifyPagesToCoveoFormat';
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting transformation of ${shopifyPages.length} pages`);
      
      const coveoPages: CoveoPage[] = shopifyPages.map(page => {
        // Extract page ID from the Shopify ID format (gid://shopify/Page/116568981724)
        const pageId = page.id.split('/').pop() || '';
        
        // Convert HTML to plain text for better indexing
        const plainTextBody = convert(page.body, {
          wordwrap: false,
          selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'style', format: 'skip' },
            { selector: 'script', format: 'skip' },
            { selector: 'meta', format: 'skip' }
          ]
        });
        
        // Create Coveo page data and validate it
        const coveoPage = {
          documentId: `page://${pageId}`,
          title: page.title,
          ec_page_id: pageId,
          body: plainTextBody,      // Plain text content for indexing
          ec_body: page.body,       // Original HTML content
          ec_handle: page.handle,
          objecttype: 'Page' as const,
          ec_is_published: page.isPublished,
        };
        
        // Validate against schema
        return coveoPageSchema.parse(coveoPage);
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully transformed ${coveoPages.length} pages`);
      return coveoPages;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error transforming pages`, {
        error: this.formatError(error),
      });
      throw error;
    }
  }

  /**
   * Push transformed pages to Coveo
   * @param coveoPages - Array of Coveo-formatted pages
   */
  private async pushPagesToCoveo(coveoPages: CoveoPage[]): Promise<void> {
    const METHOD = 'pushPagesToCoveo';
    
    try {
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Preparing ${coveoPages.length} documents for Coveo push`);

      const documents = coveoPages.map((page) => {
        const metaData: Record<string, any> = { ...page };
        if ('documentId' in metaData) {
          delete metaData.documentId;
        }
        return new DocumentBuilder(page.documentId, page.title).withMetadata(metaData);
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Starting batch update`, {
        documentsCount: documents.length,
      });

      // Get push source ID from config or environment variable
      const pushSourceId = this.coveoConfig.pageSource?.pushSourceId;
      
      if (!pushSourceId) {
        throw new Error('Coveo Push Source ID is missing. Please check your configuration or set COVEO_PUSH_SOURCE_ID environment variable.');
      }

      await this.pushSource.batchUpdateDocuments(pushSourceId, {
        addOrUpdate: documents,
        delete: [],
      });

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Successfully pushed all pages to Coveo`);
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error in batch update`, {
        error: this.formatError(error),
      });
      throw error;
    }
  }

  /**
   * Format error object for logging
   * @param error - The error object
   * @returns Formatted error object
   */
  private formatError(error: unknown): object {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: (error as any).code,
        syscall: (error as any).syscall,
        hostname: (error as any).hostname,
      };
    }
    return { unknownError: String(error) };
  }
}
