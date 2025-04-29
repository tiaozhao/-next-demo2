import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { quoteService } from '~/services/quotes/quote.service';
import { bulkDeleteQuotesSchema } from '~/types/quotes/quote.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/quotes/bulk-delete';

/**
 * POST /api/v1/quotes/bulk-delete
 * Bulk delete quotes (both draft and non-draft)
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote bulk delete handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = bulkDeleteQuotesSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Bulk deleting quotes', {
      quoteIds: validatedParams.data.quoteIds,
      storeName: validatedParams.data.storeName,
      companyLocationId: validatedParams.data.companyLocationId,
      customerId: validatedParams.data.customerId
    });

    const deletedCount = await quoteService.bulkDeleteQuotes(validatedParams.data);

    loggerService.info('Quote bulk delete handler completed', {
      status: 200,
      deletedCount,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully deleted quotes'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return new Response(
          JSON.stringify({
            code: 404,
            message: error.message
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      if (error.message.includes('Unauthorized')) {
        return new Response(
          JSON.stringify({
            code: 403,
            message: error.message
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    loggerService.error('Error bulk deleting quotes', {
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote bulk delete loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));