import { useQuery } from "@tanstack/react-query";
import { QUERY_ADMIN_PORTAL_SHOP } from "~/constant/react-query-keys";
import { getAdminPortalShop } from "~/request/admin-portal";

export function useAdminPortalShop() {
  const queryResult = useQuery({
    queryKey: [QUERY_ADMIN_PORTAL_SHOP],
    queryFn: async () => {
      return await getAdminPortalShop();
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return queryResult;
}
