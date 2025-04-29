import { useTranslation } from "react-i18next";
import {
  Card,
  TextField,
  Select,
  Button,
  RadioButton,
  InlineStack,
  BlockStack,
  Text,
  Grid,
  Checkbox,
  List,
  Box,
  Scrollable,
  Thumbnail,
} from "@shopify/polaris";
import _ from "lodash";
import {
  formatNewFrequencies,
  formatSubscriptionFrequencyText,
  formatSubscriptionPlanDiscountValue,
  resetAllFrequenciesError,
} from "~/lib/subscription-plan";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import {
  SubscriptionPlanFrequencyUnit,
  SubscriptionPlanFormData,
  SubscriptionPlanFormDataError,
  SubscriptionPlanFrequencyOption,
  SubscriptionPlanProductOption,
} from "~/types/subscription-plan.types";
import { ProductSearchCombobox } from "./ProductSearchCombobox";
import { QuickOrderFormSchema } from "~/types/quick-order";
import { useAdminPortalCompanyAndCompanyLocations } from "~/hooks/use-customer-partner-number";
import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { extractIdFromGid } from "~/lib/utils";

interface SubscriptionPlanFieldsProps {
  storeName: string;
  formData: SubscriptionPlanFormData;
  setFormData: (formData: SubscriptionPlanFormData) => void;
  formDataError: SubscriptionPlanFormDataError;
  setFormDataError: (formDataError: SubscriptionPlanFormDataError) => void;
  frequencies: SubscriptionPlanFrequencyOption[];
  setFrequencies: (frequencies: SubscriptionPlanFrequencyOption[]) => void;
  productSearchFieldOnChange: (value?: string) => void;
  handleRemoveFrequency: (lineId: string) => void;
  handleAddFrequency: () => void;
  products: SubscriptionPlanProductOption[];
  setProducts: (products: SubscriptionPlanProductOption[]) => void;
  currencyCode: string;
  frequencyOption: {
    label: string;
    value: SubscriptionPlanFrequencyUnit;
  }[];
  onProductSelect?: (
    product: QuickOrderFormSchema["productLines"][string]["product"],
  ) => void;
  onRemoveProduct: (productId: string) => void;
}
export const SubscriptionPlanFields = ({
  storeName,
  formData,
  setFormData,
  formDataError,
  setFormDataError,
  frequencies,
  setFrequencies,
  productSearchFieldOnChange,
  handleRemoveFrequency,
  handleAddFrequency,
  currencyCode,
  frequencyOption,
  products,
  onProductSelect,
  onRemoveProduct,
  setProducts,
}: SubscriptionPlanFieldsProps) => {
  const { t } = useTranslation();

  const {
    data: companyAndCompanyLocations,
    isLoading: isLoadingCompanyAndCompanyLocations,
  } = useAdminPortalCompanyAndCompanyLocations();

  const [companyOptions, setCompanyOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [companyLocationOptions, setCompanyLocationOptions] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    if (companyAndCompanyLocations) {
      setCompanyOptions(
        companyAndCompanyLocations.map((company) => ({
          label: company.name,
          value: company.id,
        })),
      );
    }
  }, [companyAndCompanyLocations]);

  useEffect(() => {
    if (formData.company) {
      const findCompany = companyAndCompanyLocations?.find(
        (company) => company.id === formData.company,
      );
      if (findCompany) {
        setCompanyLocationOptions(
          (findCompany?.locations?.nodes || []).map((location) => ({
            label: `${location.name} - ${location?.externalId || extractIdFromGid(location.id, "CompanyLocation")}`,
            value: location.id,
          })),
        );
      } else {
        setCompanyLocationOptions([]);
      }
    }
  }, [formData.company, companyAndCompanyLocations]);

  return (
    <Grid
      columns={{
        xs: 3,
        sm: 3,
        md: 3,
        lg: 3,
        xl: 3,
      }}
    >
      <Grid.Cell
        columnSpan={{
          xs: 2,
          sm: 2,
          md: 2,
          lg: 2,
          xl: 2,
        }}
      >
        <BlockStack gap={"400"}>
          {/* base information */}
          <Card>
            <BlockStack gap={"400"}>
              <TextField
                label={t(
                  "admin-portal.subscription-plan.create.form.title.label",
                )}
                value={formData.title}
                onChange={(value) => {
                  setFormData({ ...formData, title: value });
                  if (value.length === 0) {
                    setFormDataError({
                      ...formDataError,
                      title: {
                        isError: true,
                        msg: t(
                          "admin-portal.subscription-plan.create.form.title.required",
                        ),
                      },
                    });
                  } else {
                    setFormDataError({
                      ...formDataError,
                      title: {
                        isError: false,
                        msg: "",
                      },
                    });
                  }
                }}
                autoComplete="off"
                error={formDataError.title.isError && formDataError.title.msg}
              />
              <TextField
                label={t(
                  "admin-portal.subscription-plan.create.form.description.label",
                )}
                value={formData.description}
                onChange={(value) => {
                  setFormData({ ...formData, description: value });
                  if (value.length === 0) {
                    setFormDataError({
                      ...formDataError,
                      description: {
                        isError: true,
                        msg: t(
                          "admin-portal.subscription-plan.create.form.description.required",
                        ),
                      },
                    });
                  } else {
                    setFormDataError({
                      ...formDataError,
                      description: {
                        isError: false,
                        msg: "",
                      },
                    });
                  }
                }}
                autoComplete="off"
                helpText={t(
                  "admin-portal.subscription-plan.create.form.description.help-text",
                )}
                error={
                  formDataError.description.isError &&
                  formDataError.description.msg
                }
              />
            </BlockStack>
          </Card>

          {/* product information */}
          <Card>
            <BlockStack gap={"400"}>
              <Text as="h4" variant="headingMd">
                {t(
                  "admin-portal.subscription-plan.create.form.section.product",
                )}
              </Text>
              {/* company */}
              <Select
                label={t(
                  "admin-portal.subscription-plan.create.form.company.label",
                )}
                placeholder={t(
                  "admin-portal.subscription-plan.create.form.company.placeholder",
                )}
                disabled={isLoadingCompanyAndCompanyLocations}
                value={formData.company}
                onChange={(value) => {
                  setFormData({ ...formData, company: value });

                  setProducts([]);
                }}
                options={companyOptions}
              />
              {/* company location */}
              <Select
                label={t(
                  "admin-portal.subscription-plan.create.form.company-location.label",
                )}
                placeholder={t(
                  "admin-portal.subscription-plan.create.form.company-location.placeholder",
                )}
                value={formData.companyLocation}
                disabled={
                  !formData.company ||
                  isLoadingCompanyAndCompanyLocations ||
                  _.isEmpty(companyLocationOptions)
                }
                onChange={(value) => {
                  setFormData({ ...formData, companyLocation: value });
                  setProducts([]);
                }}
                options={companyLocationOptions}
              />

              {/* product search */}
              {/* <TextField
                label={t(
                  "admin-portal.subscription-plan.create.form.product-search.label",
                )}
                value={""}
                prefix={<Icon source={SearchIcon} tone="base" />}
                onChange={productSearchFieldOnChange}
                autoComplete="off"
                placeholder={t(
                  "admin-portal.subscription-plan.create.form.product-search.placeholder",
                )}
                disabled={!formData.company || !formData.companyLocation}
              /> */}
              <ProductSearchCombobox
                disabled={
                  !formData.company ||
                  !formData.companyLocation ||
                  isLoadingCompanyAndCompanyLocations
                }
                storeName={storeName}
                companyLocationId={formData.companyLocation}
                companyId={formData.company}
                onSelect={onProductSelect || (() => {})}
              />

              {/* product list */}

              <Scrollable style={{ maxHeight: "520px" }}>
                <BlockStack gap={"400"}>
                  {products.map((product) => (
                    <Box
                      key={product.variantId}
                      padding={"200"}
                      borderBlockEndWidth="025"
                      borderColor="border"
                    >
                      <Grid
                        columns={{
                          xs: 9,
                          sm: 9,
                          md: 9,
                          lg: 9,
                          xl: 9,
                        }}
                      >
                        <Grid.Cell>
                          <Thumbnail
                            source={product?.imageUrl || ""}
                            alt={product?.title || ""}
                            size="small"
                          />
                        </Grid.Cell>
                        <Grid.Cell
                          columnSpan={{
                            xs: 4,
                            sm: 4,
                            md: 4,
                            lg: 4,
                            xl: 4,
                          }}
                        >
                          <BlockStack gap={"050"}>
                            <InlineStack gap={"200"} wrap={false}>
                              <Text as="h3">
                                <div className="line-clamp-3">
                                  {product?.title}
                                </div>
                              </Text>
                            </InlineStack>
                          </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell>
                          <BlockStack gap={"050"}>
                            <Text as="h3">
                              {t(
                                "admin-portal.subscription-plan.create.form.product.sku.label",
                              )}
                            </Text>
                            <InlineStack gap={"200"} wrap={false}>
                              <Text as="p">{product.sku}</Text>
                            </InlineStack>
                          </BlockStack>
                        </Grid.Cell>

                        <Grid.Cell
                          columnSpan={{
                            xs: 2,
                            sm: 2,
                            md: 2,
                            lg: 2,
                            xl: 2,
                          }}
                        >
                          <InlineStack align="end" wrap={false}>
                            <BlockStack>
                              <Text as="h3">
                                {t(
                                  "admin-portal.subscription-plan.create.form.product.price.label",
                                )}
                              </Text>
                              <Text as="h3">
                                {product.price}{" "}
                                {product?.uom ? `/${product.uom}` : ""}
                              </Text>
                            </BlockStack>
                          </InlineStack>
                        </Grid.Cell>
                        <Grid.Cell>
                          <InlineStack align="end" wrap={false}>
                            <Button
                              icon={DeleteIcon}
                              variant={"plain"}
                              onClick={() =>
                                onRemoveProduct(
                                  `${product.productId}-${product.variantId}`,
                                )
                              }
                            ></Button>
                          </InlineStack>
                        </Grid.Cell>
                      </Grid>
                    </Box>
                  ))}
                </BlockStack>
              </Scrollable>
            </BlockStack>
          </Card>

          {/* discount information */}
          <Card>
            <BlockStack gap={"400"}>
              <Text as="h4" variant="headingMd">
                {t(
                  "admin-portal.subscription-plan.create.form.section.discount-and-delivery",
                )}
              </Text>
              <Checkbox
                label={t(
                  "admin-portal.subscription-plan.create.form.offer-discount.label",
                )}
                checked={formData.offerDiscount}
                onChange={(checked) => {
                  setFormData({
                    ...formData,
                    offerDiscount: checked,
                    discountType: "percentage",
                  });
                }}
              ></Checkbox>
              {formData.offerDiscount && (
                <BlockStack>
                  <RadioButton
                    label={t(
                      "admin-portal.subscription-plan.create.form.discount-type.percentage",
                    )}
                    checked={formData.discountType === "percentage"}
                    onChange={(checked) => {
                      setFormData({
                        ...formData,
                        discountType: "percentage",
                      });
                      resetAllFrequenciesError(frequencies, setFrequencies);
                    }}
                  />
                  <RadioButton
                    label={t(
                      "admin-portal.subscription-plan.create.form.discount-type.amount",
                    )}
                    checked={formData.discountType === "amount"}
                    onChange={(checked) => {
                      setFormData({ ...formData, discountType: "amount" });
                      resetAllFrequenciesError(frequencies, setFrequencies);
                    }}
                  />
                  {/* <RadioButton
                    label={t(
                      "admin-portal.subscription-plan.create.form.discount-type.fixed",
                    )}
                    checked={formData.discountType === "fixed"}
                    onChange={(checked) => {
                      setFormData({ ...formData, discountType: "fixed" });
                    }}
                  /> */}
                </BlockStack>
              )}
              <BlockStack gap={"400"}>
                {frequencies.map((frequency, index) => (
                  <Grid
                    key={frequency.lineId}
                    columns={{
                      xs: formData.offerDiscount ? 3 : 2,
                      sm: formData.offerDiscount ? 3 : 2,
                      md: formData.offerDiscount ? 3 : 2,
                      lg: formData.offerDiscount ? 3 : 2,
                      xl: formData.offerDiscount ? 3 : 2,
                    }}
                  >
                    {/* Delivery Interval */}
                    <Grid.Cell>
                      <TextField
                        type="number"
                        autoComplete="off"
                        label={t(
                          "admin-portal.subscription-plan.create.form.delivery-interval.label",
                        )}
                        placeholder={t(
                          "admin-portal.subscription-plan.create.form.delivery-interval.placeholder",
                        )}
                        value={frequency.interval}
                        onChange={(value) => {
                          const num = Decimal.round(value || 0).toString();
                          formatNewFrequencies(
                            frequencies,
                            setFrequencies,
                            {
                              key: "interval",
                              value: num,
                              lineId: frequency.lineId,
                              discountType: formData.discountType,
                            },
                            t,
                          );
                        }}
                        error={
                          (frequency?.notUnique &&
                            t(
                              "admin-portal.subscription-plan.create.form.delivery-interval.frequency-must-be-unique",
                            )) ||
                          (frequency.intervalError?.isError &&
                            frequency.intervalError?.msg)
                        }
                      />
                    </Grid.Cell>

                    {/* Delivery Interval Unit */}
                    <Grid.Cell>
                      <InlineStack gap={"200"}>
                        <div
                          style={{
                            flexGrow: 1,
                          }}
                        >
                          <Select
                            options={frequencyOption}
                            label={t(
                              "admin-portal.subscription-plan.create.form.delivery-interval-unit.label",
                            )}
                            placeholder={t(
                              "admin-portal.subscription-plan.create.form.delivery-interval-unit.placeholder",
                            )}
                            value={frequency.unit}
                            onChange={(value) => {
                              formatNewFrequencies(
                                frequencies,
                                setFrequencies,
                                {
                                  key: "unit",
                                  value: value,
                                  lineId: frequency.lineId,
                                  discountType: formData.discountType,
                                },
                                t,
                              );
                            }}
                            error={
                              frequency.unitError?.isError &&
                              frequency.unitError?.msg
                            }
                          />
                        </div>
                        {frequencies.length > 1 && !formData.offerDiscount && (
                          <div
                            style={{
                              paddingTop: "1.8rem",
                            }}
                          >
                            <Button
                              icon={DeleteIcon}
                              variant={"plain"}
                              onClick={() =>
                                handleRemoveFrequency(frequency.lineId)
                              }
                            ></Button>
                          </div>
                        )}
                      </InlineStack>
                    </Grid.Cell>

                    {/* Delivery Interval Unit */}
                    {formData.offerDiscount && (
                      <Grid.Cell>
                        <TextField
                          type="number"
                          autoComplete="off"
                          prefix={
                            formData.discountType !== "percentage" &&
                            Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: currencyCode,
                              currencyDisplay: "symbol",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })
                              .format(0)
                              .replace(/[0-9]/g, "")
                          }
                          suffix={formData.discountType === "percentage" && "%"}
                          label={t(
                            `admin-portal.subscription-plan.create.form.discount-type.${formData.discountType}`,
                          )}
                          placeholder={t(
                            "admin-portal.subscription-plan.create.form.discount-value.placeholder",
                          )}
                          value={frequency.value}
                          onChange={(value) => {
                            formatNewFrequencies(
                              frequencies,
                              setFrequencies,
                              {
                                key: "value",
                                value: value,
                                lineId: frequency.lineId,
                                discountType: formData.discountType,
                              },
                              t,
                            );
                          }}
                          error={
                            frequency.valueError?.isError &&
                            frequency.valueError?.msg
                          }
                          helpText={
                            formData.discountType === "fixed" &&
                            t(
                              "admin-portal.subscription-plan.create.form.discount-value.help-text",
                            )
                          }
                          connectedRight={
                            frequencies.length > 1 && (
                              <div style={{ paddingTop: "0.25rem" }}>
                                <Button
                                  icon={DeleteIcon}
                                  variant={"plain"}
                                  onClick={() =>
                                    handleRemoveFrequency(frequency.lineId)
                                  }
                                ></Button>
                              </div>
                            )
                          }
                        />
                      </Grid.Cell>
                    )}
                  </Grid>
                ))}

                <InlineStack>
                  <Button variant={"secondary"} onClick={handleAddFrequency}>
                    {t(
                      "admin-portal.subscription-plan.create.form.add-frequency.label",
                    )}
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Grid.Cell>
      <Grid.Cell
        columnSpan={{
          xs: 1,
          sm: 1,
          md: 1,
          lg: 1,
          xl: 1,
        }}
      >
        <Card>
          <BlockStack gap={"400"}>
            <Text as="h3" variant="headingMd">
              {t("admin-portal.subscription-plan.create.summary.title")}
            </Text>
            <Text as="p" variant="headingMd" fontWeight="medium" breakWord>
              {formData.description || "No description."}
            </Text>
            <List>
              <List.Item>
                {formatSubscriptionFrequencyText(frequencies, t)}
                {formData.offerDiscount && frequencies.length === 1
                  ? `, ${formatSubscriptionPlanDiscountValue({
                      offerDiscount: formData.offerDiscount,
                      discountType: formData.discountType,
                      discountValue: _.toNumber(frequencies[0]?.value),
                      currencyCode,
                      t,
                    })}`
                  : ""}
              </List.Item>
              {products.length > 0 && (
                <List.Item>
                  {t(
                    `admin-portal.subscription-plan.list.table.${products?.length > 1 ? "products" : "product"}-count`,
                    {
                      count: products?.length,
                    },
                  )}
                </List.Item>
              )}
            </List>
          </BlockStack>
        </Card>
      </Grid.Cell>
    </Grid>
  );
};
