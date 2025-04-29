import type { CustomerCodeParams } from "~/types/quick-order";
import { queryMultipleProducts } from "./graphql/quick-order";

import { globalFetch } from "~/lib/fetch";
import type {
  VariantPriceRequest,
  VariantPricesResponse,
} from "~/types/product-variant/variant-prices.schema";
import _ from "lodash";

export const searchProductPriceByVariants = async (
  params: VariantPriceRequest,
): Promise<VariantPricesResponse> => {
  const response = await globalFetch(`/product-variant/price/get-by-ids`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response;
};

export const searchMultipleProducts = async (ids: string[]) => {
  const storeName = localStorage.getItem("store-name") ?? "";

  const response = await globalFetch(`/storefront/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: storeName,
      query: queryMultipleProducts,
      variables: {
        productIds: ids,
      },
    }),
  });

  const data = await response;

  return data.data.nodes;
};

export const getCustomerPartnerNumberBySku = async (params: {
  storeName: string;
  companyId: string;
  skuIds: string[];
}) => {
  const response = await globalFetch(
    `/product-variant/customer-partner-number/get-by-sku`,
    {
      method: "POST",
      body: JSON.stringify(params),
    },
  );
  return response;
};
