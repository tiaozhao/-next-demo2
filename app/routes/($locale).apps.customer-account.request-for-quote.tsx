import { Outlet, Scripts } from "@remix-run/react";
import RequestForQuoteCreateForm from "~/components/request-for-quotes/create/RequestForQuoteCreateForm";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function RequestForQuoteRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <RequestForQuoteCreateForm />
      ) : (
        <>
          <Outlet />
          <Scripts />
        </>
      )}
    </div>
  );
}
