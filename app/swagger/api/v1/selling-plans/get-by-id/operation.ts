export const getSellingPlanByIdOperation = {
  tags: ['Selling Plans'],
  summary: 'Get selling plan by ID',
  description: 'Retrieve a selling plan by ID with detailed product and policy information',
  parameters: [
    {
      name: 'body',
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['id', 'storeName'],
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
            description: 'Customer ID (optional)',
            example: 'gid://shopify/Customer/12345'
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully retrieved selling plan',
      schema: {
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
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'gid://shopify/Product/12345'
                },
                title: {
                  type: 'string',
                  example: 'Premium Paper'
                },
                description: {
                  type: 'string',
                  example: 'High-quality A4 paper for office use'
                },
                handle: {
                  type: 'string',
                  example: 'premium-paper'
                },
                image: {
                  type: 'array',
                  items: {
                    type: 'object'
                  },
                  example: []
                },
                variant: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: 'gid://shopify/ProductVariant/12345'
                    },
                    title: {
                      type: 'string',
                      example: 'A4 500 Sheets'
                    },
                    sku: {
                      type: 'string',
                      example: 'PAPER-A4-500'
                    },
                    customerPartnerNumber: {
                      type: 'string',
                      example: 'CPN12345'
                    },
                    quantity: {
                      type: 'number',
                      example: 2
                    },
                    price: {
                      type: 'number',
                      example: 9.99
                    },
                    metafield: {
                      type: 'object',
                      example: null
                    }
                  }
                }
              }
            }
          },
          deliveryPolicies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  example: 1
                },
                offerDiscount: {
                  type: 'boolean',
                  example: true
                },
                intervalValue: {
                  type: 'number',
                  example: 1
                },
                intervalUnit: {
                  type: 'string',
                  example: 'month'
                },
                discountType: {
                  type: 'string',
                  example: 'percentage'
                },
                discountValue: {
                  type: 'number',
                  example: 10
                },
                deliveryAnchor: {
                  type: 'number',
                  example: 15
                }
              }
            }
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
              },
              company: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'gid://shopify/Company/6789'
                  }
                }
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
                "message": "Expected number, received string"
              }
            ]
          }
        }
      }
    },
    '404': {
      description: 'Not Found - Selling plan not found',
      schema: {
        type: 'object',
        properties: {
          code: {
            type: 'number',
            example: 404
          },
          message: {
            type: 'string',
            example: 'Selling plan not found'
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