import { SubscriptionOrderProvider } from "~/context/subscription-order.context";
import { SubscriptionPlanChooseRoute } from "~/components/subscription-orders/plan/SubscriptionPlanChooseRoute";

export default function SubscriptionOrdersChoosePlanRoute() {
  return (
    <SubscriptionOrderProvider>
      <SubscriptionPlanChooseRoute />
    </SubscriptionOrderProvider>
  );
}
