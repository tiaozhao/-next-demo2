import { useParams } from "@remix-run/react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import OrderDetailProductTable from "~/components/order-history/order-detail/OrderDetailProductTable";
import _ from "lodash";
import { useGetSubscriptionOrderById } from "~/hooks/use-subscription-orders";
import { useShopifyInformation } from "~/lib/shopify";
import Decimal from "decimal.js";
import SubscriptionDetailHeader from "~/components/subscription-orders/detail/SubscriptionDetailHeader";
import DeliveryHistoryList from "~/components/subscription-orders/detail/delivery-history/DeliveryHistoryList";
import { useMemo } from "react";
import SubscriptionDetailInformation from "~/components/subscription-orders/detail/SubscriptionDetailInformation";

export default function SubscriptionDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { storeName, shopifyCustomerId, isB2B } = useShopifyInformation();
  const { data: subscriptionOrder, isLoading: isLoadingSubscriptionOrder } =
    useGetSubscriptionOrderById({
      id: _.toNumber(id),
      storeName: storeName,
      customerId: shopifyCustomerId,
    });

  const lineItem = useMemo(
    () =>
      subscriptionOrder?.subscriptionContract?.lines.map((item) => ({
        id: item.id,
        variantId: item.variant?.id || "",
        title: item.title,
        customerPartnerNumber: item?.variant?.customerPartnerNumber || "-",
        sku: item.variant?.sku || "",
        quantity: item.variant?.quantity || 0,
        subtotal: {
          amount: _.toString(
            Decimal.mul(
              item.variant?.price || 0,
              item.variant?.quantity || 0,
            ).toNumber(),
          ),
          currencyCode: subscriptionOrder?.subscriptionContract?.currencyCode,
        },
        image: {
          transformedSrc: item?.image?.[0]?.url,
          altText: item?.image?.[0]?.altText,
        },
      })),
    [subscriptionOrder],
  );

  if (isLoadingSubscriptionOrder) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!subscriptionOrder) {
    return <div>{t("subscription.detail.no-subscription-found")}</div>;
  }

  return (
    <div className="print-section w-full space-y-5 pb-[44px]">
      <SubscriptionDetailHeader />

      <SubscriptionDetailInformation
        id={id || ""}
        data={subscriptionOrder?.subscriptionContract}
      />

      {["declined", "cancelled"].includes(
        subscriptionOrder?.subscriptionContract?.status,
      ) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-2 flex-1 min-w-0">
              <p className="text-sm font-semibold break-words">
                {t("subscription-orders.detail.declined-by")}{" "}
                {subscriptionOrder?.subscriptionContract?.approvedByName || ""}
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">
                {subscriptionOrder?.subscriptionContract?.note || ""}
              </p>
            </div>
          </div>
        </div>
      )}

      <OrderDetailProductTable
        customerPartnerNumber={{
          customerPartnerNumberDetails: [],
        }}
        lineItem={lineItem || []}
        hideCustomerProduct={isB2B === "false"}
      />

      <div className="pt-5">
        <DeliveryHistoryList id={_.toNumber(id)} />
      </div>
    </div>
  );
}
