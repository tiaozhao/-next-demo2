import { useSearchParams } from "@remix-run/react";
import { useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import noImage from "~/assets/icons/icon-no-image.svg";
import { AddToListButtons } from "~/components/quick-order/AddToListButtons";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PRODUCTS_BY_IDS } from "~/constant/react-query-keys";
import { useAddToCartAjax } from "~/hooks/use-cart";
import { useMultipleProducts } from "~/hooks/use-product-search";
import { useShopifyInformation } from "~/lib/shopify";
import { cn, extractShopifyId, formatPrice } from "~/lib/utils";
import { searchMultipleProductsPriceListAjax } from "~/request/compare";
import { searchProductPriceByVariants } from "~/request/search-product";

interface Metafield {
  value: string;
  key: string;
  namespace: string;
}

interface ProductNode {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      price: {
        amount: string;
        currencyCode: string;
      };
      sku?: string;
      weight?: number;
      weightUnit?: string;
      metafields: Array<Metafield> | null;
      quantityRule?: {
        minimum?: number;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        url: string;
      };
    }>;
  };
}

interface SelectedVariants {
  [key: string]: string;
}

const COLOR_MAP: { [key: string]: string } = {
  "#ff0018": "Red",
  "#000000": "Black",
  "#ffffff": "White",
  "#0000ff": "Blue",
  "#008000": "Green",
  "#ffff00": "Yellow",
  "#ffa500": "Orange",
  "#800080": "Purple",
  "#a52a2a": "Brown",
  "#808080": "Gray",
  "#ffc0cb": "Pink",
  "#40e0d0": "Turquoise",
  "#c0c0c0": "Silver",
  "#ffd700": "Gold",
  "#00ffff": "Cyan",
  "#ff00ff": "Magenta",
};

function decimalToFraction(decimal: number): string {
  if (Number.isInteger(decimal)) return decimal.toString();

  let numerator = 1;
  let denominator = 1;
  let bestError = Math.abs(decimal - numerator / denominator);

  for (let d = 1; d <= 16; d++) {
    // Max denominator of 16
    const n = Math.round(decimal * d);
    const error = Math.abs(decimal - n / d);
    if (error < bestError) {
      bestError = error;
      numerator = n;
      denominator = d;
    }
  }

  const wholePart = Math.floor(numerator / denominator);
  numerator = numerator % denominator;

  if (numerator === 0) return wholePart.toString();
  if (wholePart === 0) return `${numerator}/${denominator}`;
  return `${wholePart}-${numerator}/${denominator}`;
}

const TABLE_CONFIG = [
  {
    id: "sku",
    label: "SKU ID",
    getValue: (product: ProductNode, selectedVariant: any) =>
      selectedVariant?.sku || "-",

    bgColor: "bg-gray-50",
    borderStyle: "border-t border-x",
  },
  {
    id: "vendor",
    label: "Vendor",
    getValue: (product: ProductNode) => product?.vendor || "-",
    bgColor: "bg-white",
    borderStyle: "border-x",
  },
  {
    id: "price",
    label: "Price",
    getValue: (
      product: ProductNode,
      selectedVariant: any,
      comparePriceMapping: any,
    ) => {
      if (!selectedVariant?.sku || !comparePriceMapping) return "-";
      return (
        <ProductPrice
          {...(comparePriceMapping[selectedVariant.sku] || {
            amount: 0,
            currencyCode: "USD",
          })}
        />
      );
    },
    bgColor: "bg-gray-50",
    borderStyle: "border-x",
  },
  {
    id: "uom",
    label: "UOM",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const uomMetafield = selectedVariant.metafields.find(
        (m: Metafield) => m?.key === "custom_uom",
      );
      return uomMetafield?.value || "-";
    },
    bgColor: "bg-white",
    borderStyle: "border-x",
  },
  {
    id: "material",
    label: "Material",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const materialMetafield = selectedVariant.metafields.find(
        (m: Metafield) => m?.key === "material",
      );
      if (materialMetafield?.value) {
        try {
          const materialData = JSON.parse(materialMetafield.value);
          return materialData?.primaryMaterial?.name || "-";
        } catch {
          return "-";
        }
      }
      return "-";
    },
    bgColor: "bg-gray-50",
    borderStyle: "border-x",
  },
  {
    id: "length",
    label: "Length",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const dimensionsMetafield = selectedVariant.metafields.find(
        (m: Metafield) => m?.key === "dimensions",
      );
      if (dimensionsMetafield?.value) {
        try {
          const dimensions = JSON.parse(dimensionsMetafield.value);
          if (!dimensions?.length?.value) return "-";
          const value = decimalToFraction(dimensions.length.value);
          return `${value} ${dimensions.length.unit}`;
        } catch {
          return "-";
        }
      }
      return "-";
    },
    bgColor: "bg-white",
    borderStyle: "border-x",
  },
  {
    id: "width",
    label: "Width",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const dimensionsMetafield = selectedVariant.metafields.find(
        (m: Metafield) =>
          m?.key === "dimensions" &&
          m?.namespace === "app--193933737985--custom",
      );
      if (dimensionsMetafield?.value) {
        try {
          const dimensions = JSON.parse(dimensionsMetafield.value);
          const value = decimalToFraction(dimensions.width.value);
          return `${value} ${dimensions.width.unit}`;
        } catch {
          return "-";
        }
      }
      return "-";
    },
    bgColor: "bg-gray-50",
    borderStyle: "border-x",
  },
  {
    id: "height",
    label: "Height",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const dimensionsMetafield = selectedVariant.metafields.find(
        (m: Metafield) =>
          m?.key === "dimensions" &&
          m?.namespace === "app--193933737985--custom",
      );
      if (dimensionsMetafield?.value) {
        try {
          const dimensions = JSON.parse(dimensionsMetafield.value);
          const value = decimalToFraction(dimensions.height.value);
          return `${value} ${dimensions.height.unit}`;
        } catch {
          return "-";
        }
      }
      return "-";
    },
    bgColor: "bg-white",
    borderStyle: "border-x",
  },
  {
    id: "weight",
    label: "Weight",
    getValue: (product: ProductNode, selectedVariant: any) =>
      selectedVariant.weight && selectedVariant.weightUnit
        ? `${selectedVariant.weight} ${selectedVariant.weightUnit}`
        : "-",
    bgColor: "bg-gray-50",
    borderStyle: "border-x",
  },
  {
    id: "color",
    label: "Color",
    getValue: (product: ProductNode, selectedVariant: any) => {
      if (!selectedVariant?.metafields) return "-";

      const colorMetafield = selectedVariant.metafields.find(
        (m: Metafield) => m?.key === "color",
      );

      if (colorMetafield?.value) {
        const hexColor = colorMetafield.value.toLowerCase();
        return COLOR_MAP[hexColor] || hexColor;
      }

      return "-";
    },
    bgColor: "bg-white",
    borderStyle: "border-x border-b",
  },
];

function ProductPrice({
  amount,
  currencyCode,
}: {
  amount: string;
  currencyCode: string;
}) {
  return <>{formatPrice(Number(amount), currencyCode)}</>;
}

export default function CompareRoute() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [productIds, setProductIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariants>(
    {},
  );
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [comparePriceMapping, setComparePriceMapping] = useState<{
    [key: string]: {
      amount: number;
      currencyCode: string;
    };
  }>({});
  const [configMaxHeights, setConfigMaxHeights] = useState<{
    [key: string]: number;
  }>({});

  const { storeName, shopifyCustomerId, shopifyCompanyLocationId } =
    useShopifyInformation();

  const returnTo = searchParams.get("returnTo") || "/collections/all";

  const { mutateAsync: addToCartAjax } = useAddToCartAjax();

  useEffect(() => {
    try {
      const storedData = localStorage.getItem("compare-product-ids");
      if (storedData) {
        const compareProducts = JSON.parse(storedData);
        const ids = compareProducts.map((item: any) => item[0]);
        setProductIds(ids);
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  }, []);

  const { data: productsData, isLoading } = useMultipleProducts(productIds);

  useEffect(() => {
    if (productsData && productsData.length > 0) {
      const initialSelectedVariants: SelectedVariants = {};
      productsData.forEach((product: ProductNode) => {
        if (product?.variants?.nodes?.length > 0) {
          initialSelectedVariants[product.id] = product.variants.nodes[0].id;
        }
      });
      setSelectedVariants(initialSelectedVariants);
    }
  }, [productsData]);

  useEffect(() => {
    if (!productsData || productsData.length === 0) return;

    const variantIds = productsData?.reduce(
      (acc: string[], product: ProductNode) => {
        return acc.concat(
          product?.variants?.nodes?.map(
            (variant: { id: string }) => variant.id,
          ) || [],
        );
      },
      [],
    );
    if (productsData) {
      searchProductPriceByVariants({
        storeName,
        customerId: shopifyCustomerId,
        companyLocationId: shopifyCompanyLocationId,
        variantIds,
      }).then((res) => {
        setComparePriceMapping(
          res.variantPrices.reduce(
            (acc, item) => ({
              ...acc,
              [item.sku as string]: {
                amount: Number(item.price?.amount),
                currencyCode: item.price?.currencyCode || "USD",
              },
            }),
            {} as typeof comparePriceMapping,
          ),
        );
      });
    }
  }, [productsData, storeName, shopifyCustomerId, shopifyCompanyLocationId]);

  useEffect(() => {
    // Calculate current height for each config id
    const calculateHeights = () => {
      const heights: { [key: string]: number } = {};

      TABLE_CONFIG.forEach((config) => {
        const elements = document.querySelectorAll(
          `[data-config-id="${config.id}"]`,
        );
        if (elements.length > 0) {
          // Use current calculated height
          const currentHeight = Math.max(
            ...Array.from(elements).map(
              (el) => el.getBoundingClientRect().height,
            ),
          );
          heights[config.id] = currentHeight;
        }
      });

      setConfigMaxHeights(heights);
    };

    // Use debounce function to optimize resize event handling
    const debouncedCalculateHeights = _.debounce(calculateHeights, 250);

    // Calculate height after data is loaded
    if (productsData && productsData.length > 0) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(calculateHeights, 0);

      // Add resize event listener
      window.addEventListener("resize", debouncedCalculateHeights);
    }

    // Cleanup function
    return () => {
      if (debouncedCalculateHeights) {
        window.removeEventListener("resize", debouncedCalculateHeights);
        debouncedCalculateHeights.cancel();
      }
    };
  }, [productsData, selectedVariants]);

  const handleRemoveProduct = (id: string) => {
    const removedId = extractShopifyId(id);
    const newIds = productIds.filter((productId) => productId !== removedId);

    try {
      const storedData = localStorage.getItem("compare-product-ids");
      if (storedData) {
        const compareProducts = JSON.parse(storedData);
        const updatedProducts = compareProducts.filter(
          (item: any) => item[0] !== removedId,
        );
        localStorage.setItem(
          "compare-product-ids",
          JSON.stringify(updatedProducts),
        );
      }
    } catch (error) {
      console.error("Error updating localStorage:", error);
    }

    queryClient.setQueryData(
      [PRODUCTS_BY_IDS, productIds],
      (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.filter(
          (product) => extractShopifyId(product.id) !== removedId,
        );
      },
    );

    queryClient.setQueryData([PRODUCTS_BY_IDS, newIds], (oldData: any[]) => {
      if (!oldData) {
        const currentData = queryClient.getQueryData([
          PRODUCTS_BY_IDS,
          productIds,
        ]) as any[];
        return currentData?.filter(
          (product) => extractShopifyId(product.id) !== removedId,
        );
      }
      return oldData;
    });

    setProductIds(newIds);

    if (newIds.length === 0) {
      return (window.location.href = returnTo);
    }
  };

  const handleRemoveAll = () => {
    try {
      localStorage.removeItem("compare-product-ids");
      window.location.href = returnTo;
    } catch (error) {
      console.error("Error removing all products:", error);
    }
  };

  const getListItems = (variantId: string, productId: string) => {
    const findItems = _.find(productsData, (product) => {
      const productIdMatch = product?.id === productId;
      const variantIdMatch = product?.variants?.nodes?.find(
        (variant: { id: string }) => variant.id === variantId,
      );

      if (productIdMatch && variantIdMatch) {
        return true;
      }
    });

    // Find the selected variant
    const selectedVariant = findItems?.variants.nodes.find(
      (variant: { id: string }) => variant.id === variantId,
    );

    const listItems = [
      {
        productId: productId,
        productName: findItems?.title,
        productVariantId: variantId,
        skuId: selectedVariant?.sku,
        productImageUrl: findItems?.images.edges[0]?.node.url,
        url: `https://${storeName}/products/${findItems?.handle}`,
        quantity: 1,
      },
    ];

    return listItems;
  };

  const handleAddToCart = async (variantId: string, productId: string) => {
    const selectedProduct = productsData?.find(
      (p: ProductNode) => p.id === productId,
    );
    if (!selectedProduct) return;

    setLoadingStates((prev) => ({ ...prev, [productId]: true }));

    const goToCart = () => {
      window.location.href = `https://${storeName}/cart`;
    };

    const successToast = () => {
      toast.success(t("common.text.success"), {
        description: (
          <div className="flex flex-col gap-1">
            <span>{t("compare.success-description")}</span>
            <div
              onClick={goToCart}
              className="text-primary hover:underline cursor-pointer"
            >
              {t("compare.view-cart")}
            </div>
          </div>
        ),
      });
      setLoadingStates((prev) => ({ ...prev, [productId]: false }));
    };

    const errorToast = (msg?: string) => {
      toast.error(t("compare.error", { error: msg }));
      setLoadingStates((prev) => ({ ...prev, [productId]: false }));
    };

    try {
      const extractedVariantId = extractShopifyId(variantId, "ProductVariant");

      // Fetch latest product info to get minimum quantity
      const latestProductInfo = await searchMultipleProductsPriceListAjax(
        selectedProduct.handle,
      );

      const quantity =
        latestProductInfo?.variants?.find(
          (v: { id: number; quantity_rule?: { min?: number } }) =>
            v.id === Number(extractedVariantId),
        )?.quantity_rule?.min || 1;

      const result = await addToCartAjax([
        {
          id: Number(variantId),
          quantity,
        },
      ]);

      if (result?.status === 422) {
        errorToast(`${result?.message} ${t("compare.check-item-quantity")}`);
        return;
      }
      if (result?.items) {
        successToast();
      } else {
        console.error("addToCartAjax ~ result:", result);
        errorToast();
      }
    } catch (err) {
      console.error("addToCartAjax ~ err:", err);
      errorToast();
    }
  };

  if (isLoading) {
    return <div className="p-6">{t("compare.loading")}</div>;
  }

  if (!productsData || productsData.length === 0) {
    return <div className="p-6">{t("compare.no-products-to-compare")}</div>;
  }

  const handleProductClick = (handle: string) => {
    const storeName = localStorage.getItem("store-name") ?? "";
    window.location.href = `https://${storeName}/products/${handle}`;
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-[215px]">
          <h1 className="text-2xl font-semibold">
            {t("compare.title")} ({productsData?.length || 0})
          </h1>
          <Button variant="outline" onClick={handleRemoveAll} className="mt-4">
            {t("compare.remove-all-button")}
          </Button>
          <div className="mt-2 text-sm text-gray-500">
            {t("compare.product-differences-highlighted")}
          </div>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(productsData || []).map((product: ProductNode) => {
              return (
                <div
                  key={product?.id || Math.random().toString()}
                  className="relative rounded-lg border bg-white p-4"
                >
                  <Button
                    variant="breadcrumb"
                    className="absolute right-2 top-2"
                    size="icon"
                    onClick={() => handleRemoveProduct(product?.id || "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="flex h-full flex-col">
                    <div className="flex-1 space-y-3">
                      <div className="flex h-[215px] w-full items-center justify-center">
                        <img
                          src={
                            product?.images?.edges?.[0]?.node?.url || noImage
                          }
                          alt={product?.title || "Product image"}
                          className="h-auto max-h-[215px] w-auto max-w-[215px] cursor-pointer object-contain"
                          onClick={() =>
                            handleProductClick(product?.handle || "")
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <div>
                          <h3
                            className="text-color line-clamp-2 cursor-pointer font-medium hover:underline"
                            onClick={() =>
                              handleProductClick(product?.handle || "")
                            }
                          >
                            {product?.title}
                          </h3>
                        </div>

                        {product?.variants.nodes.length > 1 && (
                          <Select
                            value={selectedVariants[product?.id || ""]}
                            onValueChange={(value) =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [product?.id || ""]: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {product?.variants.nodes.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {product ? (
                      <>
                        <Button
                          variant="default"
                          className="my-3 w-full"
                          onClick={() =>
                            handleAddToCart(
                              extractShopifyId(
                                selectedVariants[product?.id || ""] ||
                                  product?.variants?.nodes?.[0]?.id ||
                                  "",
                                "ProductVariant",
                              ),
                              product?.id || "",
                            )
                          }
                          disabled={
                            loadingStates[product?.id || ""] ||
                            !product?.variants?.nodes?.find(
                              (v) =>
                                v.id ===
                                (selectedVariants[product?.id || ""] ||
                                  product?.variants?.nodes?.[0]?.id),
                            )?.availableForSale
                          }
                        >
                          {loadingStates[product?.id || ""]
                            ? t("compare.adding")
                            : product?.variants?.nodes?.find(
                                  (v) =>
                                    v.id ===
                                    (selectedVariants[product?.id || ""] ||
                                      product?.variants?.nodes?.[0]?.id),
                                )?.availableForSale
                              ? t("compare.add-to-cart-button")
                              : t("compare.sold-out-button")}
                        </Button>
                        <AddToListButtons
                          listItems={getListItems(
                            selectedVariants[product?.id || ""] ||
                              product?.variants?.nodes?.[0]?.id ||
                              "",
                            product?.id || "",
                          )}
                          onAddToList={() => true}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* Mobile view */}
        <div className="block md:hidden">
          {(productsData || []).map((product: ProductNode) => {
            const selectedVariant =
              product?.variants?.nodes?.find(
                (v) => v.id === selectedVariants[product?.id || ""],
              ) ||
              (product?.variants?.nodes?.length
                ? product.variants.nodes[0]
                : null);

            const visibleConfigs = TABLE_CONFIG.filter((config) => {
              try {
                const value = config.getValue(
                  product || {},
                  selectedVariant || {},
                  comparePriceMapping || {},
                );
                return value !== "-";
              } catch (error) {
                console.error("Error in config.getValue:", error);
                return false;
              }
            });

            return (
              <div
                key={product?.id || Math.random().toString()}
                className="mb-4 last:mb-0"
              >
                <table className="w-full border-separate border-spacing-0">
                  <tbody>
                    {visibleConfigs.map((config, index) => (
                      <tr key={config.id} className={`overflow-hidden`}>
                        <td
                          className={cn(
                            "p-4",
                            config.borderStyle,
                            "text-color",
                            "w-[120px]",
                            "whitespace-nowrap",
                            "border-r-0",
                            "font-bold",
                            {
                              "border-b": index === visibleConfigs.length - 1,
                              "rounded-tl-lg": index === 0,
                              "rounded-bl-lg":
                                index === visibleConfigs.length - 1,
                            },
                            config.bgColor,
                          )}
                        >
                          {t(`compare.table.config.${config.id}`)}
                        </td>
                        <td
                          className={cn(
                            "p-4",
                            config.borderStyle,
                            "text-color",
                            "max-w-1",
                            "break-words",
                            {
                              "border-b": index === visibleConfigs.length - 1,
                              "rounded-tr-lg": index === 0,
                              "rounded-br-lg":
                                index === visibleConfigs.length - 1,
                            },
                            config.bgColor,
                          )}
                        >
                          {config.getValue(
                            product || {},
                            selectedVariant || {},
                            comparePriceMapping || {},
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Desktop view */}
        <div className="app-hidden md:flex">
          <div className="w-[215px]">
            <table className="w-full border-separate border-spacing-0">
              <tbody>
                {(() => {
                  const visibleConfigs = TABLE_CONFIG.filter((config) => {
                    const allEmpty = productsData?.every(
                      (product: ProductNode) => {
                        try {
                          const selectedVariant =
                            product?.variants?.nodes?.find(
                              (v) =>
                                v.id === selectedVariants[product?.id || ""],
                            ) ||
                            (product?.variants?.nodes?.length
                              ? product.variants.nodes[0]
                              : null);
                          const value = config.getValue(
                            product || {},
                            selectedVariant || {},
                            comparePriceMapping || {},
                          );
                          return value === "-";
                        } catch (error) {
                          console.error(
                            "Error checking if all values are empty:",
                            error,
                          );
                          return true;
                        }
                      },
                    );
                    return !allEmpty;
                  });

                  return visibleConfigs.map((config, index) => (
                    <tr key={config.id} className="overflow-hidden">
                      <td
                        data-config-id={config.id}
                        style={{ height: configMaxHeights[config.id] }}
                        className={cn(
                          "p-4",
                          config.borderStyle,
                          "text-color",
                          "whitespace-nowrap",
                          "font-bold",
                          {
                            "border-b": index === visibleConfigs.length - 1,
                            "rounded-t-lg": index === 0,
                            "rounded-b-lg": index === visibleConfigs.length - 1,
                          },
                          config.bgColor,
                        )}
                      >
                        {t(`compare.table.config.${config.id}`)}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <div className="flex-1">
            <div className="ml-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {(productsData || []).map((product: ProductNode) => {
                const selectedVariant =
                  product?.variants?.nodes?.find(
                    (v) => v.id === selectedVariants[product?.id || ""],
                  ) ||
                  (product?.variants?.nodes?.length
                    ? product.variants.nodes[0]
                    : null);

                const visibleConfigs = TABLE_CONFIG.filter((config) => {
                  const allEmpty = productsData?.every(
                    (product: ProductNode) => {
                      try {
                        const selectedVariant =
                          product?.variants?.nodes?.find(
                            (v) => v.id === selectedVariants[product?.id || ""],
                          ) ||
                          (product?.variants?.nodes?.length
                            ? product.variants.nodes[0]
                            : null);
                        const value = config.getValue(
                          product || {},
                          selectedVariant || {},
                          comparePriceMapping || {},
                        );
                        return value === "-";
                      } catch (error) {
                        console.error(
                          "Error checking if all values are empty:",
                          error,
                        );
                        return true;
                      }
                    },
                  );
                  return !allEmpty;
                });

                return (
                  <div key={product?.id || Math.random().toString()}>
                    <table className="w-full border-separate border-spacing-0">
                      <tbody>
                        {visibleConfigs.map((config, index) => (
                          <tr key={config.id} className={`overflow-hidden`}>
                            <td
                              data-config-id={config.id}
                              style={{ height: configMaxHeights[config.id] }}
                              className={cn(
                                "p-4",
                                config.borderStyle,
                                "text-color",
                                "break-words",
                                "max-w-1",
                                {
                                  "border-b":
                                    index === visibleConfigs.length - 1,
                                  "rounded-t-lg": index === 0,
                                  "rounded-b-lg":
                                    index === visibleConfigs.length - 1,
                                },
                                config.bgColor,
                              )}
                            >
                              {config.getValue(
                                product || {},
                                selectedVariant || {},
                                comparePriceMapping || {},
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {Array.from({
                length: Math.max(0, 4 - (productsData?.length || 0)),
              }).map((_, index) => (
                <div key={`empty-${index}`} className="app-hidden lg:block" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
