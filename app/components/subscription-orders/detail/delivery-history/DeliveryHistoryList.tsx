import { FilterValues } from "~/components/common/DynamicFilterBuilder";
import DeliveryHistoryListHeader from "./DeliveryHistoryListHeader";
import { DeliveryHistoryListTable } from "./DeliveryHistoryListTable";
import { DeliveryHistoryListCard } from "./DeliveryHistoryListCard";
import { useShopifyInformation } from "~/lib/shopify";
import { useState, useRef } from "react";
import { FetchSubscriptionOrdersRequest } from "~/types/subscription-contracts/subscription-orders-list.schema";
import { useGetSubscriptionOrdersHistory } from "~/hooks/use-subscription-orders";
import { CustomPagination } from "~/components/common/CustomPagination";

interface DeliveryHistoryListProps {
  id: number;
}

export default function DeliveryHistoryList({ id }: DeliveryHistoryListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { storeName, shopifyCustomerId, shopifyCompanyLocationId } =
    useShopifyInformation();
  const [params, setParams] = useState<FetchSubscriptionOrdersRequest>({
    storeName,
    customerId: shopifyCustomerId,
    companyLocationId: shopifyCompanyLocationId,
    subscriptionContractId: id,
    pagination: {
      page: 1,
      pageSize: 10,
    },
    sort: {
      field: "createdAt",
      order: "desc",
    },
  });

  const { data, isLoading } = useGetSubscriptionOrdersHistory(params);

  const handleSearch = (filters: FilterValues) => {
    setParams((prev) => ({
      ...prev,
      filter: filters,
      pagination: {
        ...prev.pagination,
        page: 1,
      },
    }));
  };

  return (
    <div className="container mx-auto" ref={listRef}>
      <div className="space-y-5">
        <DeliveryHistoryListHeader
          onSearch={handleSearch}
          totalItems={data?.total || 0}
        />
        <div className="app-hidden lg:block">
          <DeliveryHistoryListTable
            data={data?.data || []}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:hidden">
          <DeliveryHistoryListCard
            data={data?.data || []}
            isLoading={isLoading}
          />
        </div>

        {(data?.total || 0) > 10 && (
          <CustomPagination
            enableScrollToTop={false}
            currentPage={params.pagination.page}
            totalPages={
              data?.total
                ? Math.ceil(data?.total / (params?.pagination?.pageSize || 10))
                : 1
            }
            itemsPerPage={params.pagination.pageSize}
            onPageChange={(value) => {
              setParams((prev) => ({
                ...prev,
                pagination: { ...prev.pagination, page: value },
              }));
            }}
            onItemsPerPageChange={(value) => {
              setParams((prev) => ({
                ...prev,
                pagination: {
                  ...prev.pagination,
                  pageSize: value,
                },
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}
