import { ColumnDef } from "@tanstack/react-table";
import { ImageIcon } from "lucide-react";
import { formatPrice, getCustomerPartnerNumberBySku } from "~/lib/utils";
import { CustomerPartnerNumberBySkuType } from "~/types/global";
import { useTranslation } from "react-i18next";
import TableProductItem from "~/components/common/TableProdcutItem";
import React from "react";
import { DataTable } from "~/components/common/DataTable";
import { Row } from "@tanstack/react-table";

type LineItem = {
  id: string;
  variantId: string;
  title: string;
  customerPartnerNumber?: string;
  sku: string;
  quantity: number;
  subtotal: {
    amount: string;
    currencyCode: string;
  };
  image: {
    transformedSrc: string;
    altText: string;
  };
};

interface Props {
  lineItem: LineItem[];
  customerPartnerNumber: CustomerPartnerNumberBySkuType;
  isLoading?: boolean;
  hideCustomerProduct?: boolean;
}

const OrderDetailProductTable = React.memo(
  function OrderDetailProductTable({
    customerPartnerNumber,
    lineItem,
    isLoading = false,
    hideCustomerProduct = false,
  }: Props) {
    const { t } = useTranslation();

    const columns: ColumnDef<LineItem>[] = [
      {
        accessorKey: "customerPartnerNumber",
        header: t("order-history.detail.product-table.customer-product"),
        cell: ({ row }: { row: Row<LineItem> }) => {
          return (
            <div className="text-gray-700">
              {row.original?.customerPartnerNumber ||
                getCustomerPartnerNumberBySku(
                  customerPartnerNumber,
                  row.original?.sku || "",
                ) ||
                "-"}
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: "sku",
        header: t("order-history.detail.product-table.sku"),
      },
      {
        accessorKey: "lineItem",
        header: t("common.text.upper-item"),
        size: 600,
        maxSize: 600,
        cell: ({ row }) => {
          const item = row.original?.image;
          return (
            <TableProductItem
              imageSrc={item?.transformedSrc || ""}
              imageAlt={item?.altText || ""}
              title={row.original?.title || ""}
            />
          );
        },
      },
      {
        accessorKey: "quantity",
        header: t("order-history.detail.product-table.qty"),
        cell: ({ row }) => {
          return (
            <div className="text-gray-700">
              {row.original?.quantity}{" "}
              {row.original?.quantity === 1
                ? t("common.text.upper-item")
                : t("common.text.upper-items")}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: "subtotal",
        header: t("order-history.detail.product-table.subtotal"),
        cell: ({ row }) => {
          return (
            <div className="text-gray-700 font-bold">
              {formatPrice(
                row.original?.subtotal?.amount || "0",
                row.original?.subtotal?.currencyCode || "USD",
              )}
            </div>
          );
        },
        size: 120,
      },
    ];

    if (hideCustomerProduct) {
      columns.shift();
    }

    return (
      <div className="print-avoid-break mb-[38px]">
        <div className="text-gray-700 text-normal font-bold my-5">
          {t("order-history.detail.product-table.title")}
        </div>
        <div className="app-hidden lg:block print-only">
          <DataTable
            columns={columns}
            data={lineItem}
            isLoading={isLoading}
            setRowId={(row) => row.id.toString()}
            selectedRows={[]}
            emptyMessage={t("order-history.detail.product-table.no-products")}
            bodyClassName="py-3"
            rowClassName="text-gray-700"
            rowCellClassName="px-4 py-5"
            headerClassName="bg-secondary-light"
            headerCellClassName="font-bold text-gray-700 px-4"
          />
        </div>

        {/* mobile */}
        <div className="block lg:hidden no-print">
          <div className="flex flex-col gap-[10px]">
            {lineItem.map((item) => (
              <div
                className="border rounded-lg p-4 gap-4 flex items-start justify-between"
                key={item.id}
              >
                <div className="flex gap-3 flex-col flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("order-history.detail.product-table.customer-product")}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {getCustomerPartnerNumberBySku(
                        customerPartnerNumber,
                        item.sku || "",
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("order-history.detail.product-table.sku")}
                    </div>
                    <div className="text-gray-700 text-sm">{item.sku}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("common.text.upper-item")}
                    </div>
                    <div className="text-gray-700 text-sm flex items-center gap-[10px]">
                      <div className="shrink-0 pt-1">
                        <img
                          src={item?.image?.transformedSrc || ""}
                          alt={item?.image?.altText || ""}
                          className="w-[60px] h-[60px] object-cover rounded cursor-pointer border border-gray-200 max-w-fit min-w-[60px]"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (
                              e.currentTarget?.nextSibling as HTMLElement
                            ).style.display = "block";
                          }}
                        />
                        <ImageIcon
                          className="w-[60px] h-[60px] text-gray-400"
                          style={{ display: "none" }}
                        />
                      </div>
                      <div>
                        <div className="font-normal hover:underline line-clamp-3 print-avoid-word-hidden">
                          {item.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("order-history.detail.product-table.qty")}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {item.quantity}{" "}
                      {item.quantity === 1
                        ? t("common.text.upper-item")
                        : t("common.text.upper-items")}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("order-history.detail.product-table.subtotal")}
                    </div>
                    <div className="text-gray-700 text-sm font-bold">
                      {formatPrice(
                        item.subtotal?.amount || "0",
                        item.subtotal?.currencyCode || "USD",
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.customerPartnerNumber === nextProps.customerPartnerNumber &&
      prevProps.lineItem.length === nextProps.lineItem.length &&
      prevProps.lineItem.every(
        (item, index) =>
          item.id === nextProps.lineItem[index].id &&
          item.quantity === nextProps.lineItem[index].quantity &&
          item.subtotal.amount === nextProps.lineItem[index].subtotal.amount &&
          item.sku === nextProps.lineItem[index].sku &&
          item.title === nextProps.lineItem[index].title,
      )
    );
  },
);

export default OrderDetailProductTable;
