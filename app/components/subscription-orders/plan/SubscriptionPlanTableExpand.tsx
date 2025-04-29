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
import { ScrollArea } from "~/components/ui/scroll-area";
import TableProductItem from "~/components/common/TableProdcutItem";
import { formatPrice, getCustomerPartnerNumberBySku } from "~/lib/utils";
import { SubscriptionPlanFrequencyUnit } from "~/types/subscription-plan.types";
import {
  formatSubscriptionFrequencyText,
  formatSubscriptionPlanDiscountValue,
  SubscriptionPlanDiscountTypeMap,
} from "~/lib/subscription-plan";
import _ from "lodash";
import { useGetSubscriptionPlanById } from "~/hooks/use-subscription-plan";
import { useShopifyInformation } from "~/lib/shopify";
import { Loader2 } from "lucide-react";
import { SellingPlanWithLines } from "~/types/selling-plans/selling-plan.schema";
import { useCustomerPartnerNumberBySku } from "~/hooks/use-product-search";
import { CustomerPartnerNumberBySkuType } from "~/types/global";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { useNavigate } from "@remix-run/react";

const ProductsTable = ({
  products,
  currencyCode,
  customerPartnerNumberBySku,
  isLoadingCustomerPartnerNumberBySku,
}: {
  products: SellingPlanWithLines["lines"];
  customerPartnerNumberBySku: CustomerPartnerNumberBySkuType;
  currencyCode: string;
  isLoadingCustomerPartnerNumberBySku?: boolean;
}) => {
  const { t } = useTranslation();
  const i18nPrefix = "subscription-orders.choose-plan.list.expand.products";
  return (
    <>
      <div className="rounded-lg border border-gray-100 bg-white app-hidden lg:block">
        <Table>
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-56">
            <TableHeader className="bg-secondary-light sticky top-0">
              <TableRow>
                <TableHead className="w-[156px] pl-6 text-sm font-bold text-gray-700">
                  {t(`${i18nPrefix}.table.customer-product`)}
                </TableHead>
                <TableHead className="w-[156px] pl-6 text-sm font-bold text-gray-700">
                  {t(`${i18nPrefix}.table.sku`)}
                </TableHead>
                <TableHead className="text-sm font-bold text-gray-700 w-[480px]">
                  {t(`${i18nPrefix}.table.item`)}
                </TableHead>

                <TableHead className="text-sm font-bold text-gray-700">
                  {t(`${i18nPrefix}.table.original-price`)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(products || []).map((item) => (
                <TableRow
                  className="border-gray-100"
                  key={item?.variant?.id || _.uniqueId()}
                >
                  <TableCell className="pl-6">
                    {isLoadingCustomerPartnerNumberBySku ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      item?.variant?.customerPartnerNumber ||
                      getCustomerPartnerNumberBySku(
                        customerPartnerNumberBySku,
                        item?.variant?.sku || "",
                      )
                    )}
                  </TableCell>
                  <TableCell className="pl-6">
                    {item?.variant?.sku || "-"}
                  </TableCell>
                  <TableCell>
                    <TableProductItem
                      imageSrc={item?.image?.[0]?.url || ""}
                      imageAlt={item?.image?.[0]?.altText || ""}
                      title={item?.title || "-"}
                      imageWidth={40}
                      imageHeight={40}
                    />
                  </TableCell>
                  <TableCell>
                    {formatPrice(item?.variant?.price || 0, currencyCode)}
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
                      {t(`${i18nPrefix}.table.customer-product`)}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {isLoadingCustomerPartnerNumberBySku ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        item?.variant?.customerPartnerNumber ||
                        getCustomerPartnerNumberBySku(
                          customerPartnerNumberBySku,
                          item?.variant?.sku || "",
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(`${i18nPrefix}.table.sku`)}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {item.variant?.sku || "-"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(`${i18nPrefix}.table.item`)}
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
                      {t(`${i18nPrefix}.table.original-price`)}
                    </div>
                    <div className="text-gray-700 text-sm">
                      {formatPrice(item?.variant?.price || 0, currencyCode)}
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

const FrequenciesTable = ({
  frequencies,
  onApply,
  currencyCode,
}: {
  frequencies: SellingPlanWithLines["deliveryPolicies"];
  currencyCode: string;
  onApply: (frequencyId: string) => void;
}) => {
  const { t } = useTranslation();
  const i18nPrefix = "subscription-orders.choose-plan.list.expand.frequencies";
  return (
    <>
      <div className="rounded-lg border border-gray-100 bg-white app-hidden lg:block">
        <Table>
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-56">
            <TableHeader className="bg-secondary-light sticky top-0">
              <TableRow>
                <TableHead className=" pl-6 text-sm font-bold text-gray-700">
                  {t(`${i18nPrefix}.table.frequency`)}
                </TableHead>
                <TableHead className=" pl-6 text-sm font-bold text-gray-700">
                  {t(`${i18nPrefix}.table.discount`)}
                </TableHead>
                <TableCell className="text-sm font-bold text-text-color align-top"></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(frequencies || []).map((item) => (
                <TableRow className="border-gray-100" key={item.id}>
                  <TableCell className="pl-6">
                    {formatSubscriptionFrequencyText(
                      [
                        {
                          interval: _.toString(item.intervalValue),
                          unit: item.intervalUnit as SubscriptionPlanFrequencyUnit,
                        },
                      ],
                      t,
                    )}
                  </TableCell>
                  <TableCell className="pl-6">
                    {formatSubscriptionPlanDiscountValue({
                      offerDiscount: item.offerDiscount,
                      discountValue: item.discountValue || 0,
                      discountType:
                        SubscriptionPlanDiscountTypeMap[
                          item?.discountType || "percentage"
                        ],
                      currencyCode,
                      t,
                    })}
                  </TableCell>
                  <TableCell align="right" className="pr-6">
                    <Button onClick={() => onApply(_.toString(item.id))}>
                      {t("subscription-orders.choose-plan.action.apply")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollArea>
        </Table>
      </div>

      {/* mobile */}
      <div className="block lg:hidden no-print">
        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-80">
          <div className="flex flex-col gap-[10px] ">
            {(frequencies || []).map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 gap-4 flex items-start justify-between  bg-white"
              >
                <div className="flex gap-3 flex-col flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(`${i18nPrefix}.table.frequency`)}
                    </div>
                    {formatSubscriptionFrequencyText(
                      [
                        {
                          interval: _.toString(item.intervalValue),
                          unit: item.intervalUnit as SubscriptionPlanFrequencyUnit,
                        },
                      ],
                      t,
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-gray-700 font-bold text-sm">
                      {t(`${i18nPrefix}.table.discount`)}
                    </div>
                    {formatSubscriptionPlanDiscountValue({
                      offerDiscount: item.offerDiscount,
                      discountValue: item.discountValue || 0,
                      discountType:
                        SubscriptionPlanDiscountTypeMap[
                          item?.discountType || "percentage"
                        ],
                      currencyCode,
                      t,
                    })}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button onClick={() => onApply(_.toString(item.id))}>
                      {t("subscription-orders.choose-plan.action.apply")}
                    </Button>
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

export default function SubscriptionPlanTableExpand({
  subscriptionPlanId,
}: {
  subscriptionPlanId: string;
}) {
  const { t } = useTranslation();
  const { storeName, shopifyCompanyId } = useShopifyInformation();
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  const { data: subscriptionPlanData, isLoading: isSubscriptionPlanLoading } =
    useGetSubscriptionPlanById({
      id: _.toNumber(subscriptionPlanId),
      storeName: storeName,
    });
  const {
    data: customerPartnerNumberBySku,
    isLoading: isLoadingCustomerPartnerNumberBySku,
  } = useCustomerPartnerNumberBySku({
    storeName,
    companyId: shopifyCompanyId,
    skuIds:
      subscriptionPlanData?.lines.map((item: any) => item?.variant?.sku) ?? [],
  });

  const handleApply = (frequencyId: string) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/subscription-orders/create-subscription?subscriptionPlanId=${subscriptionPlanId}&frequencyId=${frequencyId}`,
      ),
    );
  };

  if (!subscriptionPlanData && !isSubscriptionPlanLoading) {
    return (
      <div className="p-5 bg-gray-50 shadow-inset flex flex-col gap-5">
        <div className="flex gap-6 items-center justify-center bg-white px-4 py-[10px] rounded-lg">
          {t("subscription-orders.choose-plan.list.expand.no-data")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-50 shadow-inset flex flex-col gap-5">
      {isSubscriptionPlanLoading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Frequencies */}
          <div className="text-gray-700 text-normal font-bold">
            {t("subscription-orders.choose-plan.list.expand.frequencies.title")}
          </div>
          <FrequenciesTable
            frequencies={subscriptionPlanData?.deliveryPolicies || []}
            currencyCode={subscriptionPlanData?.currencyCode || "USD"}
            onApply={handleApply}
          />
          {/* Products */}
          <div className="text-gray-700 text-normal font-bold">
            {t("subscription-orders.choose-plan.list.expand.products.title")}
          </div>
          <ProductsTable
            products={subscriptionPlanData?.lines || []}
            currencyCode={subscriptionPlanData?.currencyCode || "USD"}
            customerPartnerNumberBySku={customerPartnerNumberBySku}
            isLoadingCustomerPartnerNumberBySku={
              isLoadingCustomerPartnerNumberBySku
            }
          />
        </>
      )}
    </div>
  );
}
