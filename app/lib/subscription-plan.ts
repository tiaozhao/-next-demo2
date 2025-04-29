import _ from "lodash";

import { TFunction } from "i18next";
import {
  SubscriptionPlanFrequencyUnit,
  SubscriptionPlanFormData,
  SubscriptionPlanFormDataError,
  SubscriptionPlanFrequencyOption,
  SubscriptionPlanProductOption,
  SubscriptionPlanDiscountType,
} from "~/types/subscription-plan.types";
import { formatPrice } from "./utils";

type FrequencyJudgeValue = {
  key: "interval" | "unit" | "value";
  discountType: SubscriptionPlanDiscountType;
  value: string | SubscriptionPlanFrequencyUnit;
  lineId: string;
};

export const initFrequencies = (): SubscriptionPlanFrequencyOption[] => {
  return [
    {
      interval: "1",
      unit: "weekly",
      value: "",
      lineId: _.uniqueId("frequency"),
    },
  ];
};

const groupFrequencies = (frequencies: SubscriptionPlanFrequencyOption[]) => {
  return _.groupBy(frequencies, (freq) => `${freq.interval}-${freq.unit}`);
};

const getDuplicateGroups = (frequencies: SubscriptionPlanFrequencyOption[]) => {
  const groups = groupFrequencies(frequencies);
  const duplicateGroups = Object.entries(groups)
    .filter(([_, group]) => group.length > 1)
    .reduce(
      (acc, [key, group]) => {
        acc[key] = group;
        return acc;
      },
      {} as Record<string, SubscriptionPlanFrequencyOption[]>,
    );
  const lineIds = _.uniq(
    Object.values(duplicateGroups).flatMap((group) =>
      group.map((freq) => freq.lineId),
    ),
  );
  return {
    duplicateGroups,
    lineIds,
  };
};

const formatFrequencyToCheckUnique = (
  frequencies: SubscriptionPlanFrequencyOption[],
) => {
  const { lineIds } = getDuplicateGroups(frequencies);

  frequencies.forEach((f) => {
    f["notUnique"] = lineIds.includes(f.lineId);
  });

  return lineIds;
};

export const formatNewFrequencies = (
  frequencies: SubscriptionPlanFrequencyOption[],
  setFrequencies: (frequencies: SubscriptionPlanFrequencyOption[]) => void,
  data: FrequencyJudgeValue,
  t: TFunction,
): void => {
  const { key, value, lineId, discountType } = data;
  const clonedFrequencies = _.cloneDeep(frequencies);
  const findFrequency = clonedFrequencies.find((f) => f.lineId === lineId);
  if (!findFrequency) {
    return;
  }
  // if the key is not unit, then we need to judge the error
  if (key !== "unit") {
    const error = judgeSubscriptionPlanFrequencyError(
      {
        key,
        value,
        lineId,
        discountType,
      },
      t,
    );

    findFrequency[key] = value;
    findFrequency[`${key}Error`] = error;

    // if the key is interval, then we need to format the frequency to check unique
    if (key === "interval") {
      formatFrequencyToCheckUnique(clonedFrequencies);
    }

    setFrequencies(clonedFrequencies);
    return;
  }

  // if the key is unit, then we need to format the frequency to check unique
  if (key === "unit") {
    findFrequency[key] = value as SubscriptionPlanFrequencyUnit;

    formatFrequencyToCheckUnique(clonedFrequencies);
    setFrequencies(clonedFrequencies);
  }
};

export const judgeSubscriptionPlanFrequencyError = (
  judgeValue: FrequencyJudgeValue,
  t: TFunction,
) => {
  const { key, value, discountType } = judgeValue;
  const error = {
    isError: false,
    msg: "",
  };
  const i18nPrefix = "admin-portal.subscription-plan.create.form";
  const i18nKeyType = key === "value" ? "discount-value" : "delivery-interval";
  if (key !== "unit") {
    // not a number
    const isNotANumberError = _.isNaN(_.toNumber(value));
    if (isNotANumberError) {
      error.isError = true;
      error.msg = t(`${i18nPrefix}.${i18nKeyType}.not-a-number`);
      return error;
    }

    // empty
    if (value.length === 0) {
      error.isError = true;
      error.msg = t(`${i18nPrefix}.${i18nKeyType}.required`);
      return error;
    }
    // less than 1
    const isLessThanOneError = _.toNumber(value) < 1;
    if (isLessThanOneError) {
      error.isError = true;
      error.msg = t(`${i18nPrefix}.${i18nKeyType}.greater-than-zero`);
      return error;
    }

    // greater than 100
    if (key === "value") {
      if (discountType !== "percentage") return error;

      const isGreaterThanOneHundredError = _.toNumber(value) > 100;
      if (isGreaterThanOneHundredError) {
        error.isError = true;
        error.msg = t(
          `${i18nPrefix}.discount-value.percentage-must-be-less-than-100`,
        );
      }
      return error;
    }
  }
  return error;
};

export const formatSubscriptionFrequencyText = (
  frequencies: Pick<SubscriptionPlanFrequencyOption, "interval" | "unit">[],
  t: TFunction,
) => {
  const i18nPrefix = "admin-portal.subscription-plan.frequency.text";
  if (frequencies.length > 1) {
    return t(`${i18nPrefix}.multiple`, {
      count: frequencies.length,
    });
  }
  const unit = t(
    `${i18nPrefix}.${frequencies[0].unit}${_.toNumber(frequencies[0].interval) === 1 ? "" : "-multiple"}`,
  );

  const frequency =
    _.toNumber(frequencies[0].interval) === 1 ? "" : frequencies[0].interval;
  return t(`${i18nPrefix}.single`, {
    frequency,
    unit,
  });
};
const checkAvailableQuantity = (product: SubscriptionPlanProductOption) => {
  return (product?.quantity || 0) > (product?.quantityAvailable || 0);
};
const checkQuantityRule = (
  product: SubscriptionPlanProductOption,
  t: TFunction,
) => {
  const quantityRule = product?.quantityRule || {};
  const { minimum, maximum, increment } = quantityRule;
  if (minimum && (product?.quantity || 0) < minimum) {
    return {
      type: "min",
      msg: t(
        "admin-portal.subscription-plan.create.form.product.quantity.quantity-rule.min",
        {
          minQuantity: minimum,
        },
      ),
    };
  }
  if (maximum && (product?.quantity || 0) > maximum) {
    return {
      type: "max",
      msg: t(
        "admin-portal.subscription-plan.create.form.product.quantity.quantity-rule.max",
        {
          maxQuantity: maximum,
        },
      ),
    };
  }
  if (increment && (product?.quantity || 0) % increment !== 0) {
    return {
      type: "increment",
      msg: t(
        "admin-portal.subscription-plan.create.form.product.quantity.quantity-rule.increment",
        {
          increment,
        },
      ),
    };
  }
  return {
    type: "valid",
  };
};
export const validSubscriptionPlanForm = ({
  frequencies,
  setFrequencies,
  formData,
  formDataError,
  setFormDataError,
  products,
  setProducts,
  t,
}: {
  frequencies: SubscriptionPlanFrequencyOption[];
  setFrequencies: (frequencies: SubscriptionPlanFrequencyOption[]) => void;
  formData: SubscriptionPlanFormData;
  formDataError: SubscriptionPlanFormDataError;
  setFormDataError: (formDataError: SubscriptionPlanFormDataError) => void;
  products: SubscriptionPlanProductOption[];
  setProducts: (products: SubscriptionPlanProductOption[]) => void;
  t: TFunction;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    const clonedFormDataError = _.cloneDeep(formDataError);
    let informationError = false;
    // check basic information
    if (!formData.title || formData.title.trim() === "") {
      clonedFormDataError.title.isError = true;
      clonedFormDataError.title.msg = t(
        "admin-portal.subscription-plan.create.form.title.required",
      );
      informationError = true;
    }

    if (!formData.description || formData.description.trim() === "") {
      clonedFormDataError.description.isError = true;
      clonedFormDataError.description.msg = t(
        "admin-portal.subscription-plan.create.form.description.required",
      );
      informationError = true;
    }

    // check company information
    if (!formData.company) {
      clonedFormDataError.company.isError = true;
      clonedFormDataError.company.msg = t(
        "admin-portal.subscription-plan.create.form.company.required",
      );
      informationError = true;
    }

    if (!formData.companyLocation) {
      clonedFormDataError.companyLocation.isError = true;
      clonedFormDataError.companyLocation.msg = t(
        "admin-portal.subscription-plan.create.form.company-location.required",
      );
      informationError = true;
    }

    // check product setting
    // disable check product rule
    let hasInvalidProduct = false;
    // products.forEach((product) => {
    //   const quantityError = checkAvailableQuantity(product);
    //   if (quantityError) {
    //     hasInvalidProduct = true;
    //     product.quantityError = {
    //       isError: true,
    //       msg: t(
    //         "admin-portal.subscription-plan.create.form.product.quantity.out-of-stock",
    //         {
    //           maxQuantity: product.quantityAvailable,
    //         },
    //       ),
    //     };
    //     return;
    //   }
    //   const quantityRuleError = checkQuantityRule(product, t);
    //   if (quantityRuleError.type !== "valid") {
    //     hasInvalidProduct = true;
    //     product.quantityError = {
    //       isError: true,
    //       msg: quantityRuleError?.msg || "",
    //     };
    //     return;
    //   }
    //   product.quantityError = {
    //     isError: false,
    //     msg: "",
    //   };
    // });

    setProducts(products);

    // check frequency setting
    let hasInvalidFrequency = false;
    frequencies.forEach((frequency) => {
      // check interval is valid
      if (frequency.intervalError?.isError) {
        hasInvalidFrequency = true;
      } else {
        // judge interval error
        const error = judgeSubscriptionPlanFrequencyError(
          {
            key: "interval",
            value: frequency.interval,
            lineId: frequency.lineId,
            discountType: formData.discountType,
          },
          t,
        );
        frequency["intervalError"] = error;
        if (error.isError) {
          hasInvalidFrequency = true;
        }
      }

      // check unit is valid
      if (!frequency.unit || frequency.unitError?.isError) {
        hasInvalidFrequency = true;
      }

      // if offer discount, check discount value
      if (formData.offerDiscount) {
        if (frequency?.valueError?.isError) {
          hasInvalidFrequency = true;
        } else {
          // judge discount value error
          const error = judgeSubscriptionPlanFrequencyError(
            {
              key: "value",
              value: frequency.value,
              lineId: frequency.lineId,
              discountType: formData.discountType,
            },
            t,
          );
          frequency["valueError"] = error;
          hasInvalidFrequency = error.isError;
        }
      }

      // check if there is duplicate frequency setting
      if (frequency.notUnique) {
        hasInvalidFrequency = true;
      }
    });

    // check has same frequency when have not edit the input bar
    const lineIds = formatFrequencyToCheckUnique(frequencies);

    if (
      hasInvalidFrequency ||
      informationError ||
      hasInvalidProduct ||
      lineIds.length > 0
    ) {
      setFormDataError(clonedFormDataError);
      resolve(false);
      return;
    }

    // all validation passed
    resolve(true);
  });
};

export const resetAllFrequenciesError = (
  frequencies: SubscriptionPlanFrequencyOption[],
  setFrequencies: (frequencies: SubscriptionPlanFrequencyOption[]) => void,
) => {
  frequencies.forEach((frequency) => {
    frequency.intervalError = {
      isError: false,
      msg: "",
    };
    frequency.unitError = {
      isError: false,
      msg: "",
    };
    frequency.valueError = {
      isError: false,
      msg: "",
    };
  });
  setFrequencies(frequencies);
};

export const SubscriptionPlanDiscountTypeMap: Record<string, any> = {
  percentage: "percentage",
  fixed: "fixed_price",
  amount: "fixed_amount",

  // for edit page
  fixed_price: "fixed",
  fixed_amount: "amount",
};
export const SubscriptionPlanCustomerId = "staffId";

export const formatSubscriptionPlanDiscountValue = ({
  offerDiscount,
  discountValue,
  discountType,
  currencyCode,
  t,
}: {
  offerDiscount: boolean;
  discountValue: number;
  discountType: SubscriptionPlanDiscountType;
  currencyCode: string;
  t: TFunction;
}) => {
  const i18nPrefix =
    "subscription-orders.choose-plan.list.expand.frequencies.discount-value";
  if (!offerDiscount) {
    return t(`${i18nPrefix}.no-discount`);
  }

  if (discountType === "percentage") {
    return t(`${i18nPrefix}.percentage-discount`, {
      discountValue,
    });
  }

  if (discountType === "fixed") {
    return t(`${i18nPrefix}.fixed-discount`, {
      discountValue,
    });
  }

  if (discountType === "amount") {
    return t(`${i18nPrefix}.amount-discount`, {
      discountValue: formatPrice(discountValue, currencyCode),
    });
  }
};
