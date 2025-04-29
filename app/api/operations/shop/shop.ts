export async function getShop(admin: any) {
  const response = await admin.graphql(
    `#graphql
    query GetShopId {
      shop {
        id
        name
        email
        currencyCode
      }
    }`,
  );
  const json = await response.json();
  return json.data?.shop;
}
