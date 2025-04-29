import { ProductSearchResponse } from "~/types/product-variant/product-variant-search.schema";
import { Fragment } from "react";
import {
  Box,
  Checkbox,
  InlineGrid,
  InlineStack,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import { formatPrice } from "~/lib/utils";
import _ from "lodash";
import { useTranslation } from "react-i18next";
export interface SelectedState {
  [productId: string]: {
    isSelected: boolean | "indeterminate";
    variants: {
      [variantId: string]: boolean;
    };
  };
}

interface ProductSelectTreeProps {
  products: ProductSearchResponse["products"];
  selectedProducts: SelectedState;
  onSelectionChange: (selectedProducts: SelectedState) => void;
}

export function ProductSelectTree({
  products,
  selectedProducts,
  onSelectionChange,
}: ProductSelectTreeProps) {
  const { t } = useTranslation();
  const i18nPath = "admin-portal.product-search-modal.product-select-tree";
  return (
    <div>
      {products.map((product, productIndex) => (
        <Fragment key={product.id}>
          <Box
            key={product.id}
            borderColor="border"
            borderBlockEndWidth={"025"}
            padding={"100"}
            paddingInline={"400"}
          >
            <InlineStack>
              <Checkbox
                checked={selectedProducts[product.id]?.isSelected}
                onChange={(checked) => {
                  const variants: { [variantId: string]: boolean } =
                    product.variants.nodes.reduce(
                      (acc, variant) => {
                        acc[variant.id] = checked;
                        return acc;
                      },
                      {} as { [variantId: string]: boolean },
                    );
                  onSelectionChange({
                    ...selectedProducts,
                    [product.id]: {
                      isSelected: checked,
                      variants: variants,
                    },
                  });
                }}
                label={
                  <InlineStack blockAlign="center" gap="200" wrap={false}>
                    <Thumbnail
                      source={product?.images?.nodes?.[0]?.url}
                      alt={product?.images?.nodes?.[0]?.altText || ""}
                      size="small"
                    />
                    <Text as="h3" breakWord>
                      {product.title}
                    </Text>
                  </InlineStack>
                }
              />
            </InlineStack>
          </Box>
          {product.variants.nodes.map((variant, variantIndex) => (
            <Box
              key={variant.id}
              borderColor="border"
              borderBlockEndWidth={
                productIndex === products.length - 1 &&
                variantIndex === product.variants.nodes.length - 1
                  ? "0"
                  : "025"
              }
              padding={"200"}
              paddingInlineStart={"1000"}
            >
              <InlineStack wrap={false} blockAlign="center">
                <Checkbox
                  checked={selectedProducts[product.id]?.variants[variant.id]}
                  onChange={(checked) => {
                    const newSelectedProducts = {
                      ...selectedProducts,
                      [product.id]: {
                        ...selectedProducts[product.id],
                        variants: {
                          ...selectedProducts[product.id]?.variants,
                          [variant.id]: checked,
                        },
                      },
                    };
                    const variantCount = product.variants.nodes.length;
                    const variantChecked = Object.values(
                      newSelectedProducts[product.id]?.variants,
                    ).filter(Boolean).length;
                    const productSelected =
                      variantChecked === 0
                        ? false
                        : variantChecked === variantCount
                          ? true
                          : "indeterminate";
                    newSelectedProducts[product.id] = {
                      ...newSelectedProducts[product.id],
                      isSelected: productSelected,
                    };
                    onSelectionChange(newSelectedProducts);
                  }}
                  fill
                  labelClassName="[&>.Polaris-Choice\_\_Label]:w-full"
                  label={
                    <InlineGrid
                      columns={["twoThirds", "oneThird", "oneThird"]}
                      alignItems="center"
                      gap="400"
                    >
                      <Text as="h3">{variant.title}</Text>
                      <Text as="h3" alignment="end">
                        {t(`${i18nPath}.stock`, {
                          count: _.toNumber(
                            variant?.sellableOnlineQuantity || 0,
                          ),
                        })}
                      </Text>
                      <Text as="h3" alignment="end">
                        {formatPrice(
                          variant.contextualPricing?.price?.amount || 0,
                          variant.contextualPricing?.price?.currencyCode ||
                            "USD",
                        )}
                      </Text>
                    </InlineGrid>
                  }
                />
              </InlineStack>
            </Box>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
