import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';
import { CompanyContactService } from '~/services/customer-management/company-contact.service';
import { assignCustomerSchema } from '~/types/company/assign-customer.schema';
import { loggerService } from '~/lib/logger';
import { ErrorHandler } from '~/lib/errors/error-handler';
import { withTracing } from '~/lib/telemetry/middleware';

const ROUTE_PATH = '/api/v1/company/assign-customer';

/**
 * POST /api/v1/company/assign-customer
 * Assigns a customer to a company and assigns appropriate roles
 */
export const action = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Company assign customer handler started', {
    url: request.url,
    method: request.method,
    routePath: ROUTE_PATH
  });

  try {
    if (request.method !== 'POST') {
      return ErrorHandler.createMethodNotAllowedResponse();
    }

    const rawParams = await request.json();
    const validatedParams = assignCustomerSchema.safeParse(rawParams);

    if (!validatedParams.success) {
      loggerService.warn('Invalid parameters', { errors: validatedParams.error.errors });
      return ErrorHandler.createValidationErrorResponse(validatedParams.error);
    }

    loggerService.info('Assigning customer to company', { 
      customerId: validatedParams.data.customerId,
      storeName: validatedParams.data.storeName
    });

    // Step 1: Assign customer to company
    const assignResponse = await CompanyContactService.assignCustomerToCompany(
      validatedParams.data.storeName,
      validatedParams.data.customerId
    );

    if (assignResponse.companyAssignCustomerAsContact.userErrors.length > 0) {
      const errors = assignResponse.companyAssignCustomerAsContact.userErrors;
      loggerService.error('Failed to assign customer to company', { errors });
      return new Response(
        JSON.stringify({
          code: 400,
          message: 'Failed to assign customer to company',
          errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 2: Assign roles to the contact
    const companyContactId = assignResponse.companyAssignCustomerAsContact.companyContact.id;
    const rolesResponse = await CompanyContactService.assignRolesToContact(
      validatedParams.data.storeName,
      companyContactId
    );

    if (rolesResponse.companyContactAssignRoles.userErrors.length > 0) {
      const errors = rolesResponse.companyContactAssignRoles.userErrors;
      loggerService.error('Failed to assign roles to contact', { errors });
      return new Response(
        JSON.stringify({
          code: 400,
          message: 'Failed to assign roles to contact',
          errors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = {
      companyContactId,
      roleAssignments: rolesResponse.companyContactAssignRoles.roleAssignments
    };

    loggerService.info('Company assign customer handler completed', {
      status: 200,
      routePath: ROUTE_PATH,
      result
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    loggerService.error('Error assigning customer to company', { 
      error,
      routePath: ROUTE_PATH
    });
    return ErrorHandler.createErrorResponse(error);
  }
}));

export const loader = withTracing(withCors(async ({ request }: ActionFunctionArgs) => {
  loggerService.info('Company assign customer loader started', {
    method: request.method,
    routePath: ROUTE_PATH
  });
  return new Response(null, { status: 200 });
})); 