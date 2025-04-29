import { Outlet, Scripts } from "@remix-run/react";
import SubscriptionOrdersList from "~/components/subscription-orders/list/SubscriptionOrdersList";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function SubscriptionOrdersRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <SubscriptionOrdersList />
      ) : (
        <>
          <Outlet />
          <Scripts />
        </>
      )}
    </div>
  );
}
