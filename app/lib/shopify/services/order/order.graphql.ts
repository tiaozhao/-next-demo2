/**
 * Order service GraphQL queries
 */

/**
 * Query to get recent order items for recommendations
 */
export const GET_RECENT_ORDER_ITEMS_QUERY = `
  query GetRecentOrderItems($companyLocationId: String!, $first: Int!) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $companyLocationId) {
      edges {
        node {
          id
          createdAt
          tags
          lineItems(first: 10) {
            edges {
              node {
                id
                name
                quantity
                sku
                product{
                  id
                  title
                  handle
                }
                unfulfilledOriginalTotalSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`; 