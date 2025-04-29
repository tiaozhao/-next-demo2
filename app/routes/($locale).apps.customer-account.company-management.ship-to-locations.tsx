import { useLocation, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import CompanyLocationTable from "~/components/ship-to-location/CompanyLocationTable";
import { useCustomerRole } from "~/hooks/use-customer-role";

export default function ShipToLocationRoute() {
    const { companyRole } = useCustomerRole();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        if (
            companyRole && companyRole !== "Admin" &&
            (pathname.endsWith("/ship-to-locations") || pathname.endsWith("/ship-to-locations/"))
        ) {
            navigate("/", { replace: true });
        }
    }, [companyRole, pathname, navigate]);

    return <CompanyLocationTable />
}
