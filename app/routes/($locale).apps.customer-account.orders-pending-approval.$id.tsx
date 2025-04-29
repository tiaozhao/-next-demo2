import { useNavigate, useParams } from "@remix-run/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import {
  DraftOrderDesktopButtonsSection,
  DraftOrderMobileButtonsSection,
} from "~/components/draft-order/DraftOrderDetailActions";
import { DraftOrderDialogs } from "~/components/draft-order/DraftOrderDialogs";
import OrderDetailHeaderV2 from "~/components/order-history/order-detail/OrderDetailHeaderV2";
import OrderDetailInformationCard from "~/components/order-history/order-detail/OrderDetailInformationCard";
import OrderDetailProductTable from "~/components/order-history/order-detail/OrderDetailProductTable";
import { PO_LINK_DRAFT_ORDER_METAFIELD_KEY } from "~/constant/order";
import {
  QUERY_DRAFT_ORDER_DETAILS,
  QUERY_DRAFT_ORDERS,
  QUERY_ORDER_HISTORY,
} from "~/constant/react-query-keys";
import { useAddToCartAjax } from "~/hooks/use-cart";
import { useCustomerRole } from "~/hooks/use-customer-role";
import {
  useApproveDraftOrder,
  useDeleteDraftOrder,
  useDraftOrderDetail,
  useRejectDraftOrder,
} from "~/hooks/use-draft-order";
import { useCustomerPartnerNumberBySku } from "~/hooks/use-product-search";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import {
  draftOrderStatusConfig,
  formatOrderInformationOrderByText,
} from "~/lib/draft-order";
import { useShopifyInformation } from "~/lib/shopify";
import {
  convertToGid,
  extractIdFromGid,
  extractShopifyId,
  switchLocationDialog,
} from "~/lib/utils";

export default function DraftOrderDetails() {
  const { id } = useParams();
  const { addLocalePath } = useAddLocalePath();
  const { storeName, shopifyCompanyId, customerId, companyLocationId } =
    useShopifyInformation();
  const navigate = useNavigate();
  const { orderApproverRole } = useCustomerRole();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  const { data, isLoading } = useDraftOrderDetail({
    storeName,
    customerId: shopifyCompanyId,
    draftOrderId: convertToGid(id ?? "", "DraftOrder"),
    companyLocationId: convertToGid(companyLocationId ?? "", "CompanyLocation"),
  });

  const { mutate: rejectDraftOrder, isPending: isRejecting } =
    useRejectDraftOrder({
      storeName,
      customerId: convertToGid(customerId ?? "", "Customer"),
      draftOrderId: convertToGid(id ?? "", "DraftOrder"),
      note: rejectNote,
      onSuccess: () => {
        setRejectNote("");
        toast.success(t("draft-order.detail.reject-success"));
        queryClient.invalidateQueries({
          queryKey: [QUERY_DRAFT_ORDER_DETAILS],
        });
        queryClient.invalidateQueries({ queryKey: [QUERY_DRAFT_ORDERS] });
      },
    });

  const { mutate: approveDraftOrder, isPending: isApproving } =
    useApproveDraftOrder({
      storeName,
      customerId: convertToGid(customerId ?? "", "Customer"),
      draftOrderId: convertToGid(id ?? "", "DraftOrder"),
      onSuccess: (response) => {
        queryClient.invalidateQueries({ queryKey: [QUERY_DRAFT_ORDERS] });
        queryClient.invalidateQueries({
          queryKey: [QUERY_DRAFT_ORDER_DETAILS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_ORDER_HISTORY],
        });
        toast.success(t("draft-order.detail.approve-success"));
        setIsApproveDialogOpen(false);

        // Extract order ID and redirect to order details
        const orderId = extractShopifyId(
          response?.data?.draftOrder?.order?.id,
          "Order",
        );
        if (orderId) {
          setTimeout(() => {
            navigate(
              addLocalePath(
                `/apps/customer-account/order-history/${orderId}?locationId=${companyLocationId}&routeName=${orderId}`,
              ),
            );
          }, 1500);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: deleteDraftOrder, isPending: isDeleting } =
    useDeleteDraftOrder({
      ids: [convertToGid(id ?? "", "DraftOrder")],
      storeName,
      customerId: convertToGid(customerId ?? "", "Customer"),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_DRAFT_ORDERS] });
        toast.success(t("draft-order.detail.delete-success"));
        setTimeout(() => {
          navigate(
            addLocalePath("/apps/customer-account/orders-pending-approval"),
          );
        }, 1500);
      },
    });

  const { mutateAsync: addToCartAjax, isPending: isReOrdering } =
    useAddToCartAjax();

  const {
    data: customerPartnerNumberBySku,
    isLoading: isLoadingCustomerPartnerNumberBySku,
  } = useCustomerPartnerNumberBySku({
    storeName,
    companyId: shopifyCompanyId,
    skuIds:
      data?.draftOrder?.lineItems?.edges?.map((item: any) => item.node.sku) ??
      [],
  });

  const draftOrder = data?.draftOrder;
  const metafields = draftOrder?.metafields?.edges;

  const jsonPoLink = metafields?.find(
    (metafield: any) =>
      metafield.node.key === PO_LINK_DRAFT_ORDER_METAFIELD_KEY,
  )?.node?.value;
  const poLink = jsonPoLink ? JSON.parse(jsonPoLink) : null;

  if (isLoading || !data) {
    return <div>{t("common.loading")}</div>;
  }

  if (!draftOrder) {
    return <div>{t("draft-order.detail.no-pending-approval-order")}</div>;
  }

  const handleReject = () => {
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectNote.trim()) return;
    rejectDraftOrder();
    setIsRejectDialogOpen(false);
  };

  const handleApprove = () => {
    // approveDraftOrder();
    setIsApproveDialogOpen(true);
  };

  const handleConfirmApprove = () => {
    approveDraftOrder();
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteDraftOrder();
    setIsDeleteDialogOpen(false);
  };

  const goToHomepage = () => {
    switchLocationDialog(setIsLocationDialogOpen);
  };

  const handleReOrder = async () => {
    const orderLocationId = extractShopifyId(
      draftOrder?.purchasingEntity?.location?.id,
      "CompanyLocation",
    );

    if (orderLocationId !== companyLocationId) {
      setIsLocationDialogOpen(true);
      return;
    }

    await processReOrder();
  };

  const processReOrder = async () => {
    const selectedProducts = draftOrder.lineItems.edges.filter(
      (product: any) => product.node.quantity > 0,
    );
    const items = selectedProducts.map((product: any) => ({
      id: Number(extractIdFromGid(product.node.variant?.id, "ProductVariant")),
      quantity: product.node.quantity,
    }));

    if (items.length === 0) return;

    const storeName = localStorage.getItem("store-name") ?? "";

    addToCartAjax(items)
      .then((res) => {
        if (res?.status === 422) {
          toast.error(t("draft-order.detail.reorder-error-with-description"), {
            description: res?.description,
          });
          return;
        }
        toast.success(
          t("draft-order.detail.reorder-success", {
            count: res?.items ? res?.items?.length : "",
          }),
        );
        window.location.href = `https://${storeName}/cart`;
      })
      .catch((error) => {
        console.log("error", error);
        toast.error(
          t("draft-order.detail.reorder-error", { error: error?.message }),
        );
      });
  };

  const status =
    draftOrder?.tags?.length > 0 ? draftOrder.tags[0] : draftOrder.status;
  const config = draftOrderStatusConfig[status];

  return (
    <div className="w-full space-y-6">
      <OrderDetailHeaderV2
        title={t("draft-order.detail.title")}
        link="/apps/customer-account/orders-pending-approval"
      />
      <OrderDetailInformationCard
        config={{
          orderNumberTitle: t("draft-order.detail.order-number-title"),
          orderNumber: draftOrder.name,
          companyName: draftOrder.purchasingEntity?.company?.name,
          contactEmail: draftOrder.email,
          paymentTerms: draftOrder.paymentTerms?.paymentTermsName,
          shipTo: draftOrder.shippingAddress,
          orderDate: draftOrder.createdAt,
          billingAddress: draftOrder.billingAddress,
          shippingMethod: draftOrder.shippingLine?.title,
          orderedBy: formatOrderInformationOrderByText(
            draftOrder.customer?.firstName,
            draftOrder.customer?.lastName,
          ),
          status: draftOrder.status,
          financialStatus: draftOrder?.financialStatus || "-",
          fulfillmentStatus: draftOrder?.fulfillmentStatus || "-",
          poNumber: draftOrder.poNumber,
          location: draftOrder?.purchasingEntity?.location,
          itemCount: draftOrder.lineItems.edges.length,
          subtotal: draftOrder.lineItemsSubtotalPrice?.presentmentMoney,
          total: draftOrder.totalPriceSet?.presentmentMoney,
          tax: draftOrder.totalTaxSet?.presentmentMoney,
          shipping:
            draftOrder?.shippingLine?.discountedPriceSet?.presentmentMoney,
          poLink: poLink,
        }}
        hideInvoiceButton
        isDraftOrder
        desktopButtons={
          <DraftOrderDesktopButtonsSection
            className="app-hidden lg:flex"
            orderApproverRole={orderApproverRole}
            draftOrder={draftOrder}
            handleReject={handleReject}
            isRejecting={isRejecting}
            handleApprove={handleApprove}
            isApproving={isApproving}
            handleReOrder={handleReOrder}
            isReOrdering={isReOrdering}
            handleDelete={handleDelete}
            isDeleting={isDeleting}
            customerId={customerId}
          />
        }
        mobileButtons={
          <DraftOrderMobileButtonsSection
            className="flex lg:hidden"
            orderApproverRole={orderApproverRole}
            draftOrder={draftOrder}
            handleReject={handleReject}
            isRejecting={isRejecting}
            handleApprove={handleApprove}
            isApproving={isApproving}
            handleReOrder={handleReOrder}
            isReOrdering={isReOrdering}
            handleDelete={handleDelete}
            isDeleting={isDeleting}
            customerId={customerId}
          />
        }
        orderStatusBadge={
          <CustomStatusBadge
            status={config.label}
            type={config.label === "Pending Approval" ? "blue" : "gray"}
            className="w-fit"
          />
        }
      />

      {draftOrder.tags?.length > 0 && draftOrder.tags[0] === "rejected" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-2 flex-1 min-w-0">
              <p className="text-sm font-semibold break-words">
                {t("draft-order.detail.note")}{" "}
                {draftOrder?.rejectedBy?.firstName || ""}{" "}
                {draftOrder?.rejectedBy?.lastName || ""}
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">
                {draftOrder.note2 || ""}
              </p>
            </div>
          </div>
        </div>
      )}

      <OrderDetailProductTable
        customerPartnerNumber={customerPartnerNumberBySku}
        isLoading={isLoadingCustomerPartnerNumberBySku}
        lineItem={draftOrder.lineItems.edges.map((item) => ({
          id: item.node.id,
          variantId: item.node.variant?.id,
          title: item.node.title,
          sku: item.node.sku,
          quantity: item.node.quantity,
          subtotal: item.node.discountedTotalSet?.shopMoney,
          image: item.node.image,
        }))}
      />

      <DraftOrderDialogs
        type="approve"
        isOpen={isApproveDialogOpen}
        onClose={() => setIsApproveDialogOpen(false)}
        onConfirm={handleConfirmApprove}
        isPending={isApproving}
      />

      <DraftOrderDialogs
        type="reject"
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        isPending={isRejecting}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
      />

      <DraftOrderDialogs
        type="delete"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />

      <DraftOrderDialogs
        type="location"
        isOpen={isLocationDialogOpen}
        onClose={() => setIsLocationDialogOpen(false)}
        onConfirm={() => {
          setIsLocationDialogOpen(false);
          processReOrder();
        }}
        locationName={draftOrder?.purchasingEntity?.location?.name}
        onGoToHomepage={goToHomepage}
      />
    </div>
  );
}
