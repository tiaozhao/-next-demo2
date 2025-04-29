import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FilterValues } from "~/components/common/DynamicFilterBuilder";
import { DynamicFilterBuilderHeader } from "~/components/common/DynamicFilterBuilderHeader";
import {
  DesktopDynamicFilterV2,
  MobileDynamicFilterV2,
} from "~/components/common/DynamicFilterV2";
import {
  subscriptionPlanFilterConfig,
  SubscriptionPlanFilterType,
} from "~/config/filterConfig";
import { useShipToLocationList } from "~/hooks/use-ship-to-location";
import { useCustomerInformation } from "~/hooks/use-users";
import { isEmptyFilterInput } from "~/lib/filter";
import { useShopifyInformation } from "~/lib/shopify";
import { DynamicFilterValueTypes, FilterTag } from "~/types/filter";

interface SubscriptionPlanListHeaderProps {
  onSearch: (filters: FilterValues) => void;
  totalItems: number;
  className?: string;
}
export default function SubscriptionPlanListHeader({
  onSearch,
  totalItems,
  className,
}: SubscriptionPlanListHeaderProps) {
  const { t } = useTranslation();
  const { storeName, shopifyCustomerId, shopifyCompanyId, isB2B } =
    useShopifyInformation();

  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const [filters, setFilters] = useState<FilterValues>({});
  const { data: customerInformation } = useCustomerInformation();
  const pageSize = 250;
  const { data: locations } = useShipToLocationList(
    {
      customerId: shopifyCustomerId,
      companyId: shopifyCompanyId,
      storeName,
      pagination: {
        currentPage: 1,
        perPage: pageSize,
        first: pageSize,
        query: ``,
      },
    },
    true,
  );

  const functionFilterConfig = subscriptionPlanFilterConfig();
  const [filterValue, setFilterValue] =
    useState<Record<SubscriptionPlanFilterType, DynamicFilterValueTypes>>();
  const filterConfig = useMemo(() => {
    const options = locations?.companyLocations
      ?.map((location) => {
        const isOkLocation = customerInformation?.roles?.find(
          (role: any) => role.companyLocationId === location.id,
        );
        if (!isOkLocation) return null;

        return {
          label: location.name,
          value: location.id,
          tagValue: location.name,
        };
      })
      .filter((item) => item !== null);
    const config = _.cloneDeep(functionFilterConfig);
    const { companyLocationId, ...rest } = config;
    const res = {
      ...rest,
      ...(isB2B !== "false"
        ? {
            companyLocationId: {
              ...companyLocationId,
              options: options, // required api
            },
          }
        : {}),
    };
    return res;
  }, [locations, customerInformation, functionFilterConfig]);

  const handleApply = (
    filterValue: Record<SubscriptionPlanFilterType, DynamicFilterValueTypes>,
  ) => {
    const newFilterValue = {
      ...isEmptyFilterInput(
        "companyLocationId",
        filterValue.companyLocationId as string,
      ),
      ...isEmptyFilterInput("name", filterValue.name as string),
    };

    setFilters(newFilterValue);
  };

  const handleClear = () => {
    setFilters({});
  };

  const handleRemoveFilter = (tag: FilterTag<SubscriptionPlanFilterType>) => {
    const newFilters = { ...filters };
    delete newFilters[tag.type];
    setFilters(newFilters);
  };

  useEffect(() => {
    onSearch(filters);
  }, [filters]);

  return (
    <div className="flex flex-col space-y-4">
      <DynamicFilterBuilderHeader
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        totalItems={totalItems}
        setShowMobileFilter={setShowMobileFilter}
        title={t(
          "subscription-orders.choose-plan.list.pagination.total-records",
        )}
        hideFilterTextWhileMobile={true}
      ></DynamicFilterBuilderHeader>

      {showFilters && (
        <DesktopDynamicFilterV2
          onSearch={handleApply}
          onClearAllFilters={handleClear}
          onRemoveFilter={handleRemoveFilter}
          filterConfig={filterConfig}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
        />
      )}
      {showMobileFilter && (
        <MobileDynamicFilterV2
          isOpen={showMobileFilter}
          onClose={() => setShowMobileFilter(false)}
          onMobileApply={handleApply}
          filterConfig={filterConfig}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
        />
      )}
    </div>
  );
}
