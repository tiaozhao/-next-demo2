import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { catalogSearchRequestSchema } from '~/types/catalog/catalog-search.schema';
import { CatalogService } from '~/services/catalog/catalog.service';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { loggerService } from '~/lib/logger';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/catalogs/search';

/**
 * POST /api/v1/catalogs/search
 * Search for catalogs using a query string
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Catalog search handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = catalogSearchRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Searching catalogs', { 
      storeName: validatedParams.data.storeName,
      query: validatedParams.data.query
    });

    const catalogService = new CatalogService();
    const catalogs = await catalogService.searchCatalogs(
      validatedParams.data.storeName,
      validatedParams.data.query
    );

    loggerService.info('Catalog search handler completed', {
      status: 200,
      count: catalogs.length,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify({ catalogs }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error searching catalogs', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Catalog search loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 