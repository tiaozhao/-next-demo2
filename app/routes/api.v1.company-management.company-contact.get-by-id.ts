import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { companyContactService } from '~/services/company-management/company-contact.service';
import { contactDetailRequestSchema } from '~/types/company-management/company-contact-get-by-id.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/company-management/company-contact/get-by-id';

export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Company contact get-by-id handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = contactDetailRequestSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    const result = await companyContactService.getContactDetail(validatedParams.data);
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    loggerService.error('Error getting company contact details', { error });
    return ErrorHandler.createErrorResponse(error);
  }
})); 

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Company contact get-by-id loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 