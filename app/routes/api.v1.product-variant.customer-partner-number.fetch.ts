import { type ActionFunctionArgs } from '@remix-run/node';
import { loggerService } from '../lib/logger';
import { CustomerPartnerNumberFetchRequestSchema } from '../types/product-variant/customer-partner-number-search.schema';
import { storeCompanyMappingService } from '../services/product-variant/store-company-mapping.service';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/fetch';

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
 * Batch fetch SKU details by customer partner numbers
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
      loggerService.warn('Method not allowed', { method: request.method });
      return new Response(
        JSON.stringify({
          code: 405,
          message: 'Method not allowed'
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request parameters
    const rawParams = await request.json();
    const validatedParams = CustomerPartnerNumberFetchRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return new Response(
        JSON.stringify({ 
          code: 400,
          message: 'Invalid parameters',
          errors: validatedParams.error.errors 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch SKU details
    loggerService.debug('Parameters validated successfully', { params: validatedParams.data });
    const skuDetails = await storeCompanyMappingService.batchFetchSkuDetails(validatedParams.data);
    
    // Return successful response
    loggerService.info('SKU details fetched successfully', { count: skuDetails.length });
    return new Response(
      JSON.stringify({
        code: 200,
        skuDetails
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Handle unexpected errors
    loggerService.error('Error fetching SKU details', { error });
    return new Response(
      JSON.stringify({
        code: 500,
        message: 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
})); 