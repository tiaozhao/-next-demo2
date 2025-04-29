import { useParams, useSearchParams } from "@remix-run/react";
import { format } from "date-fns";
import { Loader2, ShoppingCartIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DraftOrderDialogs } from "~/components/draft-order/DraftOrderDialogs";
import CustomPrint from "~/components/icons/CustomPrint";
import OrderDetailHeaderV2 from "~/components/order-history/order-detail/OrderDetailHeaderV2";
import OrderDetailInformationCard from "~/components/order-history/order-detail/OrderDetailInformationCard";
import OrderDetailProductTable from "~/components/order-history/order-detail/OrderDetailProductTable";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { PO_LINK_ORDER_HISTORY_METAFIELD_KEY } from "~/constant/order";
import { useAddToCartAjax } from "~/hooks/use-cart";
import { useGetOrderDetail } from "~/hooks/use-order-history";
import { useCustomerPartnerNumberBySku } from "~/hooks/use-product-search";
import { formatOrderInformationOrderByText } from "~/lib/draft-order";
import { useShopifyInformation } from "~/lib/shopify";
import {
  convertToGid,
  extractIdFromGid,
  extractShopifyId,
  handlePrint,
  switchLocationDialog,
} from "~/lib/utils";

export default function OrderHistoryDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get("locationId");
  const {
    storeName,
    shopifyCustomerId,
    shopifyCompanyId,
    companyLocationId,
    isB2B,
  } = useShopifyInformation();
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  const { data: orderData, isLoading } = useGetOrderDetail(
    {
      storeName,
      customerId: shopifyCustomerId,
      orderId: convertToGid(id ?? "", "Order"),
      ...(locationId
        ? {
            companyLocationId: convertToGid(
              locationId ?? "",
              "CompanyLocation",
            ),
          }
        : {}),
    },
    !!id,
  );

  const {
    data: customerPartnerNumberBySku,
    isLoading: isLoadingCustomerPartnerNumberBySku,
  } = useCustomerPartnerNumberBySku({
    storeName,
    companyId: shopifyCompanyId,
    skuIds: orderData?.lineItems.map((item: any) => item.sku) ?? [],
  });

  const { mutateAsync: addToCartAjax, isPending: isReOrdering } =
    useAddToCartAjax();

  if (isLoading || !orderData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!orderData) {
    return <div>{t("order-history.detail.no-order-found")}</div>;
  }

  const goToHomepage = () => {
    switchLocationDialog(setIsLocationDialogOpen);
  };

  const handleReOrder = async () => {
    const orderLocationId = extractShopifyId(
      orderData?.purchasingEntity?.location?.id,
      "CompanyLocation",
    );

    if (orderLocationId !== companyLocationId) {
      setIsLocationDialogOpen(true);
      return;
    }

    await processReOrder();
  };

  const processReOrder = async () => {
    const selectedProducts = orderData.lineItems.filter(
      (product: any) => product.quantity > 0,
    );
    const items = selectedProducts.map((product: any) => ({
      id: Number(extractIdFromGid(product.variant?.id, "ProductVariant")),
      quantity: product.quantity,
    }));

    if (items.length === 0) return;

    addToCartAjax(items)
      .then((res) => {
        if (res?.status === 422) {
          toast.error(
            t("order-history.detail.add-to-cart-error-with-description"),
            {
              description: res?.description,
            },
          );
          return;
        }
        toast.success(
          t("order-history.detail.add-to-cart-success", {
            count: res?.items ? res?.items?.length : "",
          }),
        );
        window.location.href = `https://${storeName}/cart`;
      })
      .catch((error) => {
        console.error("processReOrder ~ error:", error);
        toast.error(
          t("order-history.detail.add-to-cart-error", {
            error: error?.message,
          }),
        );
      });
  };

  const metafields = orderData?.metafields;

  const jsonPoLink = metafields?.find(
    (metafield: any) => metafield.key === PO_LINK_ORDER_HISTORY_METAFIELD_KEY,
  )?.value;
  const poLink = jsonPoLink ? JSON.parse(jsonPoLink) : null;

  return (
    <div className="print-section w-full space-y-4">
      <OrderDetailHeaderV2 />
      <OrderDetailInformationCard
        config={{
          orderNumber: orderData.name,
          companyName: orderData.purchasingEntity?.company?.name,
          contactEmail: orderData.customer?.email,
          paymentTerms: orderData.paymentTerms?.paymentTermsName,
          shipTo: orderData.shippingAddress,
          orderDate: orderData.createdAt,
          billingAddress: orderData.billingAddress,
          shippingMethod: orderData.shippingLine?.title,
          orderedBy: formatOrderInformationOrderByText(
            orderData.customer?.firstName,
            orderData.customer?.lastName,
          ),
          status: orderData.status,
          fulfillmentStatus: orderData.displayFulfillmentStatus,
          financialStatus: orderData.displayFinancialStatus,
          poNumber: orderData.poNumber,
          location: {
            id: orderData?.purchasingEntity?.location?.id,
            name: orderData?.purchasingEntity?.location?.name,
            externalId: orderData?.purchasingEntity?.location?.externalId,
          },
          itemCount: orderData.lineItems.length,
          subtotal: {
            amount: orderData.subtotalPriceSet?.shopMoney?.amount,
            currencyCode: orderData.subtotalPriceSet?.shopMoney?.currencyCode,
          },
          total: {
            amount: orderData.totalPriceSet?.shopMoney?.amount,
            currencyCode: orderData.totalPriceSet?.shopMoney?.currencyCode,
          },
          tax: {
            amount: orderData.totalTaxSet?.shopMoney?.amount,
            currencyCode: orderData.totalTaxSet?.shopMoney?.currencyCode,
          },
          shipping: {
            amount: orderData.totalShippingPriceSet?.shopMoney?.amount,
            currencyCode:
              orderData.totalShippingPriceSet?.shopMoney?.currencyCode,
          },
          poLink: poLink,
        }}
        mobileButtons={
          <div className="no-print flex items-start justify-center lg:hidden">
            <Button
              variant="link"
              onClick={handleReOrder}
              disabled={isReOrdering}
              className="gap-1 p-0 text-sm font-bold text-secondary-foreground"
            >
              {isReOrdering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCartIcon className="!h-6 !w-6 fill-primary-main" />
              )}
              {t("order-history.detail.information-card.buttons.reorder")}
            </Button>
          </div>
        }
        desktopButtons={
          <div className="app-hidden no-print flex-col items-center gap-x-6 self-end md:flex-row lg:flex">
            <Button
              variant="link"
              onClick={handleReOrder}
              disabled={isReOrdering}
              className="no-print gap-1 p-0 text-sm font-bold text-secondary-foreground"
            >
              {isReOrdering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCartIcon className="!h-6 !w-6 fill-primary-main" />
              )}
              {t("order-history.detail.information-card.buttons.reorder")}
            </Button>
            <Separator
              orientation="vertical"
              className="app-hidden h-6 md:block"
            ></Separator>
            <Button
              variant="link"
              onClick={handlePrint}
              className="no-print gap-1 p-0 text-sm font-bold text-secondary-foreground"
            >
              <CustomPrint className="!h-6 !w-6" />
              {t("order-history.detail.information-card.buttons.print")}
            </Button>
          </div>
        }
        hideInvoiceButton={isB2B === "false"}
      />

      <OrderDetailProductTable
        customerPartnerNumber={customerPartnerNumberBySku}
        isLoading={isLoadingCustomerPartnerNumberBySku}
        lineItem={orderData.lineItems.map((item) => ({
          id: item.id,
          variantId: item.variant?.id,
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          subtotal: item.discountedTotalSet?.shopMoney,
          image: item.image,
        }))}
        hideCustomerProduct={isB2B === "false"}
      />

      <div className="print-only app-hidden mt-4 text-xs text-gray-500">
        {t("order-history.detail.printed-on")}:{" "}
        {format(new Date(), "MMMM d, yyyy HH:mm:ss")}
      </div>

      <DraftOrderDialogs
        type="location"
        isOpen={isLocationDialogOpen}
        onClose={() => setIsLocationDialogOpen(false)}
        onConfirm={() => {
          setIsLocationDialogOpen(false);
          processReOrder();
        }}
        locationName={orderData?.purchasingEntity?.location?.name}
        onGoToHomepage={goToHomepage}
      />
    </div>
  );
}
