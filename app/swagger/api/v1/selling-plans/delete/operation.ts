export const deleteSellingPlanOperation = {
  tags: ['Selling Plans'],
  summary: 'Delete a selling plan',
  description: 'Soft delete a selling plan by ID',
  parameters: [
    {
      name: 'body',
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['id', 'storeName', 'customerId'],
        properties: {
          id: {
            type: 'number',
            description: 'Selling plan ID',
            example: 1
          },
          storeName: {
            type: 'string',
            description: 'Store name',
            example: 'b2b-accelerator.myshopify.com'
          },
          customerId: {
            type: 'string',
            description: 'ID of user deleting the plan (will be recorded as deletedById)',
            example: 'gid://shopify/User/12345'
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully deleted selling plan',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Selling plan deleted successfully'
          }
        }
      }
    },
    '400': {
      description: 'Bad Request - Invalid parameters',
      schema: {
        type: 'object',
        properties: {
          code: {
            type: 'number',
            example: 400
          },
          message: {
            type: 'string',
            example: 'Invalid parameters'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                message: {
                  type: 'string'
                }
              }
            },
            example: [
              {
                "path": ["id"],
                "message": "Selling plan ID must be a positive integer"
              }
            ]
          }
        }
      }
    },
    '404': {
      description: 'Not Found - Selling plan not found or already deleted',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Selling plan not found or already deleted'
          }
        }
      }
    },
    '500': {
      description: 'Internal Server Error',
      schema: {
        type: 'object',
        properties: {
          code: {
            type: 'number',
            example: 500
          },
          message: {
            type: 'string',
            example: 'Internal server error'
          }
        }
      }
    }
  }
}; 