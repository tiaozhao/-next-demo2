import _ from "lodash";
import type { QuickOrderFormSchema } from "~/types/quick-order";
import {
  extractVariantId,
  flatSearchResultV2,
  getExistingLineWhenSelectProduct,
  getValidQuantity,
} from "./quick-order";
import { formatPrice } from "./utils";
import {
  AddRecommendedProductAtFormConfig,
  AddRecommendedProductAtFormParams,
  FormatSubscriptionOrderInformationFormData,
} from "~/types/subscription-orders.types";
import Decimal from "decimal.js";
import { CreateSubscriptionContractRequest } from "~/types/subscription-contracts/subscription-contract-create.schema";
import { UpdateSubscriptionContractRequest } from "~/types/subscription-contracts/subscription-contract-update.schema";
import { TFunction } from "i18next";
import { ProductInfo } from "~/types/subscription-contracts/subscription-contract-get-by-id.schema";
import { SubscriptionContractStatusType } from "~/types/subscription-contracts/subscription-contract.schema";
import { CustomerDetailsResponse } from "~/types/customer-management/customer-details.schema";
import { SubscriptionPlanDiscountType } from "~/types/subscription-plan.types";
import { SellingPlanWithLines } from "~/types/selling-plans/selling-plan.schema";
import { UseFormReturn } from "react-hook-form";
import { SubscriptionOrderInformationFormData } from "./schema/create-subscription.schema";
import { ContextType } from "react";
import { SubscriptionOrderContext } from "~/context/subscription-order.context";

export const SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY =
  "subscription-recommended-product";

export const SUBSCRIPTION_MAX_END_DATE = "9999-12-31";

export const SUBSCRIPTION_PLAN_STORAGE_KEY = "subscription-order-plan";

const cleanRecommendedProuctSessionStorage = (cleanStorage: boolean) => {
  if (cleanStorage) {
    sessionStorage.removeItem(SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY);
  }
};

export const addRecommendedProductAtForm = ({
  form,
  productVariants,
  storeName,
  config,
}: AddRecommendedProductAtFormParams) => {
  const { addType = "to-the-end", cleanStorage = true } = config;
  // when type is add, only one product will be added
  const storedRecommendedProducts = sessionStorage.getItem(
    SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY,
  );
  if (!storedRecommendedProducts || !productVariants) return;
  const parsedItems = JSON.parse(storedRecommendedProducts);

  const results = flatSearchResultV2(productVariants?.products).filter(
    (product) =>
      parsedItems.recommendedProducts.some(
        (item: any) => item.sku === product.sku,
      ),
  );
  const datas = results
    .map((product) => {
      const matchedItem = parsedItems.recommendedProducts.find(
        (item: any) => product.sku === item.sku,
      );
      if (matchedItem) {
        const targetPrice = _.toString(matchedItem?.offerPrice);
        const quantity = matchedItem?.quantity;
        return {
          product: {
            id: product.id,
            variantId: product?.variantId,
            name: `${extractVariantId(product?.sku || "")}-${product?.name}`,
            originalName: product?.name,
            sku: product?.sku,
            price: product?.price,
            uom: [...(product?.uom || [])],
            description: product.description,
            quantityAvailable: product?.quantityAvailable,
            image: product?.image,
            updatedAt: product?.updatedAt,
            onlineStoreUrl: product?.onlineStoreUrl
              ? `${storeName}/products/${product?.onlineStoreUrl}`
              : "",
            quantityRule: product?.quantityRule,
            weight: product?.weight,
            weightUnit: product?.weightUnit,
          },
          quantity: quantity || product?.quantityRule?.minimum || 1,
          selectedUom: product?.uom?.[0] || "",
          targetPrice: formatPrice(
            _.toNumber(targetPrice || product?.price?.amount || 0),
            product?.price?.currencyCode || "",
            true,
          ),
        };
      }
    })
    .filter((item) => item);

  const lines = {};
  datas.forEach((item) => {
    const lineId = _.uniqueId("product_");
    const array = lines as Record<
      string,
      QuickOrderFormSchema["productLines"][string]
    >;
    array[lineId] = item;
  });
  if (addType === "clean-all") {
    const orderTotal = getSubsciptionProductTotalPrice(lines);
    form.setValue("productLines", lines);
    form.setValue("orderTotal", orderTotal);
    cleanRecommendedProuctSessionStorage(cleanStorage);
    return;
  }
  if (addType === "to-the-end") {
    const product = productVariants?.products?.[0];
    const variant = (product?.variants?.nodes || [])?.filter((variant) =>
      parsedItems.recommendedProducts.some(
        (item: any) => item.sku === variant.sku,
      ),
    )?.[0];
    const existingLine = getExistingLineWhenSelectProduct(
      form.getValues("productLines"),
      variant?.sku || "",
    );
    if (existingLine) {
      const [existingLineId, existingLineData] = existingLine;
      const newQuantity = getValidQuantity(
        existingLineData?.quantity || 0,
        variant?.contextualPricing?.quantityRule?.increment || 1,
        true,
      );
      form.setValue("productLines", {
        ...form.getValues("productLines"),
        [existingLineId]: {
          ...existingLineData,
          quantity: newQuantity,
        },
      });
      cleanRecommendedProuctSessionStorage(cleanStorage);
      return;
    }
    const productLines = form.getValues("productLines");
    const firstEmptyLine = Object.entries(productLines).find(
      ([lineId, lineData]) => {
        if (!lineData?.product?.sku || !lineData?.product?.variantId) {
          return true;
        }
      },
    );

    if (firstEmptyLine) {
      form.setValue("productLines", {
        ...productLines,
        [firstEmptyLine[0]]: datas[0],
      });
      cleanRecommendedProuctSessionStorage(cleanStorage);
      return;
    }

    form.setValue("productLines", {
      ...productLines,
      ...lines,
    });
    cleanRecommendedProuctSessionStorage(cleanStorage);
  }
};

export const getSubsciptionProductTotalPrice = (
  productLines: QuickOrderFormSchema["productLines"],
) => {
  const total = Object.entries(productLines).reduce((acc, [key, value]) => {
    const reg = /[^0-9.]/g;
    const extractNumber = _.toString(value?.targetPrice || "").replace(reg, "");

    const targetPrice = _.toNumber(_.toString(extractNumber).replace(reg, ""));
    return Decimal.add(
      acc,
      Decimal.mul(
        _.toNumber(targetPrice || 0),
        _.toNumber(value?.quantity || 0),
      ),
    ).toNumber();
  }, 0);
  return total;
};

export const getSubsciptionProductTotalWeight = (
  productLines: QuickOrderFormSchema["productLines"],
) => {
  const total = Object.entries(productLines).reduce((acc, [key, value]) => {
    const reg = /[^0-9.]/g;
    const extractNumber = _.toString(value?.product?.weight || "").replace(
      reg,
      "",
    );

    const targetWeight = _.toNumber(_.toString(extractNumber).replace(reg, ""));
    return Decimal.add(
      acc,
      Decimal.mul(
        _.toNumber(targetWeight || 0),
        _.toNumber(value?.quantity || 0),
      ),
    ).toNumber();
  }, 0);
  return total;
};

const baseFormatSubscriptionContractRequest = ({
  successLines,
  values,
  shippingMethod,
  config,
}: FormatSubscriptionOrderInformationFormData & {
  config: {
    productWithProductId?: boolean;
  };
}) => {
  const { productWithProductId } = config;
  const productItems = successLines.map((item: any) => {
    return {
      ...(productWithProductId && {
        id: item.product.id,
      }),
      variantId: item.product.variantId,
      quantity: item.quantity,
      sku: item.product.sku,
      price: _.toNumber(item.product.price?.amount || 0),
    };
  });
  const currencyCode = successLines?.[0]?.product?.price?.currencyCode || "USD";

  let intervalValue = 1;
  let intervalUnit = values?.frequency;
  if (values.frequency === "custom") {
    intervalValue = _.toNumber(values?.customFrequencyNumber || 1);
    intervalUnit = values?.customFrequencyUnit || "weekly";
  }

  const { rateProvider } = shippingMethod || {};
  const { definition, participant } = rateProvider || {};

  const priceObject = definition?.price || participant?.fixedFee;

  const shippingLine = {
    title: shippingMethod?.name || "",
    priceWithCurrency: {
      amount: _.toNumber(priceObject?.amount) || 0,
      currencyCode: priceObject?.currencyCode || "",
    },
  };

  return {
    productItems,
    currencyCode,
    intervalValue,
    intervalUnit,
    shippingLine,
  };
};

export const formatCreateSubscriptionContractRequest = ({
  successLines,
  values,
  shippingMethod,
  companyLocationId,
  shopifyCustomerId,
  shopifyCompanyId,
  storeName,
  customerData,
}: FormatSubscriptionOrderInformationFormData & {
  customerData: CustomerDetailsResponse;
}): CreateSubscriptionContractRequest => {
  const {
    productItems,
    currencyCode,
    intervalValue,
    intervalUnit,
    shippingLine,
  } = baseFormatSubscriptionContractRequest({
    successLines,
    values,
    shippingMethod,
    companyLocationId,
    shopifyCustomerId,
    shopifyCompanyId,
    storeName,
    config: {
      productWithProductId: false,
    },
  });

  const createParams: CreateSubscriptionContractRequest = {
    storeName,
    customerId: shopifyCustomerId,
    companyId: shopifyCompanyId,
    companyLocationId: companyLocationId || "",
    createdById: customerData?.customer?.companyContactId,
    createdByName: `${customerData?.customer?.firstName} ${customerData?.customer?.lastName}`,
    subscription: {
      name: values.name,
      poNumber: values?.poNumber,
      currencyCode,
      startDate: new Date(values.startDeliveryDate).toISOString(),
      endDate: values.endDeliveryDate
        ? new Date(values.endDeliveryDate).toISOString()
        : new Date(SUBSCRIPTION_MAX_END_DATE).toISOString(),
      intervalValue,
      intervalUnit: intervalUnit as
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "biannual"
        | "annually",
      shippingMethod: shippingLine.title,
      shippingCost: shippingLine.priceWithCurrency?.amount,
      shippingMethodId: shippingMethod?.id,

      items: productItems,
    },
  };

  return createParams;
};

export const formatUpdateSubscriptionContractRequest = ({
  subscriptionContractId,
  successLines,
  values,
  shippingMethod,
  companyLocationId,
  shopifyCustomerId,
  shopifyCompanyId,
  storeName,
}: FormatSubscriptionOrderInformationFormData & {
  subscriptionContractId: number;
}): UpdateSubscriptionContractRequest => {
  const { productItems, intervalValue, intervalUnit, shippingLine } =
    baseFormatSubscriptionContractRequest({
      successLines,
      values,
      shippingMethod,
      companyLocationId,
      shopifyCustomerId,
      shopifyCompanyId,
      storeName,
      config: {
        productWithProductId: false,
      },
    });

  const updateParams: UpdateSubscriptionContractRequest = {
    storeName,
    subscriptionContractId,
    companyLocationId: companyLocationId || "",
    customerId: shopifyCustomerId,
    data: {
      name: values.name,
      poNumber: values?.poNumber,
      startDate: new Date(values.startDeliveryDate).toISOString(),
      endDate: values.endDeliveryDate
        ? new Date(values.endDeliveryDate).toISOString()
        : new Date(SUBSCRIPTION_MAX_END_DATE).toISOString(),
      intervalValue,
      intervalUnit: intervalUnit as
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "biannual"
        | "annually",
      shippingMethodName: shippingLine.title,
      shippingCost: shippingLine.priceWithCurrency?.amount,
      shippingMethodId: shippingMethod?.id,

      lines: productItems,
    },
  };

  return updateParams;
};

export const formatSubscriptionListFrequency = (
  intervalUnit: string,
  intervalValue: number,
  t: TFunction,
) => {
  const i18nPrefix = "subscription-orders.list.table.frequency-options";
  const map = {
    daily: t(`${i18nPrefix}.daily`),
    weekly: t(`${i18nPrefix}.weekly`),
    monthly: t(`${i18nPrefix}.monthly`),
    quarterly: t(`${i18nPrefix}.quarterly`),
    biannual: t(`${i18nPrefix}.biannual`),
    annually: t(`${i18nPrefix}.annually`),
    days: t(`${i18nPrefix}.days`),
    weeks: t(`${i18nPrefix}.weeks`),
    months: t(`${i18nPrefix}.months`),
    years: t(`${i18nPrefix}.years`),
  };
  const multipMap = {
    daily: map.days,
    weekly: map.weeks,
    monthly: map.months,
    annually: map.years,
  };
  let text = map[intervalUnit as keyof typeof map];
  if (intervalValue > 1) {
    text = `${intervalValue} ${multipMap[intervalUnit as keyof typeof multipMap]}`;
  }
  return text;
};

export const computedSubscriptionOrderTotal = (
  lines: ProductInfo[],
  shippingCost: number,
  discount?: {
    discountType: SubscriptionPlanDiscountType;
    discountValue: number;
    offerDiscount: boolean;
  },
) => {
  const productsTotal = lines.reduce((acc, curr) => {
    const variant = curr.variant;
    const price = variant?.price || 0;
    const quantity = variant?.quantity || 0;
    return Decimal.add(acc, Decimal.mul(price, quantity)).toNumber();
  }, 0);
  let discountProductsTotal = productsTotal;
  if (discount) {
    discountProductsTotal = computedSubscriptionOrderDiscountTotal(
      discount,
      productsTotal,
      discount.offerDiscount,
    );
  }
  const Total = Decimal.add(discountProductsTotal, shippingCost).toNumber();

  return {
    subtotal: productsTotal,
    total: Total,
    shipping: shippingCost,
  };
};

export const shouldShowSubscriptionButton = (
  status: SubscriptionContractStatusType,
  applyStatusArray: SubscriptionContractStatusType[],
) => {
  return applyStatusArray.includes(status);
};

export const computedSubscriptionOrderDiscountTotal = (
  discount: {
    discountType: SubscriptionPlanDiscountType;
    discountValue: number;
  },
  orderTotal: number,
  offerDiscount: boolean,
  reverse?: boolean,
) => {
  if (offerDiscount) {
    if (discount.discountType === "percentage") {
      return Decimal.mul(
        orderTotal,
        Decimal.sub(1, Decimal.mul(discount.discountValue, 0.01)),
      ).toNumber();
    }
    if (discount.discountType === "fixed") {
      return discount.discountValue;
    }
    if (discount.discountType === "amount") {
      return Decimal.max(
        Decimal.sub(orderTotal, discount.discountValue),
        0,
      ).toNumber();
    }
    return orderTotal;
  }
  return orderTotal;
};

export const applyPlanToSubscriptionOrderForm = (
  plan: SellingPlanWithLines,
  form: UseFormReturn<SubscriptionOrderInformationFormData>,
  subscriptionOrderContext: ContextType<typeof SubscriptionOrderContext>,
  handleAddRecommendedProductAtForm: (
    skus: string[],
    companyLocationId?: string,
    config?: AddRecommendedProductAtFormConfig,
  ) => void,
) => {
  const { setValue } = form;
  const { deliveryPolicies, companyLocation, lines } = plan;
  const deliveryPolicy = deliveryPolicies?.[0];
  const { intervalUnit, intervalValue } = deliveryPolicy || {};

  setValue("companyLocationId", companyLocation?.id as string);
  subscriptionOrderContext?.setEditDataForInit({
    isInit: false,
    companyLocationId: companyLocation?.id as string,
    shippingMethodId: "",
  });

  if (intervalValue !== 1 || intervalUnit === "daily") {
    setValue("frequency", "custom");
    setValue("customFrequencyNumber", _.toString(intervalValue));
    setValue("customFrequencyUnit", intervalUnit);
  } else {
    setValue("frequency", intervalUnit);
  }

  const productLines = lines
    .map((line) => {
      return {
        sku: line?.variant?.sku,
        quantity: line?.variant?.quantity || 1,
      };
    })
    .filter((sku) => sku !== undefined);
  const skus = productLines
    .map((line) => line?.sku)
    .filter((sku) => sku !== undefined) as string[];
  sessionStorage.setItem(
    SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY,
    JSON.stringify({
      recommendedProducts: productLines,
    }),
  );
  handleAddRecommendedProductAtForm(skus, companyLocation?.id as string, {
    addType: "clean-all",
    cleanStorage: true,
  });
};

export const formatDiscountText = (
  currencyCode: string | null,
  discount?: {
    discountType: SubscriptionPlanDiscountType;
    discountValue: number;
  },
) => {
  if (!discount) return;
  if (discount.discountType === "percentage") {
    return `${discount.discountValue}%`;
  }
  if (discount.discountType === "amount") {
    return `${
      currencyCode
        ? formatPrice(discount.discountValue, currencyCode)
        : discount.discountValue
    }`;
  }
  return discount.discountValue;
};

// Date Unit
export const SUBSCRIPTION_ORDER_DATE_UNIT = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
  YEARS: "years",
} as const;

// Frequency Mapping Config
export const SUBSCRIPTION_FREQUENCY_DATE_CONFIG = {
  weekly: { value: 1, unit: SUBSCRIPTION_ORDER_DATE_UNIT.WEEKS },
  monthly: { value: 1, unit: SUBSCRIPTION_ORDER_DATE_UNIT.MONTHS },
  quarterly: { value: 3, unit: SUBSCRIPTION_ORDER_DATE_UNIT.MONTHS },
  biannual: { value: 6, unit: SUBSCRIPTION_ORDER_DATE_UNIT.MONTHS },
  annually: { value: 1, unit: SUBSCRIPTION_ORDER_DATE_UNIT.YEARS },
} as const;

// Custom Frequency Unit Mapping
export const SUBSCRIPTION_CUSTOM_FREQUENCY_UNIT_MAP = {
  daily: SUBSCRIPTION_ORDER_DATE_UNIT.DAYS,
  weekly: SUBSCRIPTION_ORDER_DATE_UNIT.WEEKS,
  monthly: SUBSCRIPTION_ORDER_DATE_UNIT.MONTHS,
  annually: SUBSCRIPTION_ORDER_DATE_UNIT.YEARS,
} as const;

// Date Calculation Utility Function
export const subscriptionOrderCalculateNextDate = (
  baseDate: Date,
  value: number,
  unit: string,
): Date => {
  const date = new Date(baseDate);

  switch (unit) {
    case SUBSCRIPTION_ORDER_DATE_UNIT.DAYS:
      return new Date(date.setDate(date.getDate() + value));
    case SUBSCRIPTION_ORDER_DATE_UNIT.WEEKS:
      return new Date(date.setDate(date.getDate() + value * 7));
    case SUBSCRIPTION_ORDER_DATE_UNIT.MONTHS:
      return new Date(date.setMonth(date.getMonth() + value));
    case SUBSCRIPTION_ORDER_DATE_UNIT.YEARS:
      return new Date(date.setFullYear(date.getFullYear() + value));
    default:
      return new Date(date.setDate(date.getDate() + 1));
  }
};
