import { Outlet, Scripts } from "@remix-run/react";
import QuotesList from "~/components/request-for-quotes/list/QuotesList";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function QuotesRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <QuotesList />
      ) : (
        <>
          <Outlet />
          <Scripts />
        </>
      )}
    </div>
  );
}
