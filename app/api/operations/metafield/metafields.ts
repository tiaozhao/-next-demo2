import { ShopifyClientManager } from "~/lib/shopify/client";

interface MetafieldDefinition {
  namespace: string;
  key: string;
  ownerType: string;
  name: string;
  type: string;
  description?: string;
  access?: {
    admin: string;
    storefront: string;
    customerAccount: string;
  };
}

interface MetafieldsSetInput {
  namespace: string;
  key: string;
  value: string;
  ownerId: string
  type: string
}

export async function checkMetafieldDefinition(admin: any, definition: MetafieldDefinition,shop) {
  // const response = await admin.graphql(
  //   `#graphql
  //   query GetMetafieldDefinition($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
  //     metafieldDefinitions(first: 1, ownerType: $ownerType, namespace: $namespace, key: $key) {
  //       nodes {
  //         id
  //         name
  //       }
  //     }
  //   }`,
  //   {
  //     variables: {
  //       namespace: definition.namespace,
  //       key: definition.key,
  //       ownerType: definition.ownerType,
  //     }
  //   }
  // );

  const client = await ShopifyClientManager.getClientV2410(shop);

  const response = await client.request(`query GetMetafieldDefinition($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
      metafieldDefinitions(first: 1, ownerType: $ownerType, namespace: $namespace, key: $key) {
        nodes {
          id
          name
        }
      }
    }`, {
    variables: {
      namespace: definition.namespace,
      key: definition.key,
      ownerType: definition.ownerType,
    }
  });
  console.log('metafileds query reponse: '+JSON.stringify(response))
  
  return response.data?.metafieldDefinitions?.nodes || [];
}

export async function createMetafieldDefinition(admin: any, definition: MetafieldDefinition,shop) {
  // const response = await admin.graphql(
  //   `#graphql
  //   mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  //     metafieldDefinitionCreate(definition: $definition) {
  //       createdDefinition {
  //         id
  //         name
  //       }
  //       userErrors {
  //         field
  //         message
  //         code
  //       }
  //     }
  //   }`,
  //   {
  //     variables: {
  //       definition
  //     }
  //   }
  // );
  // return response.json();

  const client = await ShopifyClientManager.getClientV2410(shop);

  const response = await client.request(` mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
        }
        userErrors {
          field
          message
          code
        }
      }
    }`, {
    variables: {
      definition
    }
  });

  console.log('metafileds createdDefinition reponse: '+JSON.stringify(response))

  return response


}

export async function setMetafieldValue(admin: any, data: MetafieldsSetInput,shop ) {
  // const response = await admin.graphql(
  //   `#graphql
  // mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  //   metafieldsSet(metafields: $metafields) {
  //     metafields {
  //       key
  //       namespace
  //       value
  //       createdAt
  //       updatedAt
  //     }
  //     userErrors {
  //       field
  //       message
  //       code
  //     }
  //   }
  // }`,
  //   {
  //     variables: {
  //       "metafields": [
  //         data
  //       ]
  //     },
  //   },
  // );

  const client = await ShopifyClientManager.getClientV2410(shop);

  const response = await client.request(`mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }`, {
  variables: {
    "metafields":[
      data
    ]
  }
});

  console.log('metafileds metafieldsSet reponse: '+JSON.stringify(response))


  return response;
}
