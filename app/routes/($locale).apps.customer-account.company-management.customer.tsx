import { Outlet, useLocation, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import UserListTable from "~/components/users/list/UserListTable";
import { useCustomerRole } from "~/hooks/use-customer-role";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";

export default function UsersRoute() {
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);
  const { companyRole } = useCustomerRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (
      companyRole && companyRole !== "Admin" &&
      (pathname.endsWith("/customer") || pathname.endsWith("/customer/"))
    ) {
      navigate("/", { replace: true });
    }
  }, [companyRole, pathname, navigate]);

  if (breadcrumbRoute.length === 2 && companyRole === "Admin") {
    return <UserListTable />;
  }

  return <Outlet />
}
