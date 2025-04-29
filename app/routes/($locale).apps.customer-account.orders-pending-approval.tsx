import { Outlet, Scripts } from "@remix-run/react";
import DraftOrdersLists from "~/components/draft-order/DraftOrderLists";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function DraftOrderRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <DraftOrdersLists />
      ) : (
        <>
          <Outlet />
          <Scripts />
        </>
      )}
    </div>
  )
}
