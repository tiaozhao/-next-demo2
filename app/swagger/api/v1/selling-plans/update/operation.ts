export const updateSellingPlanOperation = {
  tags: ['Selling Plans'],
  summary: 'Update a selling plan',
  description: 'Update an existing selling plan with optional changes to lines and delivery policies',
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
          name: {
            type: 'string',
            description: 'Selling plan name',
            example: 'Monthly Office Supplies'
          },
          description: {
            type: 'string',
            description: 'Selling plan description',
            example: 'Office supplies delivered every month'
          },
          currencyCode: {
            type: 'string',
            description: 'Currency code (3 characters)',
            example: 'USD'
          },
          lines: {
            type: 'array',
            description: 'Product lines in the selling plan',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Line ID (omit for new lines)',
                  example: 1
                },
                variantId: {
                  type: 'string',
                  description: 'Product variant ID',
                  example: 'gid://shopify/ProductVariant/12345'
                },
                sku: {
                  type: 'string',
                  description: 'Product SKU',
                  example: 'PAPER-A4-500'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantity',
                  example: 2
                }
              }
            }
          },
          deliveryPolicies: {
            type: 'array',
            description: 'Delivery policies',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Policy ID (omit for new policies)',
                  example: 1
                },
                offerDiscount: {
                  type: 'boolean',
                  description: 'Whether to offer a discount',
                  example: true
                },
                intervalValue: {
                  type: 'number',
                  description: 'Interval value',
                  example: 1
                },
                intervalUnit: {
                  type: 'string',
                  description: 'Interval unit',
                  example: 'MONTH'
                },
                discountType: {
                  type: 'string',
                  description: 'Discount type',
                  example: 'PERCENTAGE'
                },
                discountValue: {
                  type: 'number',
                  description: 'Discount value',
                  example: 10
                },
                deliveryAnchor: {
                  type: 'number',
                  description: 'Delivery anchor day',
                  example: 15
                }
              }
            }
          },
          linesToDelete: {
            type: 'array',
            description: 'IDs of lines to delete',
            items: {
              type: 'number'
            },
            example: [3, 4]
          },
          policiesToDelete: {
            type: 'array',
            description: 'IDs of policies to delete',
            items: {
              type: 'number'
            },
            example: [2]
          },
          updatedById: {
            type: 'string',
            description: 'ID of user updating the plan',
            example: 'gid://shopify/User/12345'
          },
          companyLocationId: {
            type: 'string',
            description: 'Company location ID',
            example: 'gid://shopify/CompanyLocation/12345'
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully updated selling plan',
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
                  type: 'number',
                  example: 1
                },
                variantId: {
                  type: 'string',
                  example: 'gid://shopify/ProductVariant/12345'
                },
                sku: {
                  type: 'string',
                  example: 'PAPER-A4-500'
                },
                quantity: {
                  type: 'number',
                  example: 2
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
                  example: 'MONTH'
                },
                discountType: {
                  type: 'string',
                  example: 'PERCENTAGE'
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
          updatedById: {
            type: 'string',
            example: 'gid://shopify/User/12345'
          },
          companyLocationId: {
            type: 'string',
            example: 'gid://shopify/CompanyLocation/12345'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-04-15T08:30:00Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-04-16T09:45:00Z'
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
            example: 'Selling plan with ID 1 not found'
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