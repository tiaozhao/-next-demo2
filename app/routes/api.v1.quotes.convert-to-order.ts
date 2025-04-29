import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { quoteService } from '~/services/quotes/quote.service';
import { convertQuoteToOrderSchema } from '~/types/quotes/quote.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/quotes/convert-to-order';

/**
 * POST /api/v1/quotes/convert-to-order
 * Convert a quote to order. Only quotes in SUBMITTED or APPROVED status can be converted.
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote convert to order handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = convertQuoteToOrderSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Converting quote to order', {
      quoteId: validatedParams.data.quoteId,
      storeName: validatedParams.data.storeName,
      companyLocationId: validatedParams.data.companyLocationId,
      customerId: validatedParams.data.customerId
    });

    const result = await quoteService.convertToOrder(validatedParams.data);

    loggerService.info('Quote convert to order handler completed', {
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
      if (error.message.includes('Cannot convert quote with status')) {
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
    loggerService.error('Error converting quote to order', {
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote convert to order loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
}));