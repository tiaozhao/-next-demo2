import { SubscriptionEditOrder } from "~/components/subscription-orders/edit/SubscriptionEditOrder";
import { useParams, useNavigate } from "@remix-run/react";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SubscriptionOrderProvider } from "~/context/subscription-order.context";

export default function SubscriptionOrdersEditRoute() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  if (!id) {
    toast.error(t("subscription-orders.edit.error.no-order-data"));
    navigate(addLocalePath("apps/customer-account/subscription-orders"));
    return null;
  }
  return (
    <SubscriptionOrderProvider>
      <SubscriptionEditOrder id={id} />
    </SubscriptionOrderProvider>
  );
}
