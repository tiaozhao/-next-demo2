import { useTranslation } from "react-i18next";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Separator } from "~/components/ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { DatePicker } from "~/components/ui/custom/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useEffect, useMemo, useContext, useState, useCallback } from "react";
import { useShipToLocationList } from "~/hooks/use-ship-to-location";
import { useShopifyInformation } from "~/lib/shopify";
import { useCustomerInformation } from "~/hooks/use-users";
import { useGetShippingMethods } from "~/hooks/use-shipping-method";
import _ from "lodash";
import { initialProductLines } from "~/lib/quick-order";
import { SubscriptionOrderContext } from "~/context/subscription-order.context";
import { GetShippingMethodsParams } from "~/types/shipping/shipping-method.schema";
import {
  SUBSCRIPTION_FREQUENCY_DATE_CONFIG,
  SUBSCRIPTION_CUSTOM_FREQUENCY_UNIT_MAP,
  subscriptionOrderCalculateNextDate,
  SUBSCRIPTION_ORDER_DATE_UNIT,
} from "~/lib/subscription-orders";
import { SubscriptionOrderInformationFormData } from "~/lib/schema/create-subscription.schema";
import { cn, extractIdFromGid } from "~/lib/utils";

interface SubscriptionOrderCreateCustomerFieldsProps {
  form: UseFormReturn<SubscriptionOrderInformationFormData>;
  type: "create" | "edit";
  isPlan?: boolean;
  orderTotal: number;
  orderWeight: number;
  weightUnitAndCurrencyCode: {
    weightUnit: string;
    currencyCode: string;
  };
}

const SectionTitle = ({ title }: { title: string }) => {
  return <h2 className="text-base font-bold">{title}</h2>;
};

export default function SubscriptionOrderCreateCustomerFields({
  form,
  type,
  isPlan = false,
  orderTotal,
  orderWeight,
  weightUnitAndCurrencyCode,
}: SubscriptionOrderCreateCustomerFieldsProps) {
  const context = useContext(SubscriptionOrderContext);
  const { t } = useTranslation();

  const FormItemWrapper = ({ children }: { children: React.ReactNode }) => {
    return <FormItem className="space-y-1">{children}</FormItem>;
  };

  const FrequencyOptions = [
    {
      label: t("subscription-orders.create.form.frequency-options.weekly"),
      value: "weekly",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.monthly"),
      value: "monthly",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.quarterly"),
      value: "quarterly",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.biannual"),
      value: "biannual",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.annually"),
      value: "annually",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.custom"),
      value: "custom",
    },
  ];
  const CustomerFrequencyOptions = [
    {
      label: t("subscription-orders.create.form.frequency-options.day"),
      value: "daily",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.week"),
      value: "weekly",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.month"),
      value: "monthly",
    },
    {
      label: t("subscription-orders.create.form.frequency-options.year"),
      value: "annually",
    },
  ];

  const { shopifyCompanyId, storeName, shopifyCustomerId } =
    useShopifyInformation();

  const { control, watch } = form;

  const renderAddress = (address: any) => {
    const res = `${address?.city || ""}${address?.city ? "," : ""} ${address?.provinceCode || ""} ${address?.zip || ""}`;
    return res.trim().length > 0 ? res : "-";
  };

  const frequency = watch("frequency");
  const customFrequencyNumber = watch("customFrequencyNumber");
  const customFrequencyUnit = watch("customFrequencyUnit");
  const startDeliveryDate = watch("startDeliveryDate");

  const minEndDeliveryDate = useMemo(() => {
    if (!startDeliveryDate) return new Date();

    const baseDate = new Date(startDeliveryDate);

    // Handle preset frequency
    if (frequency && frequency !== "custom") {
      const config =
        SUBSCRIPTION_FREQUENCY_DATE_CONFIG[
          frequency as keyof typeof SUBSCRIPTION_FREQUENCY_DATE_CONFIG
        ];
      return config
        ? subscriptionOrderCalculateNextDate(
            baseDate,
            config.value,
            config.unit,
          )
        : subscriptionOrderCalculateNextDate(
            baseDate,
            1,
            SUBSCRIPTION_ORDER_DATE_UNIT.DAYS,
          );
    }

    // Handle custom frequency
    if (
      frequency === "custom" &&
      customFrequencyNumber &&
      customFrequencyUnit
    ) {
      const unit =
        SUBSCRIPTION_CUSTOM_FREQUENCY_UNIT_MAP[
          customFrequencyUnit as keyof typeof SUBSCRIPTION_CUSTOM_FREQUENCY_UNIT_MAP
        ];
      return subscriptionOrderCalculateNextDate(
        baseDate,
        Number(customFrequencyNumber),
        unit,
      );
    }

    // Default add one day
    return subscriptionOrderCalculateNextDate(
      baseDate,
      1,
      SUBSCRIPTION_ORDER_DATE_UNIT.DAYS,
    );
  }, [
    startDeliveryDate,
    frequency,
    customFrequencyNumber,
    customFrequencyUnit,
  ]);

  // get customer accounts
  const { data: customerInformation } = useCustomerInformation();

  const querySize = 250;

  const { data: customerAccounts, isLoading: isLoadingCustomerAccounts } =
    useShipToLocationList({
      companyId: shopifyCompanyId,
      storeName: storeName,
      customerId: shopifyCustomerId,
      pagination: {
        first: querySize,
        query: "",
      },
    });

  // company location options
  const customerAccountsOptions = useMemo(() => {
    if (!customerAccounts) return [];

    const options = customerAccounts.companyLocations
      .map((location) => {
        if (
          customerInformation?.roles?.find(
            (role: any) => role.companyLocationId === location.id,
          )
        ) {
          return {
            label: `${location.name} - ${location?.externalId || extractIdFromGid(location.id, "CompanyLocation")}`,
            value: location.id,
            meta: location,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    return options;
  }, [customerAccounts]);

  // for edit, init for shipping method,shipping address, payment method
  useEffect(() => {
    if (type === "create" && !isPlan) return;
    if (context?.editDataForInit.isInit) {
      return;
    }
    if (
      context?.editDataForInit.companyLocationId &&
      _.isArray(customerAccountsOptions) &&
      customerAccountsOptions.length > 0
    ) {
      const selectedOption = customerAccountsOptions.find(
        (option) => option.value === context?.editDataForInit.companyLocationId,
      );
      if (selectedOption) {
        // form.setValue("companyLocationId", selectedOption.value);
        context?.setCompanyLocationId(selectedOption.value);
        context?.setShippingAddress(selectedOption.meta?.shippingAddress);
        context?.setPaymentMethod(
          selectedOption.meta?.buyerExperienceConfiguration
            ?.paymentTermsTemplate?.name || "",
        );
        context?.setEditDataForInit({
          ...context?.editDataForInit,
          isInit: true,
        });
      } else {
        form.resetField("shippingMethod");
      }
    }
  }, [context?.editDataForInit, customerAccountsOptions]);

  const [shippingMethodParams, setShippingMethodParams] = useState<
    GetShippingMethodsParams | undefined
  >();

  // debounce for set shipping method params
  const debouncedSetShippingMethodParams = useCallback(
    _.debounce((params: GetShippingMethodsParams) => {
      setShippingMethodParams(params);
    }, 1000),
    [],
  );

  // shipping method options
  const [shippingMethodsOptions, setShippingMethodsOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const { data: shippingMethods, isLoading: isShippingMethodsLoading } =
    useGetShippingMethods(shippingMethodParams);

  // set shipping method params immediately when shipping address changes
  useEffect(() => {
    if (context?.shippingAddress) {
      setShippingMethodParams({
        storeName: storeName,
        countryCode: context.shippingAddress.countryCode || "",
        provinceCode: context.shippingAddress.zoneCode || "",
        orderTotal: orderTotal || 0,
        orderWeight: orderWeight || 0,
        weightUnit: weightUnitAndCurrencyCode.weightUnit || "",
        currencyCode: weightUnitAndCurrencyCode.currencyCode || "",
      });
    }
  }, [context?.shippingAddress]);

  // debounce for set shipping method params when order total changes
  useEffect(() => {
    if (context?.shippingAddress) {
      if (_.isNumber(orderTotal)) {
        debouncedSetShippingMethodParams({
          storeName: storeName,
          countryCode: context.shippingAddress.countryCode || "",
          provinceCode: context.shippingAddress.zoneCode || "",
          orderTotal: orderTotal || 0,
          orderWeight: orderWeight || 0,
          weightUnit: weightUnitAndCurrencyCode.weightUnit || "",
          currencyCode: weightUnitAndCurrencyCode.currencyCode || "",
        });

        if (form.getValues("orderTotal") !== orderTotal) {
          form.resetField("shippingMethod");
        } else {
          form.setValue("orderTotal", undefined);
        }
      }
    }
  }, [orderTotal, orderWeight, weightUnitAndCurrencyCode]);

  // set shipping method options, avoid empty array when query shipping methods
  useEffect(() => {
    if (shippingMethods) {
      const data =
        _.isArray(shippingMethods) && shippingMethods?.length > 0
          ? shippingMethods
          : [];
      const options = data?.map((item) => {
        return {
          label: item?.name,
          value: item?.id,
        };
      });
      const emptyOptions = [
        {
          label: t(
            "subscription-orders.create.form.shipping-method-empty-options",
          ),
          value: "disabled",
          disabled: true,
        },
      ];
      const finalOptions = options.length === 0 ? emptyOptions : options;

      const formShippingMethod = form.getValues("shippingMethod");
      const formShippingMethodValue = finalOptions.find(
        (item) => item.value === formShippingMethod,
      );

      if (formShippingMethod && !formShippingMethodValue) {
        form.resetField("shippingMethod");
      }

      setShippingMethodsOptions(finalOptions);
    }
  }, [shippingMethods]);

  return (
    <div className="p-5 bg-gray-50 rounded-lg text-gray-700 space-y-4">
      <div className="flex flex-col gap-y-2">
        <SectionTitle
          title={t(
            "subscription-orders.create.form.section.subscription-settings",
          )}
        />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* subscription order name */}
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItemWrapper>
                <FormLabel className="text-gray-700 font-normal">
                  {t("subscription-orders.create.form.name")} *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-white truncate text-sm"
                    placeholder={t(
                      "subscription-orders.create.form.name-placeholder",
                    )}
                  />
                </FormControl>
                <FormMessage className="text-warning" />
              </FormItemWrapper>
            )}
          />

          {/* po number */}
          <FormField
            control={control}
            name="poNumber"
            render={({ field }) => (
              <FormItemWrapper>
                <FormLabel className="text-gray-700 font-normal">
                  {t("subscription-orders.create.form.po-number")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="bg-white truncate text-sm"
                    placeholder={t(
                      "subscription-orders.create.form.po-number-placeholder",
                    )}
                  />
                </FormControl>
                <FormMessage className="text-warning" />
              </FormItemWrapper>
            )}
          />

          {/* start delivery date */}
          <FormField
            control={control}
            name="startDeliveryDate"
            render={({ field }) => (
              <FormItemWrapper>
                <FormLabel className="text-gray-700 font-normal">
                  {t("subscription-orders.create.form.start-delivery-date")} *
                </FormLabel>
                <FormControl>
                  <DatePicker
                    {...field}
                    className={cn(
                      "bg-white border-input truncate text-sm",
                      field?.value && "text-gray-700",
                    )}
                    dateFormat="MM/dd/yyyy"
                    placeholder={t(
                      "subscription-orders.create.form.start-delivery-date-placeholder",
                    )}
                    minDate={new Date()}
                  />
                </FormControl>
                <FormMessage className="text-warning" />
              </FormItemWrapper>
            )}
          />
          {/* end delivery date */}
          <FormField
            control={control}
            name="endDeliveryDate"
            render={({ field }) => (
              <FormItemWrapper>
                <FormLabel className="text-gray-700 font-normal">
                  {t("subscription-orders.create.form.end-delivery-date")}
                </FormLabel>
                <FormControl>
                  <DatePicker
                    {...field}
                    className={cn(
                      "bg-white border-input truncate text-sm",
                      field?.value && "text-gray-700",
                    )}
                    dateFormat="MM/dd/yyyy"
                    placeholder={t(
                      "subscription-orders.create.form.end-delivery-date-placeholder",
                    )}
                    minDate={minEndDeliveryDate}
                  />
                </FormControl>
                <FormMessage className="text-warning" />
              </FormItemWrapper>
            )}
          />
          {/* frequency */}
          <FormField
            control={control}
            name="frequency"
            render={({ field }) => (
              <FormItemWrapper>
                <FormLabel className="text-gray-700 font-normal">
                  {t("subscription-orders.create.form.frequency")} *
                </FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    disabled={field?.disabled || isPlan}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("customFrequencyNumber", undefined);
                      form.setValue("customFrequencyUnit", undefined);
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "bg-white text-sm",
                        !field?.value && " text-muted-foreground",
                      )}
                    >
                      <SelectValue
                        className="text-sm"
                        placeholder={t(
                          "subscription-orders.create.form.frequency-placeholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {FrequencyOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-sm"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage className="text-warning" />
              </FormItemWrapper>
            )}
          />
          {frequency === "custom" && (
            <>
              {/* custom frequency number */}
              <FormField
                control={control}
                name="customFrequencyNumber"
                render={({ field }) => (
                  <FormItemWrapper>
                    <FormLabel className="text-gray-700 font-normal">
                      {t(
                        "subscription-orders.create.form.custom-frequency-number",
                      )}{" "}
                      *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={field?.disabled || isPlan}
                        type="number"
                        min="1"
                        className="bg-white border-input text-gray-700 truncate text-sm"
                        placeholder={t(
                          "subscription-orders.create.form.custom-frequency-number-placeholder",
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === ".") {
                            e.preventDefault();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-warning" />
                  </FormItemWrapper>
                )}
              />
              {/* custom frequency unit */}
              <FormField
                control={control}
                name="customFrequencyUnit"
                render={({ field }) => (
                  <FormItemWrapper>
                    <FormLabel className="text-gray-700 font-normal">
                      {t(
                        "subscription-orders.create.form.custom-frequency-unit",
                      )}{" "}
                      *
                    </FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        disabled={field?.disabled || isPlan}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "bg-white text-sm",
                            !field?.value && " text-muted-foreground",
                          )}
                        >
                          <SelectValue
                            className="text-sm"
                            placeholder={t(
                              "subscription-orders.create.form.custom-frequency-unit-placeholder",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {CustomerFrequencyOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-sm"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-warning" />
                  </FormItemWrapper>
                )}
              />
            </>
          )}
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <SectionTitle
            title={`${t("subscription-orders.create.form.section.company-account")} *`}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="col-span-2">
              {/* customer account */}
              <FormField
                control={control}
                name="companyLocationId"
                render={({ field }) => (
                  <FormItemWrapper>
                    <FormControl>
                      <Select
                        {...field}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const selectedOption = customerAccountsOptions.find(
                            (option) => option.value === value,
                          );
                          if (selectedOption) {
                            context?.setCompanyLocationId(value);
                            context?.setShippingAddress(
                              selectedOption.meta?.shippingAddress,
                            );
                            context?.setPaymentMethod(
                              selectedOption.meta?.buyerExperienceConfiguration
                                ?.paymentTermsTemplate?.name || "",
                            );
                            form.setValue(
                              "productLines",
                              initialProductLines(),
                            );
                            form.setValue("orderTotal", undefined);
                            form.resetField("shippingMethod");
                          }
                        }}
                        disabled={
                          field?.disabled ||
                          isLoadingCustomerAccounts ||
                          isPlan ||
                          type === "edit"
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "bg-white text-sm",
                            !field?.value && " text-muted-foreground",
                          )}
                        >
                          <SelectValue
                            className="text-sm"
                            placeholder={t(
                              "subscription-orders.create.form.customer-account-placeholder",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {customerAccountsOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-sm"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-warning" />
                  </FormItemWrapper>
                )}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-y-2 col-span-2">
            <SectionTitle
              title={t("subscription-orders.create.form.section.shipping")}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* shipping method */}
              <FormField
                control={control}
                name="shippingMethod"
                render={({ field }) => (
                  <FormItemWrapper>
                    <FormLabel className="text-gray-700 font-normal">
                      {t("subscription-orders.create.form.shipping-method")} *
                    </FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const shippingMethod = shippingMethods?.find(
                            (item) => item.id === value,
                          );
                          if (shippingMethod) {
                            form.setValue("shippingMethodMeta", shippingMethod);
                            context?.setShippingMethod(shippingMethod);
                          }
                        }}
                        disabled={
                          isShippingMethodsLoading ||
                          !context?.companyLocationId ||
                          _.isEmpty(shippingMethodsOptions)
                        }
                      >
                        <SelectTrigger className="bg-white text-sm">
                          <SelectValue
                            className="text-sm"
                            placeholder={t(
                              "subscription-orders.create.form.shipping-method-placeholder",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingMethodsOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-sm"
                              disabled={option?.disabled}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-warning" />
                  </FormItemWrapper>
                )}
              />
              <div className="px-0 text-sm text-gray-700 break-words">
                <FormItemWrapper>
                  <FormLabel className="text-gray-700 font-normal">
                    {t("subscription-orders.create.form.shipping-address")}
                  </FormLabel>
                  <div>
                    <div className="flex gap-1">
                      {context?.shippingAddress?.company || ""}{" "}
                      {context?.shippingAddress?.address1 || ""}{" "}
                      {context?.shippingAddress?.address2 || ""}
                    </div>
                    <div className="flex gap-1">
                      {renderAddress(context?.shippingAddress)}{" "}
                      {context?.shippingAddress?.countryCode || ""}{" "}
                      {context?.shippingAddress?.phone || ""}
                    </div>
                  </div>
                </FormItemWrapper>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-y-2 col-span-1">
            <SectionTitle
              title={t("subscription-orders.create.form.section.payment")}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="px-0 text-sm text-gray-700 break-words">
                <FormItemWrapper>
                  <FormLabel className="text-gray-700 font-normal">
                    {t("subscription-orders.create.form.payment-method")}
                  </FormLabel>
                  <div>{context?.paymentMethod || "-"}</div>
                </FormItemWrapper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
