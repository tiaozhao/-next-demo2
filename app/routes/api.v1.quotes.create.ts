import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { quoteService } from '~/services/quotes/quote.service';
import { createQuoteSchema } from '~/types/quotes/quote.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/quotes/create';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote create handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = createQuoteSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const { storeName, quote } = validatedParams.data;

    loggerService.info('Creating quote', { 
      storeName,
      customerId: quote.customerId,
      companyLocationId: quote.companyLocationId,
      itemCount: quote.quoteItems.length
    });

    const result = await quoteService.createQuote({
      storeName,
      quote,
      createdBy: quote.customerId // Using customerId as createdBy
    });

    loggerService.info('Quote create handler completed', {
      status: 201,
      quoteId: result.id,
      routePath: ROUTE_PATH
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error creating quote', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
})); 


export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Quote create loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 