import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Loader2, X } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ProductNameField,
  QuantityField,
  UomField,
  PriceField,
} from "./QuickOrderFields";
import type { UseFormReturn } from "react-hook-form";
import type {
  QuickOrderFormSchema,
  QuickOrderTableType,
} from "~/types/quick-order";
import { useTranslation } from "react-i18next";
export interface QuickOrderTableProps {
  form: UseFormReturn<QuickOrderFormSchema>;
  selectProduct: (
    product: QuickOrderFormSchema["productLines"][string]["product"],
    lineId: string,
  ) => void;
  removeLine: (id: string) => void;
  type?: QuickOrderTableType;
  isLoading?: boolean;
  companyLocationId?: string;
  onTargetPriceChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    lineId: string,
  ) => void;
  onTargetPriceFocus?: (
    e: React.FocusEvent<HTMLInputElement>,
    lineId: string,
  ) => void;
  onTargetPriceBlur?: (
    e: React.FocusEvent<HTMLInputElement>,
    lineId: string,
  ) => void;
  disableTableAction?: boolean;
}

export const QuickOrderTableTextConfig = () => {
  const { t } = useTranslation();
  const i18nPrefixQuickOrder = "quick-order.table";
  const i18nPrefixRequestForQuote = "request-for-quote.create.table";
  const i18nPrefixSubscriptionOrder = "subscription-orders.create.form.table";

  const textConfig = {
    normal: {
      product: t(`${i18nPrefixQuickOrder}.product`),
      qty: t(`${i18nPrefixQuickOrder}.qty`),
      uom: t(`${i18nPrefixQuickOrder}.uom`),
      listedPrice: t(`${i18nPrefixQuickOrder}.price`),
    },
    withTargetPrice: {
      product: t(`${i18nPrefixQuickOrder}.product`),
      qty: t(`${i18nPrefixQuickOrder}.qty`),
      uom: t(`${i18nPrefixQuickOrder}.uom`),
      listedPrice: t(`${i18nPrefixRequestForQuote}.listed-price`),
      targetPrice: t(`${i18nPrefixRequestForQuote}.target-price`),
    },
    withDiscount: {
      product: t(`${i18nPrefixQuickOrder}.product`),
      qty: t(`${i18nPrefixQuickOrder}.qty`),
      uom: t(`${i18nPrefixQuickOrder}.uom`),
      listedPrice: t(`${i18nPrefixRequestForQuote}.listed-price`),
      discountPrice: t(`${i18nPrefixSubscriptionOrder}.target.discount`),
    },
  };

  return textConfig;
};

export function QuickOrderTable({
  form,
  selectProduct,
  removeLine,
  type = "normal",
  isLoading = false,
  companyLocationId,
  onTargetPriceChange,
  onTargetPriceFocus,
  onTargetPriceBlur,
  disableTableAction = false,
}: QuickOrderTableProps) {
  const textConfig = QuickOrderTableTextConfig();

  let baseColSpan = 5;

  if (type === "withTargetPrice" || type === "withDiscount") {
    baseColSpan = 6;
  }

  const widthConfig = {
    normal: {
      product: "w-[55%]",
      qty: "w-[15%]",
      uom: "w-[15%]",
      listedPrice: "w-[15%]",
      targetPrice: "w-[15%]",
    },
    withTargetPrice: {
      product: "w-[55%]",
      qty: "w-[10%]",
      uom: "w-[10%]",
      listedPrice: "w-[12%]",
      targetPrice: "w-[12%]",
      discountPrice: "w-[12%]",
    },
    withDiscount: {
      product: "w-[55%]",
      qty: "w-[10%]",
      uom: "w-[10%]",
      listedPrice: "w-[12%]",
      discountPrice: "w-[12%]",
    },
  };

  return (
    <Table className="app-hidden lg:block">
      <TableHeader>
        <TableRow>
          <TableHead
            className={cn(
              widthConfig[type].product,
              "text-gray-700 font-semibold px-[10px]",
            )}
          >
            {textConfig[type].product}
          </TableHead>
          <TableHead
            className={cn(
              widthConfig[type].qty,
              "text-gray-700 font-semibold px-[10px]",
            )}
          >
            {textConfig[type].qty}
          </TableHead>
          <TableHead
            className={cn(
              widthConfig[type].uom,
              "text-gray-700 font-semibold px-[10px]",
            )}
          >
            {textConfig[type].uom}
          </TableHead>
          {/* Target Price */}
          {type === "withTargetPrice" && (
            <TableHead
              className={cn(
                widthConfig[type].targetPrice,
                "text-gray-700 font-semibold px-[10px]",
              )}
            >
              {textConfig[type].targetPrice}
            </TableHead>
          )}
          {/* Listed Price */}
          <TableHead
            className={cn(
              widthConfig[type]?.listedPrice,
              "text-gray-700 font-semibold px-[10px]",
            )}
          >
            {textConfig[type].listedPrice}
          </TableHead>
          {/* Discount */}
          {type === "withDiscount" && (
            <TableHead
              className={cn(
                widthConfig[type].discountPrice,
                "text-gray-700 font-semibold px-[10px]",
              )}
            >
              {textConfig[type].discountPrice}
            </TableHead>
          )}
          {/* Action */}
          <TableHead className="w-[5%] text-gray-700 font-semibold px-[10px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={baseColSpan} className="text-center w-full">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </TableCell>
          </TableRow>
        ) : (
          <>
            {Object.entries(form.watch("productLines") || {}).map(
              ([lineId, line], index) => (
                <TableRow
                  key={lineId}
                  className={cn(index % 2 === 0 && "bg-gray-50")}
                >
                  <TableCell className="p-[10px]">
                    <ProductNameField
                      form={form}
                      control={form.control}
                      lineId={lineId}
                      onSelect={selectProduct}
                      line={line}
                      companyLocationId={companyLocationId}
                      disableTableAction={disableTableAction}
                    />
                  </TableCell>
                  <TableCell className="p-[10px]">
                    <QuantityField
                      form={form}
                      control={form.control}
                      lineId={lineId}
                      line={line}
                    />
                  </TableCell>
                  <TableCell className="p-[10px]">
                    <UomField
                      form={form}
                      control={form.control}
                      lineId={lineId}
                      line={line}
                    />
                  </TableCell>
                  {type === "withTargetPrice" && (
                    <TableCell className="p-[10px]">
                      <PriceField
                        line={line}
                        type="edit"
                        control={form.control}
                        lineId={lineId}
                        form={form}
                        name="targetPrice"
                        onFocus={onTargetPriceFocus}
                        onBlur={onTargetPriceBlur}
                        onChange={onTargetPriceChange}
                      />
                    </TableCell>
                  )}
                  <TableCell className="p-[10px]">
                    <PriceField
                      line={line}
                      type="view"
                      control={form.control}
                      lineId={lineId}
                      form={form}
                      valueClassName={cn(
                        type === "withDiscount" ? "line-through" : "",
                      )}
                    />
                  </TableCell>
                  {type === "withDiscount" && (
                    <TableCell className="p-[10px]">
                      <PriceField
                        line={line}
                        type="view"
                        control={form.control}
                        lineId={lineId}
                        form={form}
                      />
                    </TableCell>
                  )}

                  <TableCell className="p-[10px]">
                    {!disableTableAction && (
                      <Button
                        variant={null}
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => removeLine(lineId)}
                      >
                        <X
                          className="!w-[18px] !h-[18px]"
                          strokeWidth={4}
                          stroke="hsl(var(--gray-300))"
                        />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ),
            )}
          </>
        )}
      </TableBody>
    </Table>
  );
}
