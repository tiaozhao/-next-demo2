import {
  useMutation,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import _ from "lodash";
import {
  PRODUCT_PRICE,
  PRODUCTS_BY_IDS,
  QUERY_CUSTOMER_PARTNER_NUMBER_BY_SKU,
  QUERY_PRODUCT_PRICE_BY_VARIANTS,
  QUERY_PRODUCT_VARIANTS_BY_API,
} from "~/constant/react-query-keys";
import { searchMultipleProductsPriceListAjax } from "~/request/compare";
import { getProductVariantsByApi } from "~/request/quick-order";
import {
  getCustomerPartnerNumberBySku,
  searchMultipleProducts,
  searchProductPriceByVariants,
} from "~/request/search-product";
import {
  type ProductSearchResponse,
  type ProductVariantSearchRequest,
} from "~/types/product-variant/product-variant-search.schema";
import { VariantPriceRequest } from "~/types/product-variant/variant-prices.schema";

export function useMultipleProducts(ids: string[]) {
  const fullIds = _.map(ids, (id) => `gid://shopify/Product/${id}`);

  const queryResult = useQuery({
    queryKey: [PRODUCTS_BY_IDS, ids],
    queryFn: async () => {
      return await searchMultipleProducts(fullIds);
    },
    enabled: !!ids.length,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return queryResult;
}

export function useProductInfo(productId: string) {
  const queryResult = useQuery({
    queryKey: [PRODUCT_PRICE, productId],
    queryFn: async () => {
      return await searchMultipleProductsPriceListAjax(productId);
    },
    retry: false,
  });

  return queryResult;
}

export function useCustomerPartnerNumberBySku(
  params: {
    storeName: string;
    companyId: string;
    skuIds: string[];
  },
  enabled = true,
) {
  const queryResult = useQuery({
    queryKey: [QUERY_CUSTOMER_PARTNER_NUMBER_BY_SKU, params],
    queryFn: async () => {
      return await getCustomerPartnerNumberBySku(params);
    },
    enabled: !!params.skuIds.length && enabled,
  });
  return queryResult;
}

export function useCustomerPartnerNumberBySkuMutation() {
  const queryResult = useMutation({
    mutationFn: async (params: {
      storeName: string;
      companyId: string;
      skuIds: string[];
    }) => {
      return await getCustomerPartnerNumberBySku(params);
    },
  });
  return queryResult;
}

export function useGetProductVariantsByApi(
  params: ProductVariantSearchRequest,
  enabled = true,
): UseQueryResult<ProductSearchResponse> {
  const queryResult = useQuery({
    queryKey: [QUERY_PRODUCT_VARIANTS_BY_API, params],
    queryFn: async () => {
      return await getProductVariantsByApi(params);
    },
    enabled: !!params.query && !!params.query.length && enabled,
  });
  return queryResult;
}

export function useGetProductVariantsByApiMutation() {
  const queryResult = useMutation({
    mutationFn: async (params: ProductVariantSearchRequest) => {
      return await getProductVariantsByApi(params);
    },
  });
  return queryResult;
}

export function useGetProductPriceByVariants(params: VariantPriceRequest) {
  const enabled = !!params.variantIds.length;
  const queryResult = useQuery({
    queryKey: [QUERY_PRODUCT_PRICE_BY_VARIANTS, params],
    queryFn: async () => {
      return await searchProductPriceByVariants(params);
    },
    enabled,
  });
  return queryResult;
}
