export const queryAdminPortalCompanies = `
    {
     companies(first: 100) {
       edges {
         node {
           id
           name
         }
       }
     }
   }
`;

export const queryAdminPortalCompnayAndCompanyLocations = `
    {
      companies(first: 250) {
        edges {
          node {
            id
            name
            locations(first: 250) {
              nodes {
                id
                name
                externalId
              }
            }
          }
        }
      }
    }
`;

export const queryAdminPortalShop = `
    {
      shop {
         id
         currencyCode
      }
    }
`;
