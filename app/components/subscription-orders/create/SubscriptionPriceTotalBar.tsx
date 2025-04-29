import _ from "lodash";
import { useTranslation } from "react-i18next";
import {
  computedSubscriptionOrderDiscountTotal,
  formatDiscountText,
} from "~/lib/subscription-orders";
import { cn, formatPrice } from "~/lib/utils";
import { SubscriptionPlanDiscountType } from "~/types/subscription-plan.types";

export default function SubscriptionPriceTotalBar({
  orderTotal,
  currencyCode,
  discount,
  offerDiscount,
}: {
  offerDiscount: boolean;
  orderTotal: number;
  currencyCode: string | null;
  discount?: {
    discountType: SubscriptionPlanDiscountType;
    discountValue: number;
  };
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end items-center w-full">
      <div className="bg-white px-4 py-[10px] space-y-2 border rounded-lg border-border w-fit">
        <div className="flex justify-between items-center gap-x-4 ">
          <div className="text-sm font-bold text-gray-700">
            {t("subscription-orders.create.form.price-bar.subtotal")}:
          </div>
          <div
            className={cn(
              "text-sm text-gray-700 font-bold",
              discount && "line-through",
            )}
          >
            {currencyCode ? formatPrice(orderTotal, currencyCode) : orderTotal}
          </div>
        </div>
        {discount && (
          <>
            <div className="flex justify-between items-center gap-x-4 ">
              <div className="text-sm font-bold text-gray-700">
                {t("subscription-orders.create.form.price-bar.discount")}:
              </div>
              {offerDiscount ? (
                <div className={cn("text-sm text-gray-700 font-bold")}>
                  {formatDiscountText(currencyCode, discount)}{" "}
                  {t("subscription-orders.create.form.price-bar.off")}
                </div>
              ) : (
                <div className="text-sm text-gray-700 font-bold">
                  {t("subscription-orders.create.form.price-bar.no-discount")}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center gap-x-4 ">
              <div className="text-sm font-bold text-gray-700">
                {t("subscription-orders.create.form.price-bar.discount-total")}:
              </div>
              <div className="text-sm text-gray-700 font-bold">
                {currencyCode
                  ? formatPrice(
                      computedSubscriptionOrderDiscountTotal(
                        discount,
                        orderTotal,
                        offerDiscount,
                      ),
                      currencyCode,
                      true,
                    )
                  : orderTotal}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
