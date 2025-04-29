import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { HttpStatusCode } from '~/lib/errors/base-error';
import { ZodError, z } from 'zod';
import { CoveoPageIndexingService } from '~/services/shopify-to-coveo/coveo-page-indexing.service';

const ROUTE_PATH = '/api/v1/coveo/index-pages';

/**
 * Request schema for Coveo page indexing
 */
const indexPagesSchema = z.object({
  storeName: z.string().min(1, { message: 'Store name is required' }),
});

/**
 * POST /api/v1/coveo/index-pages
 * Trigger indexing of Shopify pages to Coveo search index
 */
export const action = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    const METHOD = 'coveo.index-pages';
    try {
      loggerService.info(`${METHOD} handler started`, {
        url: request.url,
        method: request.method,
        routePath: ROUTE_PATH,
      });

      // Check if request method is POST
      if (request.method !== 'POST') {
        return ErrorHandler.createMethodNotAllowedResponse();
      }
      
      const requestBody = await request.json();
      
      // Validate request data against schema
      try {
        const validatedData = indexPagesSchema.parse(requestBody);
        
        
        loggerService.info(`${METHOD} processing request`, {
          storeName: validatedData.storeName,
          routePath: ROUTE_PATH,
        });
        
        // Initialize and run the page indexing service
        const pageIndexingService = new CoveoPageIndexingService(validatedData.storeName);
        await pageIndexingService.indexPages();

        // Prepare success response
        const result = {
          message: `Successfully indexed pages for store: ${validatedData.storeName}`,
          status: 'success',
          timestamp: new Date().toISOString(),
        };
        
        loggerService.info(`${METHOD} handler completed`, {
          status: HttpStatusCode.OK,
          routePath: ROUTE_PATH,
          storeName: validatedData.storeName,
        });
        
        return new Response(
          JSON.stringify(result),
          {
            status: HttpStatusCode.OK,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (validationError) {
        // Handle Zod schema validation errors
        if (validationError instanceof ZodError) {
          loggerService.warn(`${METHOD} validation error`, {
            errors: validationError.errors,
            routePath: ROUTE_PATH,
          });
          
          return ErrorHandler.createValidationErrorResponse(validationError);
        }
        
        // Re-throw other errors
        throw validationError;
      }
    } catch (error) {
      // Log error details
      loggerService.error(`${METHOD} error processing request`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        routePath: ROUTE_PATH,
      });

      // Use the ErrorHandler to create a standardized error response
      return ErrorHandler.createErrorResponse(error);
    }
  })
);

/**
 * Handle OPTIONS requests for CORS preflight
 */
export const loader = withTracing(
  withCors(async ({ request }: ActionFunctionArgs) => {
    return new Response(null, { status: HttpStatusCode.OK });
  })
); 