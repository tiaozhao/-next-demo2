/**
 * Swagger operation definition for subscription recommendations API
 */
export const subscriptionRecommendationsOperation = {
  tags: ['Subscription Contracts'],
  summary: 'Get personalized subscription recommendations',
  description: 'Provides personalized subscription product recommendations for a customer based on various data sources including order history, wishlists, and AI-enhanced suggestions.',
  operationId: 'getSubscriptionRecommendations',
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
            description: 'Store name in format "store-name.myshopify.com"',
            example: 'b2b-accelerator.myshopify.com'
          },
          customerId: {
            type: 'string',
            description: 'Shopify customer ID',
            example: 'gid://shopify/Customer/7775370707164'
          },
          companyLocationId: {
            type: 'string',
            description: 'Company location ID associated with the customer',
            example: 'gid://shopify/CompanyLocation/6559891676'
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
          recommendations: {
            type: 'array',
            description: 'List of product recommendations',
            items: {
              type: 'object',
              properties: {
                skuId: {
                  type: 'string',
                  description: 'Product SKU identifier',
                  example: '240002'
                },
                score: {
                  type: 'number',
                  description: 'Recommendation score (0-10 scale)',
                  example: 8
                },
                reason: {
                  type: 'string',
                  description: 'Business justification for the recommendation',
                  example: 'Save with bulk pricing on popular items'
                }
              }
            }
          },
          metadata: {
            type: 'object',
            description: 'Additional information about the recommendations',
            properties: {
              cacheHit: {
                type: 'boolean',
                description: 'Whether the results were served from cache',
                example: true
              },
              cachedAt: {
                type: 'string',
                format: 'date-time',
                description: 'When the results were originally generated',
                example: '2025-04-13T13:52:49.818Z'
              },
              generatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'When the results were generated (if not from cache)',
                example: '2025-04-13T13:52:49.818Z'
              },
              error: {
                type: 'string',
                description: 'Error message if an error occurred during processing',
                example: 'Failed to retrieve customer data'
              }
            }
          }
        }
      }
    },
    "400": {
      description: 'Validation error or invalid request',
      schema: {
        type: 'object',
        properties: {
          errors: {
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
            example: 'Authentication required'
          },
          status: {
            type: 'number',
            example: 401
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
            example: 'Failed to generate recommendations'
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