export const GET_CATALOGS = `
  query GetCatalogs($query: String!) {
    catalogs(first: 100, query: $query) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`; 


export const GET_CATALOG_PRODUCTS_WITH_VARIANTS = `
query GetCatalogProductsWithVariants($query: String!) {
  catalogs(first: 100, query: $query) {
    edges {
      node {
        id
        title
        publication {
          products(first: 50) {
            edges {
              node {
                id
                title
                variants(first: 50) {
                  edges {
                    node {
                      id
                      sku
                    }
                  }
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