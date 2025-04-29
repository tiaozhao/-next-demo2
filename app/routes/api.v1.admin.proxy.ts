import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { z } from 'zod';
import { authenticate } from '~/shopify.server';

const fetchRequestSchema = z.object({
  query: z.string(),
  variables: z.record(z.any()),
});

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

    const { admin } = await authenticate.admin(request);
    const { query, variables } = validatedParams.data;

    const response = await admin.graphql(query, { variables });
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error fetching company contacts', { error });
    return ErrorHandler.createErrorResponse(error);
  }
});

export const loader = withCors(async ({ request }: ActionFunctionArgs) => {
  return new Response(null, { status: 200 });
}); 