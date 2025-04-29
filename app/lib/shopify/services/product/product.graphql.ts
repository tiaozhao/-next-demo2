export const GET_SINGLE_PRODUCT_RECOMMENDATION = `
  query productRecommendations($productId: ID!, $intent: ProductRecommendationIntent!) {
    productRecommendations(productId: $productId, intent: $intent) {
    id
    variants(first:10){
        edges{
            node{
                id
                sku
                price{
                    amount
                    currencyCode
                }
            }
        }
      }
    }
  }
`;

export const GET_PRODUCTS_BY_SKUS = `
  query getProductsBySKUs($query: String!, $first: Int!,$companyLocationId:ID) {
    products(first: $first, query: $query) {
      nodes {
        id
        title
        description
        handle
        onlineStoreUrl
        images(first: 1) {
          nodes {
            id
            url
          }
        }
        updatedAt
        variants(first: 100) {
          nodes {
            id
            title
            sku
            price
            inventoryQuantity
            availableForSale
            sellableOnlineQuantity
            metafield(namespace: "custom", key: "custom_uom") {
              id
              namespace
              key
              value
            }
            contextualPricing(context: { companyLocationId: $companyLocationId }) {
              price {
                amount
                currencyCode
              }
              quantityRule {
                minimum
                maximum
                increment
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_VARIANT_WEIGHT = `
query getProducts($first: Int,$after: String,$query: String) {
  products(first: $first,after: $after, query: $query) {
    edges {
      cursor
      node {
        title
        variants(first: 100){
            nodes{
                sku
                weight
                weightUnit
            }

        }
      }
    }
    pageInfo{
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
    }
  }
}`;




export const SEARCH_PRODUCTS_WITH_VISIBILITY = `
 query SearchProductsWithVisibility($query: String!, $companyLocationId: ID!) {
    # Search products with minimal fields first
    products(first: 100, query: $query) {
      nodes {
        id
        title
        description
        handle
        onlineStoreUrl
        images(first: 1) {
          nodes {
            id
            url
          }
        }
        updatedAt
        vendor
        variants(first: 50) {
          nodes {
            id
            title
            sku
            availableForSale
            sellableOnlineQuantity
            price
            metafields(namespace: "custom",first: 30) {
                nodes{
                    key
                    value
                }
            }
            contextualPricing(context: { companyLocationId: $companyLocationId }) {
              price {
                amount
                currencyCode
              }
              quantityRule {
                minimum
                maximum
                increment
              }
            }
          }
        }
      }
    }
    # Get visible products with minimal fields
    companyLocation(id: $companyLocationId) {
      id
      catalogs(first: 100) {
        edges {
          node {
            id
            publication {
              products(first: 100) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

/**
 * Product search query for retrieving products with detailed information
 */
export const SEARCH_PRODUCTS = `
  query SearchProducts($query: String!, $companyLocationId: ID!, $first: Int!) {
    products(first: $first, query: $query) {
      nodes {
        id
        title
        description
        handle
        onlineStoreUrl
        images(first: 1) {
          nodes {
            id
            url
          }
        }
        updatedAt
        vendor
        variants(first: 50) {
          nodes {
            id
            title
            sku
            availableForSale
            sellableOnlineQuantity
            price
            metafields(namespace: "custom", first: 30) {
              nodes {
                key
                value
              }
            }
            contextualPricing(context: { companyLocationId: $companyLocationId }) {
              price {
                amount
                currencyCode
              }
              quantityRule {
                minimum
                maximum
                increment
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Query to retrieve visible products for a company location
 */
export const GET_COMPANY_LOCATION_VISIBLE_PRODUCTS = `
  query GetCompanyLocationVisibleProducts($companyLocationId: ID!) {
    companyLocation(id: $companyLocationId) {
      id
      catalogs(first: 100) {
        edges {
          node {
            id
            publication {
              products(first: 100) {
                edges {
                  node {
                    id
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

export const GET_PRODUCTS_BY_SKU_SET = `
query getProductsBySkuSet($first: Int!, $query: String!, $after: String) {
  products(first: $first, query: $query, after: $after) {
    edges {
      cursor
      node {
        id
        variants(first: 100){
          nodes{
            sku
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
      startCursor
    }
  }
}`;
