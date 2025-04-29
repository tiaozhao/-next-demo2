import { type ActionFunctionArgs } from '@remix-run/node';
import { loggerService } from '../lib/logger';
import { productVariantSearchRequestSchema } from '../types/product-variant/product-variant-search.schema';
import { productVariantSearchService } from '../services/product-variant/product-variant-search.service';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { ErrorHandler } from '~/lib/errors/error-handler';

const ROUTE_PATH = '/api/v1/product-variant/fetch-all';

/**
 * Handle OPTIONS requests for CORS
 */
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Fetch loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));

/**
 * Search for products and their variants with filtering based on company location
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Fetch handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    // Validate HTTP method
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    // Parse and validate request parameters
    const rawParams = await request.json();
    const validatedParams = productVariantSearchRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    // Search products
    loggerService.debug('Parameters validated successfully', { params: validatedParams.data });
    const products = await productVariantSearchService.searchProducts(validatedParams.data);
    
    // Return successful response
    loggerService.info('Products fetched successfully', { count: products.length });
    return new Response(
      JSON.stringify({
        code: 200,
        message: 'Products fetched successfully',
        products
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error fetching products', { error });
    return ErrorHandler.createErrorResponse(error);
  }
})); 