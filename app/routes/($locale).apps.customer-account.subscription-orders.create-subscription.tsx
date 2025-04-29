import { SubsciptionCreateOrder } from "~/components/subscription-orders/create/SubsciptionCreateOrder";
import { SubscriptionOrderProvider } from "~/context/subscription-order.context";

export default function SubscriptionOrdersCreateRoute() {
  return (
    <SubscriptionOrderProvider>
      <SubsciptionCreateOrder />
    </SubscriptionOrderProvider>
  );
}
