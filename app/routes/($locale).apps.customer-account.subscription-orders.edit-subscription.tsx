import { Outlet, Scripts } from "@remix-run/react";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";
import { useNavigate } from "@remix-run/react";
import { useAddLocalePath } from "~/hooks/utils.hooks";

export default function SubscriptionOrdersEditSubscriptionRoute() {
  const breadcrumbs = useRouteBreadcrumbs().slice(2);
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();

  if (breadcrumbs.length <= 2) {
    navigate(addLocalePath("/apps/customer-account/subscription-orders"));
    return null;
  }
  return (
    <>
      <Outlet />
      <Scripts />
    </>
  );
}
