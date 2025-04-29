import type { 
  CompanyAssignCustomerResponse, 
  CompanyContactAssignRolesResponse,
} from '~/types/company-contact';
import { COMPANY_CONSTANTS } from '~/types/company-contact';
import { ShopifyClientManager } from '~/lib/shopify/client';

/**
 * Service for managing company contacts and their assignments
 */
export class CompanyContactService {
  /**
   * Assigns a customer to a company as a contact
   * @param storeDomain - The store's domain
   * @param customerId - The ID of the customer to assign
   * @returns The response containing the company contact ID
   */
  public static async assignCustomerToCompany(
    storeDomain: string,
    customerId: string
  ): Promise<CompanyAssignCustomerResponse> {
    const response = await ShopifyClientManager.mutation<CompanyAssignCustomerResponse>(
      `
        mutation companyAssignCustomerAsContact($companyId: ID!, $customerId: ID!) {
          companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
            companyContact {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      storeDomain,
      {
        variables: {
          companyId: COMPANY_CONSTANTS.COMPANY_ID,
          customerId,
        },
      }
    );

    if (response.errors) {
      throw new Error(`Failed to assign customer to company: ${JSON.stringify(response.errors)}`);
    }

    if (!response.data) {
      throw new Error('No data received from Shopify API when assigning customer to company');
    }

    return response.data;
  }

  /**
   * Assigns roles to a company contact
   * @param storeDomain - The store's domain
   * @param companyContactId - The ID of the company contact
   * @returns The response containing the role assignments
   */
  public static async assignRolesToContact(
    storeDomain: string,
    companyContactId: string
  ): Promise<CompanyContactAssignRolesResponse> {
    const response = await ShopifyClientManager.mutation<CompanyContactAssignRolesResponse>(
      `
        mutation companyContactAssignRoles($companyContactId: ID!, $rolesToAssign: [CompanyContactRoleAssign!]!) {
          companyContactAssignRoles(companyContactId: $companyContactId, rolesToAssign: $rolesToAssign) {
            roleAssignments {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      storeDomain,
      {
        variables: {
          companyContactId,
          rolesToAssign: [
            {
              companyContactRoleId: COMPANY_CONSTANTS.COMPANY_CONTACT_ROLE_ID,
              companyLocationId: COMPANY_CONSTANTS.COMPANY_LOCATION_ID,
            },
          ],
        },
      }
    );

    if (response.errors) {
      throw new Error(`Failed to assign roles to contact: ${JSON.stringify(response.errors)}`);
    }

    if (!response.data) {
      throw new Error('No data received from Shopify API when assigning roles to contact');
    }

    return response.data;
  }
} 