import {
  Icon,
  Modal,
  TextField,
  InlineStack,
  Spinner,
  Scrollable,
  Button,
  Box,
  Text,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import { useGetProductVariantsByApi } from "~/hooks/use-product-search";
import { SubscriptionPlanFormDataErrorState } from "~/types/subscription-plan.types";
import { SearchIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import _ from "lodash";
import { ProductSelectTree } from "./ProductSelectTree";
import type { SelectedState } from "./ProductSelectTree";
import { ProductSearchResponse } from "~/types/product-variant/product-variant-search.schema";

export type ProductSearchModalSelectedProduct =
  ProductSearchResponse["products"][0] & {
    variants: {
      nodes: Array<
        ProductSearchResponse["products"][0]["variants"]["nodes"][0] & {
          isSelected: boolean;
        }
      >;
    };
  };

interface ProductSearchModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  storeName: string;
  companyLocationId: string;
  companyId: string;
  onProductSelect?: (
    selectedProducts: ProductSearchModalSelectedProduct[],
  ) => void;
  initialSelectedProducts?: SelectedState;
}

export const ProductSearchModal = ({
  open,
  setOpen,
  storeName,
  companyLocationId,
  companyId,
  onProductSelect,
  initialSelectedProducts,
}: ProductSearchModalProps) => {
  const i18nPath = "admin-portal.product-search-modal";
  const { t } = useTranslation();
  const [textFieldValue, setTextFieldValue] =
    useState<string>("single handle pull");
  const [productSearchQuery, setProductSearchQuery] = useState<string[]>([
    textFieldValue,
  ]);
  const [productSearchError, setProductSearchError] =
    useState<SubscriptionPlanFormDataErrorState>({
      isError: false,
      msg: "",
    });
  const [selectedProducts, setSelectedProducts] = useState<SelectedState>(
    initialSelectedProducts || {},
  );
  const [selectedProductsData, setSelectedProductsData] = useState<
    ProductSearchModalSelectedProduct[]
  >([]);

  const debouncedSearch = useCallback(
    _.debounce((query: string) => {
      setProductSearchQuery([query]);
    }, 500),
    [],
  );
  const handleProductSearchQueryChange = (query: string) => {
    if (query.length === 0) {
      setProductSearchQuery([]);
      setTextFieldValue("");
    } else {
      setTextFieldValue(query);
      debouncedSearch(query);
    }
  };
  const { data: productVariants, isLoading: isProductVariantsLoading } =
    useGetProductVariantsByApi({
      query: productSearchQuery,
      storeName: storeName,
      customerId: "staffId",
      companyLocationId: companyLocationId,
      companyId: companyId,
    });

  useEffect(() => {
    if (productSearchQuery) {
      if (productVariants) {
        if (productVariants.products.length === 0) {
          setProductSearchError({
            isError: true,
            msg: t(`${i18nPath}.search-empty-result`),
          });
          return;
        }
      }
    }
    setProductSearchError({
      isError: false,
      msg: "",
    });
  }, [productVariants, productSearchQuery]);

  useEffect(() => {
    if (isProductVariantsLoading) {
      setProductSearchError({
        isError: false,
        msg: "",
      });
    }
  }, [isProductVariantsLoading]);

  const handleSelectionChange = (newSelectedProducts: SelectedState) => {
    setSelectedProducts(newSelectedProducts);
    if (productVariants?.products) {
      // Get the list of product IDs from current search results
      const currentProductIds = productVariants.products.map(
        (product) => product.id,
      );

      // Keep previously selected products that are not in current search results
      const existingSelectedProducts = selectedProductsData.filter(
        (product) => !currentProductIds.includes(product.id),
      );

      // Process products from current search results
      const newFilteredProducts = productVariants.products
        .filter((product) => {
          const selectedProduct = newSelectedProducts[product.id];
          return (
            selectedProduct &&
            _.some(
              selectedProduct.variants,
              (isSelected) => isSelected === true,
            )
          );
        })
        .map((product) => {
          const selectedProduct = newSelectedProducts[product.id];
          // Return all variants with their selection status
          const variantsWithSelection = product.variants.nodes.map(
            (variant) => ({
              ...variant,
              isSelected: selectedProduct?.variants[variant.id] || false,
            }),
          );

          return {
            ...product,
            variants: {
              ...product.variants,
              nodes: variantsWithSelection,
            },
          } as ProductSearchModalSelectedProduct;
        });

      // Merge existing selections with new selections
      setSelectedProductsData([
        ...existingSelectedProducts,
        ...newFilteredProducts,
      ]);
    }
  };

  const handleConfirm = () => {
    onProductSelect?.(selectedProductsData);
    setOpen(false);
  };

  const selectedProductsCount = _.reduce(
    selectedProducts,
    (sum, productState) => {
      return (
        sum +
        _.sumBy(Object.values(productState.variants), (isSelected) =>
          isSelected ? 1 : 0,
        )
      );
    },
    0,
  );

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t(`${i18nPath}.label`)}
    >
      <Modal.Section>
        <TextField
          label={""}
          value={textFieldValue}
          prefix={<Icon source={SearchIcon} tone="base" />}
          onChange={handleProductSearchQueryChange}
          autoComplete="off"
          placeholder={t(`${i18nPath}.placeholder`)}
          disabled={!companyId || !companyLocationId}
          error={productSearchError.isError && productSearchError.msg}
        />
      </Modal.Section>
      {isProductVariantsLoading && (
        <Modal.Section>
          <InlineStack align="center">
            <Spinner size="small" />
          </InlineStack>
        </Modal.Section>
      )}
      {!isProductVariantsLoading && productVariants?.products && (
        <Scrollable style={{ maxHeight: "480px" }}>
          <ProductSelectTree
            products={productVariants.products}
            selectedProducts={selectedProducts}
            onSelectionChange={handleSelectionChange}
          />
        </Scrollable>
      )}
      <Box borderBlockStartWidth="025" borderColor="border" padding={"400"}>
        <InlineStack gap="200" align="space-between">
          <Text as="h3" alignment="end">
            {t(`${i18nPath}.selected-products`, {
              count: selectedProductsCount,
            })}
          </Text>
          <InlineStack gap="200" align="end">
            <Button variant="primary" onClick={handleConfirm}>
              {t(`${i18nPath}.confirm`)}
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              {t(`${i18nPath}.cancel`)}
            </Button>
          </InlineStack>
        </InlineStack>
      </Box>
    </Modal>
  );
};
