export const storeFeaturesOperation = {
  tags: ['Store'],
  summary: 'Get store feature configuration',
  description: 'Retrieve the feature configuration for a specific store',
  parameters: [
    {
      name: 'body',
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['storeName'],
        properties: {
          storeName: {
            type: 'string',
            description: 'Store name',
            example: 'b2b-accelerator.myshopify.com'
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully retrieved store feature configuration',
      schema: {
        type: 'object',
        properties: {
          featureConfig: {
            type: 'object',
            properties: {
              storeName: {
                type: 'string',
                description: 'Store name'
              },
              features: {
                type: 'array',
                description: 'List of features',
                items: {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      description: 'Feature key'
                    },
                    label: {
                      type: 'string',
                      description: 'Display name of the feature'
                    },
                    children: {
                      type: 'array',
                      description: 'Sub-features (if any)',
                      items: {
                        type: 'object',
                        properties: {
                          key: {
                            type: 'string',
                            description: 'Sub-feature key'
                          },
                          label: {
                            type: 'string',
                            description: 'Display name of the sub-feature'
                          }
                        }
                      }
                    }
                  }
                }
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Creation timestamp'
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Last update timestamp'
              }
            }
          }
        }
      }
    },
    '400': {
      description: 'Invalid request parameters'
    },
    '404': {
      description: 'Store feature configuration not found'
    },
    '500': {
      description: 'Internal server error'
    }
  }
}; 