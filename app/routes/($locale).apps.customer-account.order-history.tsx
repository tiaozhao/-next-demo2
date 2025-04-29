import { Outlet, Scripts } from "@remix-run/react";
import OrderHistoryList from "~/components/order-history/OrderHistoryList";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function OrderHistoryRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <OrderHistoryList />
      ) : (
        <>
          <Outlet />
          <Scripts />
        </>
      )}
    </div>
  );
}
