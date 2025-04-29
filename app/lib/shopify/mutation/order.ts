export const UPDATE_ORDER_METAFIELD = `
mutation UpdateOrderMetafield($input: OrderInput!) {
  orderUpdate(input: $input) {
    order {
      id
    metafield(namespace: "custom", key: "draftOrder") {
      id
      namespace
      key
      value
    }
    }
    userErrors {
      message
      field
    }
  }
}
`;



export const ORDER_CREATE = `
  mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      userErrors {
        field
        message
      }
      order {
        id
        email
        name
        phone
        processedAt
        cancelledAt
        closed
        totalPriceSet {
          presentmentMoney {
            amount
            currencyCode
          }
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          displayName
          firstName
          lastName
          email
        }
      }
    }
  }
`; 