import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/components/ui/table";
import { Ellipsis, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import TableProductItem from "~/components/common/TableProdcutItem";
import { ScrollArea } from "~/components/ui/scroll-area";
import _ from "lodash";
import { useGetSubscriptionOrderById } from "~/hooks/use-subscription-orders";
import { useShopifyInformation } from "~/lib/shopify";
import { cn, extractShopifyId, formatPrice } from "~/lib/utils";
import { SubscriptionContractStatusType } from "~/types/subscription-contracts/subscription-contract.schema";
import {
  computedSubscriptionOrderTotal,
  shouldShowSubscriptionButton,
} from "~/lib/subscription-orders";
import Decimal from "decimal.js";
import { GetSubscriptionContractByIdResponse } from "~/types/subscription-contracts/subscription-contract-get-by-id.schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

interface SubscriptionOrderTableExpandProps {
  subscriptionOrderId: number;
  onViewDetails: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSkipDelivery: (id: number) => void;
}
interface SubscriptionOrderTableExpandButtonGroupsProps
  extends SubscriptionOrderTableExpandProps {
  status: SubscriptionContractStatusType;
  customerId: string;
}

const GridItem = ({
  title,
  value,
  className,
  titleClassName,
  valueClassName,
}: {
  title: string;
  value: string;
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
}) => {
  return (
    <div
      className={cn(
        "break-words flex flex-col gap-1 text-xs text-gray-700 flex-1",
        className,
      )}
    >
      <div className={cn("font-bold", titleClassName)}>{title}</div>
      <div className={cn("", valueClassName)}>{value || "-"}</div>
    </div>
  );
};
const HeaderButtonGroups = ({
  subscriptionOrderId,
  onViewDetails,
  onEdit,
  onDelete,
  onSkipDelivery,
  status,
  customerId,
}: SubscriptionOrderTableExpandButtonGroupsProps) => {
  const { t } = useTranslation();
  const { customerId: shopifyCustomerId } = useShopifyInformation();
  const shouldShowEditButton = shouldShowSubscriptionButton(status, [
    "pending",
  ]);
  const shouldShowSkipButton = shouldShowSubscriptionButton(status, ["active"]);
  const shouldShowDeleteButton =
    shopifyCustomerId === extractShopifyId(customerId, "Customer") &&
    shouldShowSubscriptionButton(status, ["pending"]);
  return (
    <>
      <div className="flex gap-6 items-center justify-center app-hidden lg:flex">
        <Button
          variant="link"
          size="sm"
          onClick={() => onViewDetails(subscriptionOrderId)}
          className="text-secondary-foreground font-bold text-sm p-0 gap-2"
        >
          {t("subscription-orders.list.table.expand.actions.details")}
          <Eye strokeWidth={2} className="!w-5 !h-5"></Eye>
        </Button>
        {shouldShowEditButton && (
          <Button
            variant="link"
            size="sm"
            onClick={() => onEdit(subscriptionOrderId)}
            className="text-secondary-foreground font-bold text-sm p-0 gap-2"
          >
            {t("subscription-orders.list.table.expand.actions.edit")}
            <Pencil strokeWidth={2} className="!w-5 !h-5"></Pencil>
          </Button>
        )}
        {shouldShowDeleteButton && (
          <Button
            variant="link"
            size="sm"
            onClick={() => onDelete(subscriptionOrderId)}
            className="text-secondary-foreground font-bold text-sm p-0 gap-2"
          >
            {t("subscription-orders.list.table.expand.actions.delete")}
            <Trash2 strokeWidth={2} className="!w-5 !h-5"></Trash2>
          </Button>
        )}
        {shouldShowSkipButton && (
          <Button
            variant="outline"
            size="sm"
            className="px-[10px] font-bold text-sm h-10"
            onClick={() => onSkipDelivery(subscriptionOrderId)}
          >
            {t("subscription-orders.list.table.expand.actions.skip-delivery")}
          </Button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="lg:hidden w-full flex justify-end">
            <Button variant="ghost" size="icon" className="text-secondary">
              <Ellipsis
                width={20}
                height={20}
                className="!w-5 !h-5 stroke-primary-main"
              />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Button
              variant="link"
              size="sm"
              onClick={() => onViewDetails(subscriptionOrderId)}
              className="text-secondary-foreground font-bold text-sm p-0 gap-2 flex-1"
            >
              {t("subscription-orders.list.table.expand.actions.details")}
              <Eye strokeWidth={2} className="!w-5 !h-5"></Eye>
            </Button>
          </DropdownMenuItem>
          {shouldShowEditButton && (
            <DropdownMenuItem>
              <Button
                variant="link"
                size="sm"
                onClick={() => onEdit(subscriptionOrderId)}
                className="text-secondary-foreground font-bold text-sm p-0 gap-2 flex-1"
              >
                {t("subscription-orders.list.table.expand.actions.edit")}
                <Pencil strokeWidth={2} className="!w-5 !h-5"></Pencil>
              </Button>
            </DropdownMenuItem>
          )}
          {shouldShowDeleteButton && (
            <DropdownMenuItem>
              <Button
                variant="link"
                size="sm"
                onClick={() => onDelete(subscriptionOrderId)}
                className="text-secondary-foreground font-bold text-sm p-0 gap-2 flex-1"
              >
                {t("subscription-orders.list.table.expand.actions.delete")}
                <Trash2 strokeWidth={2} className="!w-5 !h-5"></Trash2>
              </Button>
            </DropdownMenuItem>
          )}
          {shouldShowSkipButton && (
            <DropdownMenuItem>
              <Button
                variant="link"
                size="sm"
                onClick={() => onSkipDelivery(subscriptionOrderId)}
                className="text-secondary-foreground font-bold text-sm p-0 gap-2 flex-1"
              >
                {t(
                  "subscription-orders.list.table.expand.actions.skip-delivery",
                )}
              </Button>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const ProductsTable = ({
  products,
  data,
}: {
  products: GetSubscriptionContractByIdResponse["subscriptionContract"]["lines"];
  data: GetSubscriptionContractByIdResponse["subscriptionContract"];
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="rounded-lg border border-gray-100 bg-white app-hidden lg:block">
        <Table>
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-80">
            <TableHeader className="bg-secondary-light sticky top-0">
              <TableRow>
                <TableHead className="w-[156px] pl-6 text-sm font-bold text-gray-700">
                  {t(
                    "subscription-orders.list.table.expand.table.customer-product",
                  )}
                </TableHead>
                <TableHead className="w-[156px] pl-6 text-sm font-bold text-gray-700">
                  {t("subscription-orders.list.table.expand.table.sku")}
                </TableHead>
                <TableHead className="text-sm font-bold text-gray-700 w-96">
                  {t("subscription-orders.list.table.expand.table.item")}
                </TableHead>
                <TableHead className="text-sm font-bold text-gray-700">
                  {t("subscription-orders.list.table.expand.table.qty")}
                </TableHead>
                <TableHead className="text-sm font-bold text-gray-700">
                  {t("subscription-orders.list.table.expand.table.subtotal")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products || []).map((item) => (
                <TableRow className="border-gray-100" key={item.variant?.id}>
                  <TableCell className="pl-6">
                    {item.variant?.customerPartnerNumber || "-"}
                  </TableCell>
                  <TableCell className="pl-6">
                    {item.variant?.sku || "-"}
                  </TableCell>
                  <TableCell>
                    <TableProductItem
                      imageSrc={item.image?.[0]?.url || ""}
                      imageAlt={item.image?.[0]?.altText || ""}
                      title={item.title || "-"}
                      imageWidth={40}
                      imageHeight={40}
                    />
                  </TableCell>
                  <TableCell>{item.variant?.quantity || 0}</TableCell>
                  <TableCell className="font-bold">
                    {formatPrice(
                      Decimal.mul(
                        item.variant?.price || 0,
                        item.variant?.quantity || 0,
                      ).toNumber(),
                      data?.currencyCode || "",
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollArea>
        </Table>
      </div>

      {/* mobile */}
      <div className="block lg:hidden no-print">
        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-96">
          <div className="flex flex-col gap-[10px] ">
            {(products || []).map((item) => (
              <div
                className="border rounded-lg p-4 gap-4 flex items-start justify-between  bg-white"
                key={item.id}
              >
                <div className="flex gap-3 flex-col flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(
                        "subscription-orders.list.table.expand.table.customer-product",
                      )}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {item.variant?.customerPartnerNumber || "-"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("subscription-orders.list.table.expand.table.sku")}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {item.variant?.sku || "-"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("subscription-orders.list.table.expand.table.item")}
                    </div>
                    <div className="text-gray-700 text-sm flex items-center gap-[10px]">
                      <TableProductItem
                        imageSrc={item.image?.[0]?.url || ""}
                        imageAlt={item.image?.[0]?.altText || ""}
                        title={item.title || "-"}
                        imageWidth={40}
                        imageHeight={40}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t("subscription-orders.list.table.expand.table.qty")}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {item.variant?.quantity || 0}{" "}
                      {item.variant?.quantity === 1
                        ? t("common.text.upper-item")
                        : t("common.text.upper-items")}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(
                        "subscription-orders.list.table.expand.table.subtotal",
                      )}
                    </div>
                    <div className="text-gray-700 text-sm font-bold">
                      {formatPrice(
                        Decimal.mul(
                          item.variant?.price || 0,
                          item.variant?.quantity || 0,
                        ).toNumber(),
                        data?.currencyCode || "",
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default function SubscriptionOrderTableExpand({
  subscriptionOrderId,
  onViewDetails,
  onEdit,
  onDelete,
  onSkipDelivery,
}: SubscriptionOrderTableExpandProps) {
  const { t } = useTranslation();
  const { storeName, shopifyCustomerId } = useShopifyInformation();
  const { data: subscriptionOrder, isLoading: isLoadingSubscriptionOrder } =
    useGetSubscriptionOrderById({
      id: _.toNumber(subscriptionOrderId),
      storeName: storeName,
      customerId: shopifyCustomerId,
    });

  const handleViewDetails = (id: number) => {
    onViewDetails(id);
  };
  const handleEdit = (id: number) => {
    onEdit(id);
  };
  const handleDelete = (id: number) => {
    onDelete(id);
  };
  const handleSkipDelivery = (id: number) => {
    onSkipDelivery(id);
  };

  const data = subscriptionOrder?.subscriptionContract;

  const products = data?.lines;

  // products total + shipping cost
  const { total: orderTotal } = computedSubscriptionOrderTotal(
    products || [],
    data?.shippingCost || 0,
  );

  if (!data && !isLoadingSubscriptionOrder) {
    return (
      <div className="p-5 bg-gray-50 shadow-inset flex flex-col gap-5">
        <div className="flex gap-6 items-center justify-center bg-white px-4 py-[10px] rounded-lg">
          {t("subscription-orders.list.table.expand.no-data")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-50 shadow-inset flex flex-col gap-5">
      {/* header information grid */}
      {isLoadingSubscriptionOrder ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:flex gap-6 justify-between bg-white px-4 py-[10px] rounded-lg">
            <GridItem
              title={t(
                "subscription-orders.list.table.expand.delivery-order-date",
              )}
              value={
                data?.nextOrderDate
                  ? format(new Date(data?.nextOrderDate), "MM/dd/yyyy")
                  : "-"
              }
            />

            <GridItem
              title={t(
                "subscription-orders.list.table.expand.total-delivery-items",
              )}
              value={`${products?.length || 0}`}
            />
            <GridItem
              title={t("subscription-orders.list.table.expand.order-total")}
              value={formatPrice(orderTotal || 0, data?.currencyCode || "")}
            />
            <HeaderButtonGroups
              subscriptionOrderId={subscriptionOrderId}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSkipDelivery={handleSkipDelivery}
              status={data?.status as SubscriptionContractStatusType}
              customerId={data?.customer?.id || ""}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="font-bold text-gray-700 text-base">
              {t("subscription-orders.list.table.expand.table.title")}
            </div>
            <ProductsTable
              products={products || []}
              data={
                data as GetSubscriptionContractByIdResponse["subscriptionContract"]
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
