import { useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractIdFromGid } from "~/lib/utils";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { useShopifyInformation } from "~/lib/shopify";
import CustomEye from "~/components/icons/CustomEye";
import { Button } from "~/components/ui/button";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import { SubscriptionOrderListItem } from "~/types/subscription-contracts/subscription-orders-list.schema";
export function DeliveryHistoryListCard({
  data,
  isLoading,
}: {
  data: SubscriptionOrderListItem[];
  isLoading?: boolean;
}) {
  const { storeName, companyLocationId } = useShopifyInformation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addLocalePath } = useAddLocalePath();
  const handleViewDetails = (order: SubscriptionOrderListItem) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/order-history/${extractIdFromGid(
          order.shopifyOrderId,
          "Order",
        )}?locationId=${companyLocationId}&routeName=${encodeURIComponent(
          order.orderNumber,
        )}`,
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-8 text-gray-500">
        <p>{t("subscription-orders.delivery-history.list.table.no-data")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-[10px]">
      {data.map((order) => (
        <div
          key={order.id}
          className="bg-secondary-light rounded-lg p-5 shadow-sm cursor-pointer"
        >
          <div className="grid grid-cols-2 gap-4 ">
            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.order-number")}
              </div>
              <div
                className="cursor-pointer text-secondary-foreground font-bold hover:underline text-sm"
                onClick={() => handleViewDetails(order)}
              >
                {order.orderNumber}
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.order-total")}
              </div>
              <div className="break-all w-full text-sm">{order.orderTotal}</div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.status")}
              </div>
              <div className="flex flex-wrap gap-1">
                <CustomStatusBadge
                  status={order?.status || ""}
                  className="w-fit text-sm"
                  type={order?.status === "OPEN" ? "blue" : "gray"}
                />
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.po-number")}
              </div>
              <div className="break-all w-full text-sm">
                {order?.poNumber || "-"}
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold ">
                {t("order-history.list.table.created-by")}
              </div>
              <div className="break-all w-full text-sm">
                <div>{`${order?.createdByName || "-"}`}</div>
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.approved-by")}
              </div>
              <div className="break-all w-full text-sm">
                <div>{`${order?.approvedByName || "-"}`}</div>
              </div>
            </div>

            <div className="flex flex-col gap-y-1">
              <div className="text-gray-900 text-sm font-bold">
                {t("order-history.list.table.ordered-date")}
              </div>
              <div className="break-all w-full text-sm">
                <div>
                  {format(new Date(order?.createdAt || ""), "MM/dd/yyyy")}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end pt-6 pr-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetails(order)}
                className="text-secondary-foreground font-semibold text-xs h-full hover:bg-transparent"
              >
                {t("order-history.list.table.details")}
                <CustomEye strokeWidth={3} className="!w-5 !h-5"></CustomEye>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
