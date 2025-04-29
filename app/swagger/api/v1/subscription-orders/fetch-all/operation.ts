export const fetchSubscriptionOrdersOperation = {
  tags: ['Subscription Orders'],
  summary: 'Fetch all subscription orders',
  description: 'Fetch all subscription orders with filtering, pagination, and sorting',
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
            description: 'Customer ID',
            example: 'gid://shopify/Customer/123456'
          },
          companyLocationId: {
            type: 'string',
            description: 'Company location ID (optional)',
            example: 'gid://shopify/CompanyLocation/6501466332'
          },
          subscriptionContractId: {
            type: 'number',
            description: 'Subscription contract ID (optional)',
            example: 12
          },
          filter: {
            type: 'object',
            properties: {
              status: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['completed', 'open', 'cancelled', 'pending']
                },
                description: 'Filter by status',
                example: ['completed', 'open']
              },
              poNumber: {
                type: 'string',
                description: 'Filter by purchase order number (fuzzy match)',
                example: 'PO-1122'
              },
              orderNumber: {
                type: 'string',
                description: 'Filter by order number (fuzzy match)',
                example: '#1002'
              },
              approvedByName: {
                type: 'string',
                description: 'Filter by approver name (fuzzy match)',
                example: 'Zhang'
              },
              createdFrom: {
                type: 'string',
                format: 'date',
                description: 'Filter by creation date from',
                example: '2024-03-01'
              },
              createdTo: {
                type: 'string',
                format: 'date',
                description: 'Filter by creation date to',
                example: '2024-04-01'
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'number',
                minimum: 1,
                description: 'Page number',
                example: 1
              },
              pageSize: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                description: 'Page size',
                example: 10
              }
            }
          },
          sort: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: [
                  'createdAt',
                  'orderNumber',
                  'poNumber',
                  'orderTotal',
                  'status',
                  'orderedDate',
                  'createdByName',
                  'approvedByName'
                ],
                description: 'Sort field',
                example: 'createdAt'
              },
              order: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order',
                example: 'desc'
              }
            }
          }
        }
      }
    }
  ],
  security: [{ bearerAuth: [] }],
  responses: {
    '200': {
      description: 'Successfully fetched subscription orders',
      schema: {
        type: 'object',
        properties: {
          total: {
            type: 'number',
            description: 'Total number of subscription orders',
            example: 44
          },
          page: {
            type: 'number',
            description: 'Current page number',
            example: 1
          },
          pageSize: {
            type: 'number',
            description: 'Number of items per page',
            example: 10
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Subscription order ID',
                  example: 8
                },
                subscriptionContractId: {
                  type: 'number',
                  description: 'Subscription contract ID',
                  example: 6
                },
                shopifyOrderId: {
                  type: 'string',
                  description: 'Shopify order ID',
                  example: 'gid://shopify/Order/6268447817948'
                },
                orderNumber: {
                  type: 'string',
                  description: 'Order number',
                  example: '#297450'
                },
                poNumber: {
                  type: 'string',
                  nullable: true,
                  description: 'Purchase order number',
                  example: 'PO-1122'
                },
                status: {
                  type: 'string',
                  description: 'Order status',
                  example: 'OPEN'
                },
                createdById: {
                  type: 'string',
                  nullable: true,
                  description: 'ID of the user who created the order',
                  example: '123456'
                },
                createdByName: {
                  type: 'string',
                  description: 'Name of the user who created the order',
                  example: 'test'
                },
                approvedById: {
                  type: 'string',
                  nullable: true,
                  description: 'ID of the user who approved the order',
                  example: '789012'
                },
                approvedByName: {
                  type: 'string',
                  description: 'Name of the user who approved the order',
                  example: 'Emma Zhang'
                },
                orderedDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the order was placed',
                  example: '2025-04-01T08:31:39.934Z'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the order record was created',
                  example: '2025-04-01T08:31:39.936Z'
                },
                orderTotal: {
                  type: 'string',
                  description: 'Total order amount with currency',
                  example: '$147.18'
                }
              }
            }
          }
        }
      }
    },
    '400': {
      description: 'Bad Request - Invalid parameters or validation failed',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Invalid input, check details for more information'
          },
          details: {
            type: 'object',
            example: {
              "storeName": ["Store name is required"]
            }
          },
          status: {
            type: 'number',
            example: 400
          }
        }
      }
    },
    '401': {
      description: 'Unauthorized - Authentication required',
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
    '403': {
      description: 'Forbidden - Insufficient permissions',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'You do not have permission to access this resource'
          },
          status: {
            type: 'number',
            example: 403
          }
        }
      }
    },
    '500': {
      description: 'Internal Server Error',
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'An unexpected error occurred while processing your request'
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