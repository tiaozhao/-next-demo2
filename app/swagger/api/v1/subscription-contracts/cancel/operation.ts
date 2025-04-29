/**
 * Swagger operation definition for subscription contract cancel
 */
export const cancelSubscriptionContractOperation = {
  tags: ['Subscription Contracts'],
  summary: 'Cancel a subscription contract',
  description: 'Cancels an active or paused subscription contract, changing its status to cancelled.',
  operationId: 'cancelSubscriptionContract',
  parameters: [
    {
      name: 'body',
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: [
          'storeName',
          'customerId',
          'companyLocationId',
          'subscriptionContractId',
          'approvedById',
          'approvedByName'
        ],
        properties: {
          storeName: {
            type: 'string',
            description: 'Store name in format "store-name.myshopify.com"',
            example: 'b2b-accelerator.myshopify.com'
          },
          customerId: {
            type: 'string',
            description: 'Shopify customer ID',
            example: 'gid://shopify/Customer/778899'
          },
          companyLocationId: {
            type: 'string',
            description: 'Company location ID associated with the subscription',
            example: 'gid://shopify/CompanyLocation/6501466332'
          },
          subscriptionContractId: {
            type: 'number',
            description: 'Subscription contract ID to cancel',
            example: 1
          },
          approvedById: {
            type: 'string',
            description: 'ID of the approver (company contact ID)',
            example: 'gid://shopify/CompanyContact/778899'
          },
          approvedByName: {
            type: 'string',
            description: 'Name of the approver',
            example: 'Emma Zhang'
          },
          note: {
            type: 'string',
            description: 'Optional note for the cancellation',
            example: 'Cancelling due to customer request'
          }
        }
      }
    }
  ],
  security: [{ bearerAuth: [] }],
  responses: {
    "200": {
      description: 'Successful operation',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the cancel operation was successful',
            example: true
          },
          message: {
            type: 'string',
            description: 'Message describing the result of the operation',
            example: 'Subscription cancelled successfully.'
          }
        }
      }
    },
    "400": {
      description: 'Validation error or invalid request',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Cannot cancel a subscription that is not in active or paused status. Current status: declined'
          },
          status: {
            type: 'number',
            example: 400
          }
        }
      }
    },
    "401": {
      description: 'Unauthorized request',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Approver does not have the required permission to cancel subscription contracts'
          },
          status: {
            type: 'number',
            example: 401
          }
        }
      }
    },
    "404": {
      description: 'Subscription contract not found',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Subscription contract with ID 1 not found'
          },
          status: {
            type: 'number',
            example: 404
          }
        }
      }
    },
    "500": {
      description: 'Internal server error',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Failed to cancel subscription contract'
          },
          status: {
            type: 'number',
            example: 500
          }
        }
      }
    }
  }
}; 