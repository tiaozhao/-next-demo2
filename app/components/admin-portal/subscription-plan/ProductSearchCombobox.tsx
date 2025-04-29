import { Combobox, Listbox, AutoSelection, Icon } from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCustomerPartnerNumberBySkuMutation,
  useGetProductVariantsByApi,
} from "~/hooks/use-product-search";
import { extractVariantId, flatSearchResultV2 } from "~/lib/quick-order";
import { QuickOrderFormSchema } from "~/types/quick-order";
import { SubscriptionPlanFormDataErrorState } from "~/types/subscription-plan.types";

interface ProductSearchComboboxProps {
  storeName: string;
  companyLocationId: string;
  companyId: string;
  onSelect: (
    product: QuickOrderFormSchema["productLines"][string]["product"],
  ) => void;
  disabled?: boolean;
}

export const ProductSearchCombobox = ({
  storeName,
  companyLocationId,
  companyId,
  onSelect,
  disabled = false,
}: ProductSearchComboboxProps) => {
  const { t } = useTranslation();
  const [productSearchQuery, setProductSearchQuery] = useState<string[]>([]);
  const [textFieldValue, setTextFieldValue] = useState<string>("");
  const [productSearchError, setProductSearchError] =
    useState<SubscriptionPlanFormDataErrorState>({
      isError: false,
      msg: "",
    });
  const { data: productVariants, isLoading: isProductVariantsLoading } =
    useGetProductVariantsByApi(
      {
        query: productSearchQuery,
        storeName: storeName,
        customerId: "staffId",
        companyLocationId: companyLocationId,
        companyId: companyId,
      },
      !disabled,
    );

  const { mutateAsync: getCustomerPartnerNumberBySku } =
    useCustomerPartnerNumberBySkuMutation();

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

  const [productOptions, setProductOptions] = useState<
    QuickOrderFormSchema["productLines"][string]["product"][]
  >([]);

  useEffect(() => {
    setProductSearchQuery([]);
    setTextFieldValue("");
    setProductOptions([]);
  }, [companyLocationId, companyId]);

  useEffect(() => {
    if (productVariants) {
      if (productVariants.products.length === 0) {
        setProductSearchError({
          isError: true,
          msg: t("quick-order.table.search-empty-result"),
        });
        setProductOptions([]);
        return;
      }
      setProductSearchError({
        isError: false,
        msg: "",
      });
      const results = flatSearchResultV2(productVariants.products);
      const filteredSkuResults = results.filter((result) => {
        return result.sku === textFieldValue;
      });
      if (filteredSkuResults.length === 0) {
        const skus = results
          .map((result) => result?.sku)
          .filter(Boolean) as string[];
        getCustomerPartnerNumberBySku({
          storeName: storeName,
          companyId: companyId,
          skuIds: skus,
        })
          .then((res) => {
            if (res?.code !== 200) {
              return setProductOptions(results);
            }
            const customerPartnerNumberDetails =
              res?.customerPartnerNumberDetails;
            const matchedSku = customerPartnerNumberDetails?.find(
              (item: { customerPartnerNumber: string; skuId: string }) =>
                item.customerPartnerNumber === textFieldValue,
            )?.skuId;
            const filteredResults = results.filter((result) => {
              return result.sku === matchedSku;
            });

            if (filteredResults.length === 0) {
              return setProductOptions(results);
            }
            setProductOptions(filteredResults);
          })
          .catch((err) => {
            setProductOptions(results);
            console.error(err);
          });
      } else {
        setProductOptions(filteredSkuResults);
        return;
      }
      return;
    }
  }, [productVariants]);

  const handleProductSelect = (val: string) => {
    const product = productOptions.find(
      (option) => `${option.id}-${option.variantId}` === val,
    );
    if (product) {
      onSelect(product);
    }
  };

  return (
    <Combobox
      activator={
        <Combobox.TextField
          disabled={disabled}
          prefix={<Icon source={SearchIcon} tone="base" />}
          autoComplete="off"
          label={t(
            "admin-portal.subscription-plan.create.form.product-search.label",
          )}
          placeholder={t(
            "admin-portal.subscription-plan.create.form.product-search.placeholder",
          )}
          value={textFieldValue}
          onChange={(value) => handleProductSearchQueryChange(value)}
          error={productSearchError.isError && productSearchError.msg}
        />
      }
    >
      {isProductVariantsLoading ? (
        <Listbox>
          <Listbox.Loading accessibilityLabel="loading"></Listbox.Loading>
        </Listbox>
      ) : productOptions.length > 0 ? (
        <Listbox
          autoSelection={AutoSelection.None}
          onSelect={handleProductSelect}
        >
          {productOptions.map((option: any) => (
            <Listbox.Option
              key={`${option.id}-${option.variantId}`}
              value={`${option.id}-${option.variantId}`}
            >
              {`${extractVariantId(option.sku || "")}-${option.name}`}
            </Listbox.Option>
          ))}
        </Listbox>
      ) : null}
    </Combobox>
  );
};
