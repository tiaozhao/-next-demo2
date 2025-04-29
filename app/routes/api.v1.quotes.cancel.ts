import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { quoteService } from '~/services/quotes/quote.service';
import { cancelQuoteSchema } from '~/types/quotes/quote.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/quotes/cancel';

/**
 * POST /api/v1/quotes/cancel
 * Cancel a quote that is in Submitted status
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote cancel handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = cancelQuoteSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Cancelling quote', {
      quoteId: validatedParams.data.quoteId,
      storeName: validatedParams.data.storeName,
      companyLocationId: validatedParams.data.companyLocationId,
      customerId: validatedParams.data.customerId
    });

    const result = await quoteService.cancelQuote(validatedParams.data);

    loggerService.info('Quote cancel handler completed', {
      status: 200,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify(result),
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
      if (error.message.includes('Invalid status transition')) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: error.message
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    loggerService.error('Error cancelling quote', {
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));


export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote cancel loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));