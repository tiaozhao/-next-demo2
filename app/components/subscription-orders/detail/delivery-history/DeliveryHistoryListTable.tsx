import { useNavigate } from "@remix-run/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "~/components/common/DataTable";
import { Button } from "~/components/ui/button";
import { extractIdFromGid } from "~/lib/utils";
import CustomEye from "~/components/icons/CustomEye";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { useShopifyInformation } from "~/lib/shopify";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import { SubscriptionOrderListItem } from "~/types/subscription-contracts/subscription-orders-list.schema";

export function DeliveryHistoryListTable({
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

  const columns: ColumnDef<SubscriptionOrderListItem, any>[] = [
    {
      accessorKey: "name",
      header: t("order-history.list.table.order-number"),
      cell: ({ row }) => {
        return (
          <div
            onClick={() => handleViewDetails(row.original)}
            className="cursor-pointer hover:underline text-secondary-foreground font-bold"
          >
            {row.original.orderNumber}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: "total",
      header: t("order-history.list.table.order-total"),
      cell: ({ row }) => {
        const { orderTotal } = row.original;
        return orderTotal;
      },
    },
    {
      accessorKey: "status",
      header: t("order-history.list.table.status"),
      cell: ({ row }) => {
        const { status } = row.original;
        return (
          <CustomStatusBadge
            className="w-fit"
            status={status}
            type={status === "OPEN" ? "blue" : "gray"}
          />
        );
      },
    },
    {
      accessorKey: "poNumber",
      header: t("order-history.list.table.po-number"),
      cell: ({ row }) => {
        return <p>{row.original?.poNumber || "-"}</p>;
      },
    },
    {
      accessorKey: "customer",
      header: t("order-history.list.table.created-by"),
      cell: ({ row }) => {
        const { createdByName } = row.original;
        return (
          <div>
            <div>{`${createdByName || "-"}`}</div>
          </div>
        );
      },
      minSize: 120,
      maxSize: 180,
    },
    {
      accessorKey: "approver",
      header: t("order-history.list.table.approved-by"),
      cell: ({ row }) => {
        const { approvedByName } = row.original;
        return (
          <div>
            <div>{`${approvedByName || "-"}`}</div>
          </div>
        );
      },
      minSize: 120,
      maxSize: 180,
    },
    {
      accessorKey: "orderedDate",
      header: t("order-history.list.table.ordered-date"),
      cell: ({ row }) => {
        return format(new Date(row.original.createdAt), "MM/dd/yyyy");
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original)}
            className="text-secondary-foreground font-semibold text-xs hover:bg-transparent"
          >
            {t("order-history.list.table.details")}
            <CustomEye strokeWidth={3} className="!w-5 !h-5"></CustomEye>
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      setRowId={(row) => row.id.toString()}
      rowClassName="text-text-color"
      rowClassNameFn={(row, index) =>
        index % 2 !== 0 ? "bg-secondary-light" : ""
      }
      headerClassName="bg-secondary-light"
      headerCellClassName="font-bold text-text-color"
      emptyMessage={t(
        "subscription-orders.delivery-history.list.table.no-data",
      )}
    />
  );
}
