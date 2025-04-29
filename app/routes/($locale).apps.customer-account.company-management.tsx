import { Outlet, Scripts } from "@remix-run/react";

export default function CompanyManagementLayout() {
  return (
    <>
      <Outlet />
      <Scripts />
    </>
  )
}
