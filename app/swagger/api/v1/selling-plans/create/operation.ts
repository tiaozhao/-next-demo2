export const createSellingPlanOperation = {
  tags: ['Selling Plans'],
  summary: 'Create a selling plan',
  description: 'Create a new selling plan with product lines and delivery policies',
  parameters: [
    {
      name: 'body',
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['storeName', 'name', 'currencyCode', 'lines', 'deliveryPolicies'],
        properties: {
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
              required: ['variantId', 'sku', 'quantity'],
              properties: {
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
              required: ['offerDiscount', 'intervalValue', 'intervalUnit'],
              properties: {
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
                  description: 'Interval unit (day, week, month, year)',
                  example: 'month'
                },
                discountType: {
                  type: 'string',
                  description: 'Discount type (percentage, fixed_amount, fixed_price)',
                  example: 'percentage'
                },
                discountValue: {
                  type: 'number',
                  description: 'Discount value',
                  example: 10
                },
                deliveryAnchor: {
                  type: 'number',
                  description: 'Delivery anchor day (1-31)',
                  example: 15
                }
              }
            }
          },
          createdById: {
            type: 'string',
            description: 'ID of user creating the plan',
            example: 'gid://shopify/User/12345'
          },
          companyLocationId: {
            type: 'string',
            description: 'Company location ID for B2B plans',
            example: 'gid://shopify/CompanyLocation/12345'
          }
        }
      }
    }
  ],
  responses: {
    '200': {
      description: 'Successfully created selling plan',
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
                "path": ["name"],
                "message": "Name must be at least 3 characters"
              }
            ]
          }
        }
      }
    },
    '409': {
      description: 'Conflict - Selling plan already exists',
      schema: {
        type: 'object',
        properties: {
          code: {
            type: 'number',
            example: 409
          },
          message: {
            type: 'string',
            example: "Selling plan with name 'Monthly Office Supplies' already exists for store 'b2b-accelerator.myshopify.com'"
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