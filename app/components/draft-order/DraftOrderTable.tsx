import { TZDate } from "@date-fns/tz";
import { useNavigate } from "@remix-run/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DataTable } from "~/components/common/DataTable";
import { cn, extractIdFromGid, formatPrice } from "~/lib/utils";
import CustomEye from "../icons/CustomEye";
import { Button } from "../ui/button";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import CustomStatusBadge from "../common/CustomStatusBadge";
import { draftOrderStatusConfig } from "~/lib/draft-order";

interface DraftOrder {
  id: string;
  name: string;
  status: string;
  tags: string[];
  poNumber: string;
  updatedAt: string;
  customer?: {
    displayName: string;
  };
  purchasingEntity?: {
    location?: {
      name: string;
    };
  };
  totalPriceSet: {
    presentmentMoney: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface DraftOrderTableProps extends React.HTMLAttributes<HTMLDivElement> {
  draftOrders: DraftOrder[];
  isLoading: boolean;
}

export default function DraftOrderTable2({
  className,
  draftOrders,
  isLoading,
}: DraftOrderTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  const handleView = (order: DraftOrder) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/orders-pending-approval/${extractIdFromGid(order.id, "DraftOrder")}?routeName=${encodeURIComponent(order.name)}`,
      ),
    );
  };

  const renderMobileOrderCard = (order: DraftOrder) => {
    const status = order.tags?.length > 0 ? order.tags[0] : order.status;
    const config = draftOrderStatusConfig[status];
    return (
      <div
        key={order.id}
        className="bg-secondary-light p-5 rounded-lg shadow-sm cursor-pointer"
        onClick={() => handleView(order)}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.draft-order")}
            </div>
            <div className="cursor-pointer hover:underline text-secondary-foreground font-bold text-sm">
              {order.name}
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.po-number")}
            </div>
            <div className="break-all w-full text-sm">
              {order.poNumber ? `${order.poNumber}` : "-"}
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.update-date")}
            </div>
            <div className="break-all w-full text-sm">
              {format(new Date(order.updatedAt), "MM/dd/yyyy")}
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.customer")}
            </div>
            <div className="break-all w-full text-sm">
              {order.customer?.displayName}
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.status")}
            </div>
            <div className="flex gap-1">
              <CustomStatusBadge
                className="w-fit"
                status={config.label}
                type={config.label === "Pending Approval" ? "blue" : "gray"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-1">
            <div className="text-gray-900 text-sm font-bold">
              {t("draft-order.list.table.total")}
            </div>
            <div className="break-all w-full text-sm">
              {formatPrice(
                order.totalPriceSet.presentmentMoney.amount,
                order.totalPriceSet.presentmentMoney.currencyCode,
              )}
            </div>
          </div>

          <div className="col-span-2 flex justify-end pr-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(order)}
              className="text-secondary-foreground font-semibold text-xs"
            >
              {t("draft-order.list.table.details")}
              <CustomEye strokeWidth={3} className="!w-5 !h-5"></CustomEye>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const columns: ColumnDef<DraftOrder>[] = [
    {
      accessorKey: "name",
      header: t("draft-order.list.table.draft-order"),
      cell: ({ row }) => {
        return (
          <div className="cursor-pointer hover:underline text-secondary-foreground font-bold">
            {row.original.name}
          </div>
        );
      },
    },
    {
      accessorKey: "poNumber",
      header: t("draft-order.list.table.po-number"),
      cell: ({ row }) =>
        row.original.poNumber ? `${row.original.poNumber}` : "-",
    },
    {
      accessorKey: "updatedAt",
      header: t("draft-order.list.table.update-date"),
      cell: ({ row }) => format(new Date(row.original.updatedAt), "MM/dd/yyyy"),
    },
    {
      accessorKey: "customer",
      header: t("draft-order.list.table.customer"),
      cell: ({ row }) => {
        return (
          <div>
            <div>{row.original.customer?.displayName}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("draft-order.list.table.status"),
      cell: ({ row }) => {
        const status =
          row.original.tags?.length > 0
            ? row.original.tags[0]
            : row.original.status;
        const config = draftOrderStatusConfig[status];
        return (
          <CustomStatusBadge
            className="w-fit"
            status={config.label}
            type={config.label === "Pending Approval" ? "blue" : "gray"}
          />
        );
      },
      size: 150,
      minSize: 150,
    },
    {
      accessorKey: "totalPriceSet",
      header: t("draft-order.list.table.total"),
      cell: ({ row }) => {
        const price = row.original.totalPriceSet.presentmentMoney;
        return formatPrice(price.amount, price.currencyCode);
      },
      size: 100,
    },
    {
      accessorKey: "action",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="link"
          size="sm"
          className="text-secondary-foreground font-semibold text-xs hover:no-underline"
          onClick={() => handleView(row.original)}
        >
          {t("draft-order.list.table.details")}
          <CustomEye strokeWidth={3} className="!w-5 !h-5"></CustomEye>
        </Button>
      ),
      size: 100,
    },
  ];

  return (
    <div className={cn("mt-5", className)}>
      <div className="app-hidden lg:block">
        <DataTable
          columns={columns}
          data={draftOrders}
          isLoading={isLoading}
          setRowId={(row) => row.id.toString()}
          emptyMessage="No orders pending approval."
          headerClassName="bg-secondary-light"
          headerCellClassName="font-bold text-gray-700"
          rowClassNameFn={(row, index) =>
            index % 2 !== 0
              ? "bg-secondary-light cursor-pointer"
              : "cursor-pointer"
          }
          tableRowOnClick={(row) => handleView(row)}
        />
      </div>

      <div className="lg:hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : draftOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t("draft-order.list.table.no-orders-pending-approval")}
          </div>
        ) : (
          <div className="space-y-[10px]">
            {draftOrders.map(renderMobileOrderCard)}
          </div>
        )}
      </div>
    </div>
  );
}
