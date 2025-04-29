export const fetchSellingPlansOperation = {
  tags: ['Selling Plans'],
  summary: 'Fetch selling plans',
  description: 'Fetch selling plans with pagination, sorting, and filtering',
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
          },
          customerId: {
            type: 'string',
            description: 'Customer ID (optional)',
            example: 'gid://shopify/Customer/12345'
          },
          pagination: {
            type: 'object',
            description: 'Pagination parameters',
            properties: {
              page: {
                type: 'number',
                description: 'Page number (starting from 1)',
                example: 1
              },
              pageSize: {
                type: 'number',
                description: 'Number of items per page (max 100)',
                example: 10
              }
            }
          },
          sort: {
            type: 'array',
            description: 'Sorting parameters',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field to sort by',
                  enum: ['id', 'name', 'currencyCode', 'createdAt', 'updatedAt'],
                  example: 'createdAt'
                },
                direction: {
                  type: 'string',
                  description: 'Sort direction',
                  enum: ['asc', 'desc'],
                  example: 'desc'
                }
              }
            },
            example: [
              {
                "field": "createdAt",
                "direction": "desc"
              }
            ]
          },
          filters: {
            type: 'object',
            description: 'Filter parameters',
            properties: {
              name: {
                type: 'string',
                description: 'Filter by name (case-insensitive, partial match)',
                example: 'Office'
              },
              companyLocationId: {
                type: 'string',
                description: 'Filter by company location ID',
                example: 'gid://shopify/CompanyLocation/12345'
              },
              createdById: {
                type: 'string',
                description: 'Filter by creator ID',
                example: 'gid://shopify/User/12345'
              },
              createdFrom: {
                type: 'string',
                format: 'date',
                description: 'Filter by creation date (from)',
                example: '2025-01-01'
              },
              createdTo: {
                type: 'string',
                format: 'date',
                description: 'Filter by creation date (to)',
                example: '2025-12-31'
              }
            }
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully fetched selling plans',
      schema: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            example: 1
          },
          pageSize: {
            type: 'number',
            example: 10
          },
          totalCount: {
            type: 'number',
            example: 25
          },
          sellingPlans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  example: 1
                },
                name: {
                  type: 'string',
                  example: 'Monthly Office Supplies'
                },
                description: {
                  type: 'string',
                  example: 'Office supplies delivered every month'
                },
                currencyCode: {
                  type: 'string',
                  example: 'USD'
                },
                lineCount: {
                  type: 'number',
                  description: 'Number of product lines in the selling plan',
                  example: 5
                },
                frequencyCount: {
                  type: 'number',
                  description: 'Number of delivery frequencies available',
                  example: 2
                },
                discountDisplay: {
                  type: 'string',
                  description: 'Formatted discount information with currency symbol',
                  example: '$10.00-$15.00 off'
                },
                pricing: {
                  type: 'string',
                  description: 'Formatted pricing information with currency code - ranges displayed with min-max values',
                  example: '10.00-15.00 USD off'
                },
                createdById: {
                  type: 'string',
                  example: 'gid://shopify/User/12345'
                },
                companyLocationId: {
                  type: 'string',
                  description: 'Deprecated: Use companyLocation.id instead',
                  example: 'gid://shopify/CompanyLocation/12345'
                },
                companyLocation: {
                  type: 'object',
                  description: 'Company location details',
                  properties: {
                    id: {
                      type: 'string',
                      example: 'gid://shopify/CompanyLocation/12345'
                    },
                    name: {
                      type: 'string',
                      example: 'Headquarters'
                    },
                    externalId: {
                      type: 'string',
                      nullable: true,
                      example: 'HQ001'
                    }
                  }
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-04-15T08:30:00Z'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-04-15T08:30:00Z'
                }
              }
            }
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
                "path": ["storeName"],
                "message": "Store name is required"
              }
            ]
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