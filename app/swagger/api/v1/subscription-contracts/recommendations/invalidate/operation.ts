/**
 * Swagger operation definition for subscription recommendations cache invalidation API
 */
export const subscriptionRecommendationsInvalidateOperation = {
  tags: ['Subscription Contracts'],
  summary: 'Invalidate subscription recommendations cache',
  description: 'Invalidates cached subscription product recommendations for a customer. This endpoint is designed to be called by Shopify Flow when an order is created.',
  operationId: 'invalidateSubscriptionRecommendations',
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
          'companyLocationId'
        ],
        properties: {
          storeName: {
            type: 'string',
            description: 'Shopify store name',
            example: 'demo.myshopify.com'
          },
          customerId: {
            type: 'string',
            description: 'Shopify customer ID',
            example: 'gid://shopify/Customer/12345678'
          },
          companyLocationId: {
            type: 'string',
            description: 'Shopify company location ID',
            example: 'gid://shopify/CompanyLocation/87654321'
          },
          lineItems: {
            type: 'array',
            description: 'Order line items with SKUs to check against recommendations',
            items: {
              type: 'object',
              properties: {
                sku: {
                  type: 'string',
                  description: 'Product SKU',
                  example: 'SKU001'
                }
              },
              required: ['sku']
            }
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
            description: 'Whether the cache invalidation was successful',
            example: true
          },
          message: {
            type: 'string',
            description: 'Status message',
            example: 'Recommendation cache successfully invalidated'
          }
        }
      }
    },
    "400": {
      description: 'Bad request - invalid parameters',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Validation error'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  example: ['customerId']
                },
                message: {
                  type: 'string',
                  example: 'Customer ID is required'
                }
              }
            }
          }
        }
      }
    },
    "500": {
      description: 'Server error',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Internal server error'
          },
          message: {
            type: 'string',
            example: 'An unexpected error occurred'
          }
        }
      }
    }
  }
};
