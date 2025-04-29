export type SubscriptionPlanFrequencyUnit =
  | "daily"
  | "weekly"
  | "monthly"
  | "annually";
export type SubscriptionPlanDiscountType = "percentage" | "amount" | "fixed";

export interface SubscriptionPlanFrequencyOption {
  lineId: string;
  interval: string;
  unit: SubscriptionPlanFrequencyUnit;
  value: string;
  intervalError?: {
    isError: boolean;
    msg: string;
  };
  unitError?: {
    isError: boolean;
    msg: string;
  };
  valueError?: {
    isError: boolean;
    msg: string;
  };
  notUnique?: boolean;
}
export interface SubscriptionPlanProductOption {
  productId: string;
  title: string;
  variantTitle?: string;
  imageUrl?: string;
  variantId: string;
  sku?: string;
  uom?: string;
  quantity: number;
  price: string;
  quantityAvailable: number;
  quantityRule?: {
    minimum?: number | null;
    maximum?: number | null;
    increment?: number | null;
  };
  quantityError?: {
    isError: boolean;
    msg: string;
  };
}

export interface SubscriptionPlanFormData {
  title: string;
  description: string;
  company: string;
  companyLocation: string;
  //   products: ProductOption[];
  //   frequency: FrequencyOption[];
  offerDiscount: boolean;
  discountType: SubscriptionPlanDiscountType;
}

export interface SubscriptionPlanFormDataEdit {
  id: string;
  title: string;
  description: string;
  company: string;
  companyLocation: string;
  offerDiscount: boolean;
  discountType: SubscriptionPlanDiscountType;
  frequencies: SubscriptionPlanFrequencyOption[];
  products: SubscriptionPlanProductOption[];
}

export interface SubscriptionPlanFormDataErrorState {
  isError: boolean;
  msg: string;
}

export type SubscriptionPlanFormDataError = Record<
  keyof SubscriptionPlanFormData,
  SubscriptionPlanFormDataErrorState
>;
