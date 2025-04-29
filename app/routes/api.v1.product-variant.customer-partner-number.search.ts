import { type LoaderFunctionArgs } from '@remix-run/node';
import { loggerService } from '../lib/logger';
import { CustomerPartnerNumberSearchRequestSchema } from '../types/product-variant/customer-partner-number-search.schema';
import { storeCompanyMappingService } from '../services/product-variant/store-company-mapping.service';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/product-variant/customer-partner-number/search';

export const loader = withTracing(withCors(async ({ request }: LoaderFunctionArgs) => {
  loggerService.info('Search handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    const url = new URL(request.url);
    
    // Capture all original search parameters
    const allSearchParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      allSearchParams[key] = value;
    });

    // Extract required parameters for validation
    const requiredParams = {
      q: url.searchParams.get('q'),
      companyId: url.searchParams.get('companyId'),
      storeName: url.searchParams.get('storeName')
    };

    const validatedParams = CustomerPartnerNumberSearchRequestSchema.safeParse(requiredParams);

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

    const redirectUrl = await storeCompanyMappingService.getRedirectUrl(validatedParams.data, allSearchParams);
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl
      }
    });

  } catch (error) {
    loggerService.error('Error processing search request', { error });
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