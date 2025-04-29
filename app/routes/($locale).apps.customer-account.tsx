import { Outlet, Scripts, useLocation } from "@remix-run/react";
import {
  Loading,
  LoadingIndicator,
  LoadingProvider,
} from "~/components/common/GlobalLoading";
import Breadcrumbs from "~/components/customer-account/Breadcrumbs";
import SideBarMenu from "~/components/customer-account/SideBarMenu";
import { useCustomerRole } from "~/hooks/use-customer-role";

export default function CustomerAccountRoute() {
  const { pathname } = useLocation();
  const { companyRole } = useCustomerRole();

  const showSideMenu =
    !pathname.includes("/compare") &&
    !/\/shopping-lists\/\w+/.test(pathname) &&
    !/\/order-history\/\w+/.test(pathname) &&
    !/\/orders-pending-approval\/\w+/.test(pathname) &&
    !/\/company-management\/customer\/\w+/.test(pathname) &&
    !/\/quotes\/\w+/.test(pathname) &&
    !/\/subscription-orders\/\d+/.test(pathname);

  if (!companyRole) {
    return <Loading />;
  }

  return (
    <>
      <LoadingProvider>
        <LoadingIndicator />
        <Breadcrumbs />

        <div className="px-4 lg:px-0 pt-6 pb-4 w-full max-w-7xl mx-auto flex gap-5 flex-col lg:flex-row">
          {showSideMenu ? <SideBarMenu /> : null}
          <Outlet />
        </div>

        <Scripts></Scripts>
      </LoadingProvider>
    </>
  );
}
