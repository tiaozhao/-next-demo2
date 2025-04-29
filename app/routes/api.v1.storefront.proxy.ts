import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { z } from 'zod';
import { unauthenticated } from '~/shopify.server';
import { withTracing } from '~/lib/telemetry/middleware';

const fetchRequestSchema = z.object({
  query: z.string(),
  storeName: z.string(),
  variables: z.record(z.any()),
});

const ROUTE_PATH = '/api/v1/storefront/proxy';

export const action = withCors(async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') {
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

    const rawParams = await request.json();
    loggerService.info('Raw parameters', { rawParams });
    const validatedParams = fetchRequestSchema.safeParse(rawParams);

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

    console.log('storefront2 request', request);
    console.log('storefront2 request JSON', JSON.stringify(request));
    const { query, variables, storeName } = validatedParams.data;

    const { storefront } = await unauthenticated.storefront(storeName);
    console.log('storefront2', storefront);


    console.log('storefront2 query', query);
    console.log('storefront2 variables', variables);

    const response = await storefront!.graphql(query, { variables });
    console.log('storefront2 response', response);
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return ErrorHandler.createErrorResponse(error);
  }
});

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Bulk delete loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 