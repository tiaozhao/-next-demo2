import { SubscriptionContractStatusType } from "~/types/subscription-contracts/subscription-contract.schema";
import { useTranslation } from "react-i18next";
import _ from "lodash";
import SubscriptionDetailInformationCard from "./SubscriptionDetailInformationCard";
import {
  SubscriptionDetailButtonConfig,
  SubscriptionDetailDestopButtons,
  SubscriptionDetailMobileButtons,
} from "./SubscriptionDetailButtons";
import { useCustomerInformation } from "~/hooks/use-users";
import { useShopifyInformation } from "~/lib/shopify";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  QUERY_ALL_SUBSCRIPTION_ORDERS,
  QUERY_SUBSCRIPTION_ORDER_BY_ID,
} from "~/constant/react-query-keys";
import {
  useApproveSubscriptionOrder,
  useCancelSubscriptionOrder,
  useDeclineSubscriptionOrder,
  useDeleteSubscriptionOrder,
  usePauseSubscriptionOrder,
  useResumeSubscriptionOrder,
  useSkipSubscriptionOrderDelivery,
} from "~/hooks/use-subscription-orders";
import { toast } from "sonner";
import { GetSubscriptionContractByIdResponse } from "~/types/subscription-contracts/subscription-contract-get-by-id.schema";
import { format } from "date-fns";
import {
  computedSubscriptionOrderTotal,
  formatSubscriptionListFrequency,
} from "~/lib/subscription-orders";
import { useCustomerRole } from "~/hooks/use-customer-role";
import { useNavigate } from "@remix-run/react";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { SubsciptionOrdersListConfirmDialog } from "../list/SubsciptionOrdersListConfirmDialog";
import { SubscriptionPlanDiscountTypeMap } from "~/lib/subscription-plan";

interface Props {
  id: string;
  data: GetSubscriptionContractByIdResponse["subscriptionContract"];
}
export default function SubscriptionDetailInformation({ id, data }: Props) {
  const { t } = useTranslation();
  const { storeName, shopifyCustomerId, shopifyCompanyLocationId } =
    useShopifyInformation();
  const { orderApproverRole } = useCustomerRole();
  const { data: customerData } = useCustomerInformation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();

  const products = data?.lines || [];
  const { subtotal, total } = computedSubscriptionOrderTotal(
    products,
    data?.shippingCost || 0,
    {
      discountType: SubscriptionPlanDiscountTypeMap[data?.discountType || ""],
      discountValue: data?.discountValue || 0,
      offerDiscount: data?.discountType !== "",
    },
  );
  const currencyCode = data?.currencyCode || "USD";

  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  useEffect(() => {
    if (isDeclineDialogOpen || isCancelDialogOpen) {
      setRejectNote("");
    }
  }, [isDeclineDialogOpen, isCancelDialogOpen]);

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

  // edit subscription order
  const handleEdit = () => {
    navigate(
      addLocalePath(
        `/apps/customer-account/subscription-orders/edit-subscription/${id}?routeName=${encodeURIComponent(
          `#${id}`,
        )}`,
      ),
    );
  };

  // skip delivery
  const {
    mutateAsync: skipSubscriptionOrderDelivery,
    isPending: isSkippingDelivery,
  } = useSkipSubscriptionOrderDelivery();

  const handleSkip = () => {
    skipSubscriptionOrderDelivery({
      subscriptionContractId: _.toNumber(id),
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
          setIsSkipDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          console.error("skip delivery error", res);
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
  const {
    mutateAsync: deleteSubscriptionOrder,
    isPending: isDeletingSubscriptionOrder,
  } = useDeleteSubscriptionOrder();

  const handleDelete = () => {
    deleteSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
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
          resetQuery();
        } else {
          console.error("delete subscription order error", res);
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

  // pause subscription order
  const {
    mutateAsync: pauseSubscriptionOrder,
    isPending: isPausingSubscriptionOrder,
  } = usePauseSubscriptionOrder();

  const handlePause = () => {
    pauseSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.pause.toast.success"),
          );
          setIsPauseDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          console.error("pause subscription order error", res);
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.pause.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("pause subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.pause.toast.error"),
        );
      });
  };

  // resume subscription order
  const {
    mutateAsync: resumeSubscriptionOrder,
    isPending: isResumingSubscriptionOrder,
  } = useResumeSubscriptionOrder();

  const handleResume = () => {
    resumeSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.resume.toast.success"),
          );
          setIsResumeDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          console.error("resume subscription order error", res);
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.resume.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("resume subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.resume.toast.error"),
        );
      });
  };

  // approve subscription order
  const {
    mutateAsync: approveSubscriptionOrder,
    isPending: isApprovingSubscriptionOrder,
  } = useApproveSubscriptionOrder();

  const handleApprove = () => {
    approveSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
      approverId: customerData?.customer?.companyContactId,
      approverName: `${customerData?.customer?.firstName} ${customerData?.customer?.lastName}`,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.approve.toast.success"),
          );
          setIsApproveDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.approve.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("approve subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.approve.toast.error"),
        );
      });
  };

  // decline subscription order
  const {
    mutateAsync: declineSubscriptionOrder,
    isPending: isDecliningSubscriptionOrder,
  } = useDeclineSubscriptionOrder();

  const handleDecline = () => {
    declineSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
      approverId: customerData?.customer?.companyContactId,
      approverName: `${customerData?.customer?.firstName} ${customerData?.customer?.lastName}`,
      note: rejectNote,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.decline.toast.success"),
          );
          setIsDeclineDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          console.error("decline subscription order error", res);
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.decline.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("decline subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.decline.toast.error"),
        );
      });
  };

  // cancel subscription order
  const {
    mutateAsync: cancelSubscriptionOrder,
    isPending: isCancellingSubscriptionOrder,
  } = useCancelSubscriptionOrder();
  const handleCancel = () => {
    cancelSubscriptionOrder({
      subscriptionContractId: _.toNumber(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      storeName: storeName,
      approvedById: customerData?.customer?.companyContactId,
      approvedByName: `${customerData?.customer?.firstName} ${customerData?.customer?.lastName}`,
      note: rejectNote,
    })
      .then((res) => {
        if (res?.success) {
          toast.success(
            res?.message ||
              t("subscription-orders.common-actions.cancel.toast.success"),
          );
          setIsCancelDialogOpen(false);
          resetQuery(_.toNumber(id));
        } else {
          console.error("cancel subscription order error", res);
          toast.error(
            res?.message ||
              t("subscription-orders.common-actions.cancel.toast.error"),
          );
        }
      })
      .catch((err) => {
        console.error("cancel subscription order error", err);
        toast.error(
          err?.message ||
            t("subscription-orders.common-actions.cancel.toast.error"),
        );
      });
  };

  const fetchingGroup = [
    isSkippingDelivery,
    isPausingSubscriptionOrder,
    isResumingSubscriptionOrder,
    isDeletingSubscriptionOrder,
    isApprovingSubscriptionOrder,
    isDecliningSubscriptionOrder,
    isCancellingSubscriptionOrder,
  ];

  const buttonConfig: SubscriptionDetailButtonConfig = {
    edit: {
      isLoading: false,
      onClick: handleEdit,
    },
    delete: {
      isLoading: isDeletingSubscriptionOrder,
      onClick: () => setIsDeleteDialogOpen(true),
    },
    "skip-delivery": {
      isLoading: isSkippingDelivery,
      onClick: () => setIsSkipDialogOpen(true),
    },
    pause: {
      isLoading: isPausingSubscriptionOrder,
      onClick: () => setIsPauseDialogOpen(true),
    },
    resume: {
      isLoading: isResumingSubscriptionOrder,
      onClick: () => setIsResumeDialogOpen(true),
    },
    approve: {
      isLoading: isApprovingSubscriptionOrder,
      onClick: () => setIsApproveDialogOpen(true),
    },
    decline: {
      isLoading: isDecliningSubscriptionOrder,
      onClick: () => setIsDeclineDialogOpen(true),
    },
    cancel: {
      isLoading: isCancellingSubscriptionOrder,
      onClick: () => setIsCancelDialogOpen(true),
    },
  };

  const endDate = format(new Date(data?.endDate), "MM/dd/yyyy");
  return (
    <>
      <SubscriptionDetailInformationCard
        subscription={{
          orderName: data?.name || "",
          number: _.toString(data?.id),
          companyAccount: `${data?.companyLocation?.name} - ${data?.companyLocation?.externalId}`,
          contactEmail: data?.customer?.email,
          billingAddress: data?.companyLocation?.billingAddress,
          shippingAddress: data?.companyLocation?.shippingAddress,
          orderDate: data?.createdAt,
          orderedBy: `${data?.customer?.firstName} ${data?.customer?.lastName}`,
          status: data?.status,
          paymentTerms: data?.companyLocation?.paymentTerms?.name,
          poNumber: data?.poNumber || "",
          shippingMethod: data?.shippingMethodName,
          startDeliveryDate: format(new Date(data?.startDate), "MM/dd/yyyy"),
          nextDeliveryDate: format(new Date(data?.nextOrderDate), "MM/dd/yyyy"),
          endDeliveryDate: endDate === "12/31/9999" ? "-" : endDate,
          frequency: formatSubscriptionListFrequency(
            data?.intervalUnit,
            data?.intervalValue,
            t,
          ),
          itemCount: products.length,
          subtotal: {
            amount: _.toString(subtotal),
            currencyCode: currencyCode,
          },
          total: {
            amount: _.toString(total),
            currencyCode: currencyCode,
          },
          shipping: {
            amount: _.toString(data?.shippingCost || 0),
            currencyCode: currencyCode,
          },
          sellingPlan: {
            id: _.toNumber(data?.sellingPlan?.id),
            name: data?.sellingPlan?.name || "",
            offerDiscount: data?.discountType !== "",
            discountType: data?.discountType || "",
            discountValue: data?.discountValue || 0,
          },
        }}
        mobileButtons={
          <SubscriptionDetailMobileButtons
            orderApproverRole={orderApproverRole}
            status={data?.status as SubscriptionContractStatusType}
            buttonConfig={{
              ...buttonConfig,
              edit: {
                isLoading: false,
                onClick: handleEdit,
              },
            }}
            disabledAll={fetchingGroup?.some((isFetching) => isFetching)}
          />
        }
        desktopButtons={
          <SubscriptionDetailDestopButtons
            orderApproverRole={orderApproverRole}
            status={data?.status as SubscriptionContractStatusType}
            buttonConfig={{
              ...buttonConfig,
              edit: {
                isLoading: false,
                onClick: handleEdit,
              },
            }}
            disabledAll={fetchingGroup?.some((isFetching) => isFetching)}
          />
        }
      />

      <SubsciptionOrdersListConfirmDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onOK={handleApprove}
        onCancel={() => setIsApproveDialogOpen(false)}
        type="approve"
        loading={isApprovingSubscriptionOrder}
        disabled={isApprovingSubscriptionOrder}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isDeclineDialogOpen}
        onOpenChange={setIsDeclineDialogOpen}
        onOK={handleDecline}
        onCancel={() => setIsDeclineDialogOpen(false)}
        type="decline"
        loading={isDecliningSubscriptionOrder}
        disabled={isDecliningSubscriptionOrder}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isSkipDialogOpen}
        onOpenChange={setIsSkipDialogOpen}
        onOK={handleSkip}
        onCancel={() => setIsSkipDialogOpen(false)}
        type="skip-delivery"
        loading={isSkippingDelivery}
        disabled={isSkippingDelivery}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onOK={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        type="delete"
        loading={isDeletingSubscriptionOrder}
        disabled={isDeletingSubscriptionOrder}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isPauseDialogOpen}
        onOpenChange={setIsPauseDialogOpen}
        onOK={handlePause}
        onCancel={() => setIsPauseDialogOpen(false)}
        type="pause"
        loading={isPausingSubscriptionOrder}
        disabled={isPausingSubscriptionOrder}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isResumeDialogOpen}
        onOpenChange={setIsResumeDialogOpen}
        onOK={handleResume}
        onCancel={() => setIsResumeDialogOpen(false)}
        type="resume"
        loading={isResumingSubscriptionOrder}
        disabled={isResumingSubscriptionOrder}
      />

      <SubsciptionOrdersListConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onOK={handleCancel}
        onCancel={() => setIsCancelDialogOpen(false)}
        type="cancel"
        loading={isCancellingSubscriptionOrder}
        disabled={isCancellingSubscriptionOrder}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
      />
    </>
  );
}
