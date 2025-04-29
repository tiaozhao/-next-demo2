import { Fragment, useState } from "react";
import { Button } from "~/components/ui/button";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "~/components/ui/table";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn, formatPrice } from "~/lib/utils";
import SubscriptionOrderTableExpand from "./SubscriptionOrderTableExpand";
import { FetchSubscriptionContractsResponse } from "~/types/subscription-contracts/subscription-contract.schema";
import { format } from "date-fns";
import { useNavigate } from "@remix-run/react";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { formatSubscriptionListFrequency } from "~/lib/subscription-orders";
import { SubsciptionOrdersListConfirmDialog } from "./SubsciptionOrdersListConfirmDialog";
import {
  useDeleteSubscriptionOrder,
  useSkipSubscriptionOrderDelivery,
} from "~/hooks/use-subscription-orders";
import _ from "lodash";
import { useShopifyInformation } from "~/lib/shopify";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  QUERY_ALL_SUBSCRIPTION_ORDERS,
  QUERY_SUBSCRIPTION_ORDER_BY_ID,
} from "~/constant/react-query-keys";

interface SubscriptionOrdersTableProps {
  data: FetchSubscriptionContractsResponse["data"];
  isLoading: boolean;
}

interface MoblieCardProps extends SubscriptionOrdersTableProps {
  handleViewDetails: (id: number) => void;
  handleToggleDetails: (id: number) => void;
  handleEdit: (id: number) => void;
  handleDelete: (id: number) => void;
  handleSkipDelivery: (id: number) => void;
  expandedRow: number | null;
}

const MoblieCard = ({
  data,
  isLoading,
  handleViewDetails,
  handleToggleDetails,
  handleEdit,
  handleDelete,
  handleSkipDelivery,
  expandedRow,
}: MoblieCardProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full lg:hidden">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-8 text-gray-500 lg:hidden">
        <p>{t("subscription-orders.list.table.no-data")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-[10px] lg:hidden">
      {data.map((order) => (
        <div
          key={order.id}
          className="bg-secondary-light rounded-lg p-5 shadow-sm cursor-pointer"
        >
          <div className="grid grid-cols-2 gap-4 ">
            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t("subscription-orders.list.table.order-number")}
              </div>
              <div
                className="cursor-pointer text-secondary-foreground font-bold hover:underline text-sm"
                onClick={() => handleViewDetails(order.id)}
              >
                #{order.id}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t("subscription-orders.list.table.order-name")}
              </div>
              <div className="break-words w-full text-sm">{order.name}</div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t("subscription-orders.list.table.status")}
              </div>
              <div className="break-words w-full text-sm">
                <CustomStatusBadge
                  status={order.status}
                  className="w-fit"
                  type={
                    order.status === "active" || order.status === "pending"
                      ? "secondary-blue"
                      : "gray"
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t("subscription-orders.list.table.order-total")}
              </div>
              <div className="flex flex-wrap gap-1">
                {formatPrice(order.orderTotal || 0, order.currencyCode || "")}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t("subscription-orders.list.table.frequency")}
              </div>
              <div className="break-words w-full text-sm">
                {formatSubscriptionListFrequency(
                  order?.intervalUnit || "",
                  order?.intervalValue || 0,
                  t,
                )}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold ">
                {t("subscription-orders.list.table.next-delivery-date")}
              </div>
              <div className="break-words w-full text-sm">
                {format(order.nextOrderCreationDate, "MM/dd/yyyy")}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold ">
                {t("subscription-orders.list.table.approved-by")}
              </div>
              <div className="break-words w-full text-sm">
                {order?.approvedByName || "-"}
              </div>
            </div>

            <div className="flex justify-end col-span-1 pr-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleDetails(order.id)}
                className="text-secondary-foreground font-semibold text-xs hover:bg-transparent"
              >
                {t("subscription-orders.list.table.details")}
                {expandedRow === order.id ? (
                  <ChevronUp className="!w-5 !h-5" strokeWidth={3} />
                ) : (
                  <ChevronDown className="!w-5 !h-5" strokeWidth={3} />
                )}
              </Button>
            </div>

            {expandedRow === order.id && (
              <div className="col-span-2">
                <SubscriptionOrderTableExpand
                  subscriptionOrderId={order.id}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSkipDelivery={handleSkipDelivery}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function SubscriptionOrdersTable({
  data,
  isLoading,
}: SubscriptionOrdersTableProps) {
  const { t } = useTranslation();

  const { shopifyCompanyLocationId, shopifyCustomerId, storeName } =
    useShopifyInformation();

  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleToggleDetails = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  const queryClient = useQueryClient();
  const resetQuery = (id?: number) => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_ALL_SUBSCRIPTION_ORDERS],
    });
    if (id) {
      queryClient.invalidateQueries({
        queryKey: [QUERY_SUBSCRIPTION_ORDER_BY_ID, { id }],
      });
    }
  };

  const handleViewDetails = (id: number) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/subscription-orders/${id}?routeName=${encodeURIComponent(
          `#${id}`,
        )}`,
      ),
    );
  };

  const handleEdit = (id: number) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/subscription-orders/edit-subscription/${id}?routeName=${encodeURIComponent(
          `#${id}`,
        )}`,
      ),
    );
  };

  // skip delivery
  const [showSkipDeliveryDialog, setShowSkipDeliveryDialog] = useState(false);
  const [skipDeliveryId, setSkipDeliveryId] = useState<number | null>(null);

  const {
    mutateAsync: skipSubscriptionOrderDelivery,
    isPending: isSkippingDelivery,
  } = useSkipSubscriptionOrderDelivery();

  const handleSkipDelivery = (id: number) => {
    setSkipDeliveryId(id);
    setShowSkipDeliveryDialog(true);
  };

  const handleConfirmSkipDelivery = () => {
    if (!skipDeliveryId) {
      console.error("skip delivery id is not found");
      toast.error(
        t("subscription-orders.common-actions.skip-delivery.toast.error"),
      );
      return;
    }
    skipSubscriptionOrderDelivery({
      subscriptionContractId: _.toNumber(skipDeliveryId),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t(
                "subscription-orders.common-actions.skip-delivery.toast.success",
              ),
          );
          setShowSkipDeliveryDialog(false);
          resetQuery(skipDeliveryId);
        } else {
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.skip-delivery.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("skip delivery error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.skip-delivery.toast.error"),
        );
      });
  };
  // delete subscription order
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    mutateAsync: deleteSubscriptionOrder,
    isPending: isDeletingSubscriptionOrder,
  } = useDeleteSubscriptionOrder();

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };
  const handleConfirmDelete = () => {
    if (!deleteId) {
      console.error("delete id is not found");
      toast.error(t("subscription-orders.common-actions.delete.toast.error"));
      return;
    }

    deleteSubscriptionOrder({
      subscriptionContractId: _.toNumber(deleteId),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.delete.toast.success"),
          );
          setShowDeleteDialog(false);
          resetQuery();
        } else {
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.delete.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("delete subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.delete.toast.error"),
        );
      });
  };

  return (
    <div className="rounded-lg lg:border border-border">
      <Table className="app-hidden lg:table">
        <TableHeader className="bg-secondary-light">
          <TableRow className="border-border">
            <TableCell className="text-sm font-bold text-text-color align-top pl-4">
              {t("subscription-orders.list.table.order-number")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top w-40">
              {t("subscription-orders.list.table.order-name")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top">
              {t("subscription-orders.list.table.status")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top">
              {t("subscription-orders.list.table.order-total")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top">
              {t("subscription-orders.list.table.frequency")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top">
              {t("subscription-orders.list.table.next-delivery-date")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top">
              {t("subscription-orders.list.table.approved-by")}
            </TableCell>
            <TableCell className="text-sm font-bold text-text-color align-top"></TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              </TableCell>
            </TableRow>
          ) : data?.length > 0 ? (
            data.map((order, index) => (
              <Fragment key={order.id}>
                <TableRow
                  key={order.id}
                  className={cn(
                    "border-border",
                    index % 2 !== 0 ? "bg-secondary-light" : "",
                  )}
                >
                  <TableCell className="pl-4">
                    <div
                      onClick={() => handleViewDetails(order.id)}
                      className="cursor-pointer hover:underline text-secondary-foreground font-bold"
                    >
                      #{order.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-1">{order.name}</div>
                  </TableCell>
                  <TableCell>
                    <CustomStatusBadge
                      status={order.status}
                      className="w-fit"
                      type={
                        order.status === "active" || order.status === "pending"
                          ? "secondary-blue"
                          : "gray"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {formatPrice(order.orderTotal || 0, order.currencyCode)}
                  </TableCell>
                  <TableCell>
                    {formatSubscriptionListFrequency(
                      order.intervalUnit,
                      order.intervalValue,
                      t,
                    )}
                  </TableCell>
                  <TableCell>
                    {format(order.nextOrderCreationDate, "MM/dd/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-1">
                      {order.approvedByName || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleDetails(order.id)}
                      className="text-secondary-foreground font-semibold text-[13px] hover:bg-transparent"
                    >
                      {t("subscription-orders.list.table.details")}
                      {expandedRow === order.id ? (
                        <ChevronUp className="!w-5 !h-5" strokeWidth={3} />
                      ) : (
                        <ChevronDown className="!w-5 !h-5" strokeWidth={3} />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRow === order.id && (
                  <TableRow className="border-none">
                    <TableCell colSpan={8} className="p-0">
                      <SubscriptionOrderTableExpand
                        subscriptionOrderId={order.id}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSkipDelivery={handleSkipDelivery}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                {t("subscription-orders.list.table.no-data")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <MoblieCard
        data={data}
        isLoading={isLoading}
        handleViewDetails={handleViewDetails}
        handleToggleDetails={handleToggleDetails}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleSkipDelivery={handleSkipDelivery}
        expandedRow={expandedRow}
      />
      <SubsciptionOrdersListConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        type="delete"
        onOK={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        disabled={isDeletingSubscriptionOrder}
        loading={isDeletingSubscriptionOrder}
      />
      <SubsciptionOrdersListConfirmDialog
        open={showSkipDeliveryDialog}
        onOpenChange={setShowSkipDeliveryDialog}
        type="skip-delivery"
        onOK={handleConfirmSkipDelivery}
        onCancel={() => setShowSkipDeliveryDialog(false)}
        disabled={isSkippingDelivery}
        loading={isSkippingDelivery}
      />
    </div>
  );
}
