import { z } from 'zod';

// Request schema for assigning customer to company
export const assignCustomerToCompanySchema = z.object({
  customerId: z.string(),
});

export type AssignCustomerToCompanyRequest = z.infer<typeof assignCustomerToCompanySchema>;

// Constants for company-related IDs
export const COMPANY_CONSTANTS = {
  COMPANY_ID: 'gid://shopify/Company/4257382518',
  COMPANY_CONTACT_ROLE_ID: 'gid://shopify/CompanyContactRole/6264750198',
  COMPANY_LOCATION_ID: 'gid://shopify/CompanyLocation/5583470710',
} as const;

// GraphQL response types
export interface CompanyAssignCustomerResponse {
  companyAssignCustomerAsContact: {
    companyContact: {
      id: string;
    };
    userErrors: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface CompanyContactAssignRolesResponse {
  companyContactAssignRoles: {
    roleAssignments: Array<{
      id: string;
    }>;
    userErrors: Array<{
      field: string;
      message: string;
    }>;
  };
} 