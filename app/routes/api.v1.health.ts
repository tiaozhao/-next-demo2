import { type LoaderFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { withTracing } from '~/lib/telemetry/middleware';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { z } from 'zod';

const ROUTE_PATH = '/api/v1/health';

/**
 * Response schema for health check endpoint
 */
const HealthCheckResponseSchema = z.object({
  code: z.number(),
  data: z.object({
    status: z.literal('ok'),
    timestamp: z.string(),
    version: z.string(),
  })
});

type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * Health check endpoint to verify service availability
 */
export const loader = withTracing(withCors(async ({ request }: LoaderFunctionArgs) => {
  loggerService.info('Health check started', {
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    const response: HealthCheckResponse = {
      code: 200,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
      }
    };

    const validatedResponse = HealthCheckResponseSchema.parse(response);

    return new Response(
      JSON.stringify(validatedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Health check failed', { error });
    return ErrorHandler.createErrorResponse(error);
  }
})); 