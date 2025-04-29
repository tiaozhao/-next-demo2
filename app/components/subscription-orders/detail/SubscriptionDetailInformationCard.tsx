import { format } from "date-fns";
import _ from "lodash";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import { Separator } from "~/components/ui/separator";
import {
  computedSubscriptionOrderDiscountTotal,
  formatDiscountText,
} from "~/lib/subscription-orders";
import { SubscriptionPlanDiscountTypeMap } from "~/lib/subscription-plan";
import { cn, formatPrice } from "~/lib/utils";

type LocationConfig = {
  name: string;
  externalId?: string;
};

type MoneyType = {
  amount: string;
  currencyCode: string;
};

type SubscriptionInfo = {
  orderName: string;
  number: string;
  companyAccount?: string;
  contactEmail?: string;
  billingAddress?: any;
  shippingAddress?: any;
  orderDate: string;
  orderedBy?: string;
  status: string;
  location?: LocationConfig;
  paymentTerms?: string;
  poNumber?: string;
  shippingMethod?: string;
  startDeliveryDate?: string;
  nextDeliveryDate?: string;
  endDeliveryDate?: string;
  frequency?: string;
  itemCount: number;
  subtotal?: MoneyType;
  total?: MoneyType;
  tax?: MoneyType;
  shipping?: MoneyType;
  note?: string;
  sellingPlan?: {
    id: number;
    name: string;
    offerDiscount: boolean;
    discountType: string;
    discountValue: number;
  };
};

interface InformationCardProps {
  subscription: SubscriptionInfo;
  mobileButtons?: ReactNode;
  desktopButtons?: ReactNode;
  orderStatusBadge?: ReactNode;
}

export default function SubscriptionDetailInformationCard({
  subscription,
  orderStatusBadge,
  mobileButtons,
  desktopButtons,
}: InformationCardProps) {
  const { t } = useTranslation();

  const {
    orderName,
    number,
    companyAccount,
    contactEmail,
    billingAddress,
    shippingAddress,
    orderDate,
    nextDeliveryDate,
    endDeliveryDate,
    orderedBy,
    status,
    paymentTerms,
    poNumber,
    shippingMethod,
    startDeliveryDate,
    frequency,
    itemCount,
    subtotal,
    total,
    tax,
    shipping,
    sellingPlan,
  } = subscription;

  const renderAddress = (address: any) => {
    const res = `${address?.city || ""}${address?.city ? "," : ""} ${address?.provinceCode || ""} ${address?.zip || ""}`;
    return res.trim().length > 0 ? res : "-";
  };

  const RenderLabel = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    return (
      <div
        className={cn(
          "min-h-11 break-words px-0 text-sm text-gray-700 lg:min-w-[295px] flex flex-col gap-y-1",
          className,
        )}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-gray-50 p-5 flex flex-col gap-y-5">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 mb-0">
        <div className="grid grid-cols-2 gap-6 lg:gap-y-0 col-span-2 mb-0">
          <div
            className={cn(
              "px-0 text-base font-bold text-gray-700 flex items-center flex-wrap gap-x-1 break-words",
            )}
          >
            {orderName}
            <span>
              <span className="mr-1">#</span>
              {number.replace("#", "")}
            </span>
          </div>

          {mobileButtons}

          <div className="!flex items-center px-0">
            {orderStatusBadge || (
              <CustomStatusBadge
                status={status}
                className="w-fit"
                type={
                  status === "active" || status === "pending"
                    ? "secondary-blue"
                    : "gray"
                }
              />
            )}
          </div>

          <div className="lg:hidden"></div>
        </div>
        <div className="app-hidden lg:block col-span-2">{desktopButtons}</div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 mb-0">
        <div className="lg:col-span-3 grid gap-6 grid-cols-2 lg:grid-cols-3 mb-0">
          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.company-account")}
            </div>
            <p className="break-words">{companyAccount}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.order-date")}
            </div>
            <p className="break-words">
              {format(new Date(orderDate), "MM/dd/yyyy")}
            </p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t(
                "subscription-orders.detail.information-card.start-delivery-date",
              )}
            </div>
            <p className="break-words">{startDeliveryDate}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t(
                "subscription-orders.detail.information-card.next-delivery-date",
              )}
            </div>
            <p className="break-words">{nextDeliveryDate}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t(
                "subscription-orders.detail.information-card.end-delivery-date",
              )}
            </div>
            <p className="break-words">{endDeliveryDate}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.frequency")}
            </div>
            <p className="break-words">{frequency || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.ordered-by")}
            </div>
            <p className="break-words">{orderedBy || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.contact-email")}
            </div>
            <p className="break-words">{contactEmail || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.po-number")}
            </div>
            <p className="break-words">{poNumber || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.payment-terms")}
            </div>
            <p className="break-words">{paymentTerms || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.billing-address")}
            </div>
            <div className="flex gap-2">
              {billingAddress?.company || ""} {billingAddress?.address1 || ""}{" "}
              {billingAddress?.address2 || ""}
            </div>
            <div className="flex gap-2">
              {renderAddress(billingAddress)}{" "}
              {billingAddress?.countryCodeV2 || ""}{" "}
              {billingAddress?.phone || ""}
            </div>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.shipping-method")}
            </div>
            <p className="break-words">{shippingMethod || "-"}</p>
          </RenderLabel>

          <RenderLabel>
            <div className="text-sm font-bold">
              {t("subscription-orders.detail.information-card.ship-to")}
            </div>
            <div className="flex gap-2">
              {shippingAddress?.company || ""} {shippingAddress?.address1 || ""}{" "}
              {shippingAddress?.address2 || ""}
            </div>
            <div className="flex gap-2">
              {renderAddress(shippingAddress)}{" "}
              {shippingAddress?.countryCodeV2 || ""}{" "}
              {shippingAddress?.phone || ""}
            </div>
          </RenderLabel>

          {sellingPlan && !!sellingPlan.id && (
            <RenderLabel>
              <div className="text-sm font-bold">
                {t("subscription-orders.detail.information-card.selling-plan")}
              </div>
              <p className="break-words">{sellingPlan.name}</p>
            </RenderLabel>
          )}
        </div>

        {/* Summary Card */}
        <div className="flex h-fit  flex-col gap-2 rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-2">
            <div className="text-lg font-bold text-gray-700">
              {t("subscription-orders.detail.information-card.summary")}
            </div>

            {/* item count */}
            <div className="flex justify-between text-sm text-gray-700">
              <div>
                {t("subscription-orders.detail.information-card.item-count")}
              </div>
              <div>
                {itemCount} {t("common.text.upper-items")}
              </div>
            </div>

            {/* subtotal */}
            <div className="flex justify-between text-sm text-gray-700">
              <div>
                {t("subscription-orders.detail.information-card.subtotal")}
              </div>
              <div className={cn(!!sellingPlan?.id && "line-through")}>
                {formatPrice(
                  subtotal?.amount || 0,
                  subtotal?.currencyCode || "USD",
                )}
              </div>
            </div>

            {/* discount */}
            {!!sellingPlan?.id && (
              <div className="flex justify-between text-sm text-gray-700">
                <div>
                  {t("subscription-orders.detail.information-card.discount")}:
                </div>
                {sellingPlan?.offerDiscount ? (
                  <div>
                    {formatDiscountText(total?.currencyCode || "", {
                      discountType:
                        SubscriptionPlanDiscountTypeMap[
                          sellingPlan?.discountType || ""
                        ],
                      discountValue: sellingPlan?.discountValue,
                    })}{" "}
                    {t("subscription-orders.detail.information-card.off")}
                  </div>
                ) : (
                  <div>
                    {t(
                      "subscription-orders.detail.information-card.no-discount",
                    )}
                  </div>
                )}
              </div>
            )}

            {/* discount total */}
            {!!sellingPlan?.id && (
              <div className="flex justify-between text-sm text-gray-700">
                <div>
                  {t(
                    "subscription-orders.detail.information-card.discount-total",
                  )}
                </div>
                <div>
                  {formatPrice(
                    computedSubscriptionOrderDiscountTotal(
                      {
                        discountType:
                          SubscriptionPlanDiscountTypeMap[
                            sellingPlan?.discountType || ""
                          ],
                        discountValue: sellingPlan?.discountValue || 0,
                      },
                      _.toNumber(subtotal?.amount || 0),
                      sellingPlan?.offerDiscount || false,
                    ),
                    subtotal?.currencyCode || "USD",
                    true,
                  )}
                </div>
              </div>
            )}
            {/* tax */}
            <div className="flex justify-between text-sm text-gray-700">
              <div>{t("subscription-orders.detail.information-card.tax")}</div>
              <div>
                {formatPrice(tax?.amount || 0, tax?.currencyCode || "USD")}
              </div>
            </div>

            {/* shipping */}
            <div className="flex justify-between text-sm text-gray-700">
              <div>
                {t("subscription-orders.detail.information-card.shipping")}
              </div>
              <div>
                {formatPrice(
                  shipping?.amount || 0,
                  shipping?.currencyCode || "USD",
                )}
              </div>
            </div>
          </div>

          <Separator />
          <div className="flex flex-col gap-2">
            {/* Total */}
            <div className="flex justify-between text-sm font-bold text-gray-700">
              <div>
                {t("subscription-orders.detail.information-card.total")}
              </div>
              <div>
                {formatPrice(total?.amount || 0, total?.currencyCode || "")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
