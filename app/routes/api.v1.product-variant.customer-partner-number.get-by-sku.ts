import { type ActionFunctionArgs } from '@remix-run/node';
import { loggerService } from '../lib/logger';
import { SkuFetchRequestSchema } from '../types/product-variant/customer-partner-number-search.schema';
import { storeCompanyMappingService } from '../services/product-variant/store-company-mapping.service';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/get-by-sku';

/**
 * Handle OPTIONS requests for CORS
 */
export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Get by SKU loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));

/**
 * Batch fetch customer partner numbers by SKU
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Get by SKU handler started', {
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
    const validatedParams = SkuFetchRequestSchema.safeParse(rawParams);

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
    const customerPartnerNumberDetails = await storeCompanyMappingService.batchFetchCustomerNumberDetails(validatedParams.data);
    
    // Return successful response
    loggerService.info('Customer number details fetched successfully', { count: customerPartnerNumberDetails.length });
    return new Response(
      JSON.stringify({
        code: 200,
        customerPartnerNumberDetails: customerPartnerNumberDetails
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Handle unexpected errors
    loggerService.error('Error fetching customer number details', { error });
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