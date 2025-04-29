import _ from "lodash";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Fragment } from "react/jsx-runtime";
import { CustomPaginationNew } from "~/components/common/CustomPaginationNew";
import { FilterValues } from "~/components/common/DynamicFilterBuilder";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";
import { useGetSubscriptionPlan } from "~/hooks/use-subscription-plan";
import { useShopifyInformation } from "~/lib/shopify";
import { formatSubscriptionFrequencyText } from "~/lib/subscription-plan";
import { cn, extractIdFromGid } from "~/lib/utils";
import {
  FetchSellingPlansRequest,
  FetchSellingPlansResponse,
} from "~/types/selling-plans/selling-plan.schema";
import SubscriptionPlanListHeader from "./SubscriptionPlanListHeader";
import SubscriptionPlanTableExpand from "./SubscriptionPlanTableExpand";

interface MobileCardProps {
  data: FetchSellingPlansResponse["sellingPlans"];
  isLoading: boolean;
  handleToggleDetails: (id: number) => void;
  expandedRow: number | null;
}

const MobileCard = ({
  data,
  isLoading,
  handleToggleDetails,
  expandedRow,
}: MobileCardProps) => {
  const i18nPrefix = "subscription-orders.choose-plan.list";
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full lg:hidden">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full py-8 text-gray-500 lg:hidden">
        <p> {t(`${i18nPrefix}.table.no-data`)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-[10px] lg:hidden">
      {data.map((plan) => (
        <div
          key={plan.id}
          className="bg-secondary-light rounded-lg p-5 shadow-sm cursor-pointer"
        >
          <div className="grid grid-cols-2 gap-4 ">
            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.name`)}
              </div>
              <div className="break-words w-full text-sm">{plan.name}</div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.description`)}
              </div>
              <div className="break-words w-full text-sm">
                {plan.description}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.company-location`)}
              </div>
              <div className="break-words w-full text-sm">
                {`${plan?.companyLocation?.name} - ${plan?.companyLocation?.externalId || extractIdFromGid(plan?.companyLocation?.id, "CompanyLocation")}`}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.products`)}
              </div>
              <div className="break-words w-full text-sm">
                {t(
                  `${i18nPrefix}.table.${_.toNumber(plan?.lineCount || 1) > 1 ? "products" : "product"}-count`,
                  {
                    count: plan?.lineCount || 1,
                  },
                )}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.frequency`)}
              </div>
              <div className="flex flex-wrap gap-1 text-sm break-words">
                {plan?.frequencyCount === 1 && plan?.deliveryPolicies?.[0]
                  ? formatSubscriptionFrequencyText(
                      [
                        {
                          interval: _.toString(
                            plan?.deliveryPolicies?.[0]?.intervalValue || 0,
                          ),
                          unit:
                            plan?.deliveryPolicies?.[0]?.intervalUnit ||
                            "weekly",
                        },
                      ],
                      t,
                    )
                  : t(
                      `${i18nPrefix}.table.${_.toNumber(plan?.frequencyCount || 1) > 1 ? "frequencies" : "frequency"}-count`,
                      {
                        count: plan?.frequencyCount || 1,
                      },
                    )}
              </div>
            </div>

            <div className="flex flex-col gap-y-1 break-words">
              <div className="text-gray-900 text-sm font-bold">
                {t(`${i18nPrefix}.table.discount`)}
              </div>
              <div className="break-words w-full text-sm">
                {plan.discountDisplay}
              </div>
            </div>

            <div className="flex justify-end col-span-2 pr-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleDetails(plan.id)}
                className="text-secondary-foreground font-semibold text-xs hover:bg-transparent"
              >
                {t("subscription-orders.list.table.details")}
                {expandedRow === plan.id ? (
                  <ChevronUp className="!w-5 !h-5" strokeWidth={3} />
                ) : (
                  <ChevronDown className="!w-5 !h-5" strokeWidth={3} />
                )}
              </Button>
            </div>

            {expandedRow === plan.id && (
              <div className="col-span-2">
                <SubscriptionPlanTableExpand
                  subscriptionPlanId={_.toString(plan.id)}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export function SubscriptionPlanList() {
  const { t } = useTranslation();
  const i18nPrefix = "subscription-orders.choose-plan.list";
  const { storeName } = useShopifyInformation();
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);
  const shouldFetchData = useMemo(
    () => breadcrumbRoute.length === 2,
    [breadcrumbRoute.length],
  );
  const [params, setParams] = useState<FetchSellingPlansRequest>({
    storeName: storeName,
    pagination: {
      page: 1,
      pageSize: 10,
    },
    sort: [
      {
        field: "updatedAt",
        direction: "desc",
      },
    ],
    filters: {},
  });
  const { data: subscriptionPlanData, isLoading: isSubscriptionPlanLoading } =
    useGetSubscriptionPlan(params, shouldFetchData);
  const data = subscriptionPlanData?.sellingPlans || [];

  useEffect(() => {
    // when no data, go to previous page
    if (
      !isSubscriptionPlanLoading &&
      data?.length === 0 &&
      params.pagination?.page &&
      params.pagination?.page > 1
    ) {
      const prevPage = params.pagination.page - 1;
      const newCurrentPage = prevPage > 0 ? prevPage : 1;
      setParams((prevParams) => ({
        ...prevParams,
        pagination: {
          pageSize: prevParams.pagination?.pageSize || 10,
          page: newCurrentPage,
        },
      }));
    }
  }, [data?.length, isSubscriptionPlanLoading, params.pagination?.page]);

  const totalPages = useMemo(() => {
    if (!subscriptionPlanData?.totalCount) return 0;
    return Math.ceil(
      (subscriptionPlanData?.totalCount || 0) /
        (params.pagination?.pageSize || 10),
    );
  }, [subscriptionPlanData?.totalCount, params.pagination?.pageSize]);

  const hasNextPage = useMemo(() => {
    return (subscriptionPlanData?.page || 1) < totalPages;
  }, [subscriptionPlanData?.page, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return (subscriptionPlanData?.page || 1) > 1;
  }, [subscriptionPlanData?.page]);

  const handlePageChange = (page: number) => {
    setParams((prev) => ({
      ...prev,
      pagination: {
        page,
        pageSize: prev.pagination?.pageSize || 10,
      },
    }));
  };

  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setParams((prev) => ({
      ...prev,
      pagination: {
        page: 1,
        pageSize: itemsPerPage,
      },
    }));
  };

  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleToggleDetails = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  useEffect(() => {
    if (data.length > 0) {
      setExpandedRow(data[0].id);
    }
  }, [data]);

  const onSearch = (filters: FilterValues) => {
    setParams((prev) => ({
      ...prev,
      filters: filters,
      pagination: {
        page: 1,
        pageSize: prev.pagination?.pageSize || 10,
      },
    }));
  };

  return (
    <div className="space-y-5">
      {/* title */}
      <div className="text-gray-700 text-normal font-bold">
        {t("subscription-orders.choose-plan.list.title")}
      </div>

      <SubscriptionPlanListHeader
        onSearch={onSearch}
        totalItems={subscriptionPlanData?.totalCount || 0}
      ></SubscriptionPlanListHeader>

      {/* plan list */}
      {/* destop */}
      <div className="rounded-lg border border-border app-hidden lg:block">
        <Table>
          <TableHeader className="bg-secondary-light">
            <TableRow className="border-border">
              <TableCell className="text-sm font-bold text-text-color align-top pl-4 w-1/5">
                {t(`${i18nPrefix}.table.name`)}
              </TableCell>
              <TableCell className="text-sm font-bold text-text-color align-top w-1/6">
                {t(`${i18nPrefix}.table.description`)}
              </TableCell>
              <TableCell className="text-sm font-bold text-text-color align-top w-1/6">
                {t(`${i18nPrefix}.table.company-location`)}
              </TableCell>
              <TableCell className="text-sm font-bold text-text-color align-top w-[10%]">
                {t(`${i18nPrefix}.table.products`)}
              </TableCell>

              <TableCell className="text-sm font-bold text-text-color align-top w-1/6">
                {t(`${i18nPrefix}.table.frequency`)}
              </TableCell>
              <TableCell className="text-sm font-bold text-text-color align-top">
                {t(`${i18nPrefix}.table.discount`)}
              </TableCell>

              <TableCell className="text-sm font-bold text-text-color align-top"></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSubscriptionPlanLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.length > 0 ? (
              data.map((plan, index) => (
                <Fragment key={plan.id}>
                  <TableRow
                    key={plan.id}
                    className={cn(
                      "border-border",
                      index % 2 !== 0 ? "bg-secondary-light" : "",
                    )}
                  >
                    <TableCell className="pl-4">
                      <div className="line-clamp-1">{plan.name}</div>
                    </TableCell>

                    <TableCell>
                      <div className="line-clamp-1">{plan?.description}</div>
                    </TableCell>

                    <TableCell>
                      {`${plan?.companyLocation?.name} - ${plan?.companyLocation?.externalId || extractIdFromGid(plan?.companyLocation?.id, "CompanyLocation")}`}
                    </TableCell>

                    <TableCell>
                      {t(
                        `${i18nPrefix}.table.${_.toNumber(plan?.lineCount || 1) > 1 ? "products" : "product"}-count`,
                        {
                          count: plan?.lineCount || 1,
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      {plan?.frequencyCount === 1 && plan?.deliveryPolicies?.[0]
                        ? formatSubscriptionFrequencyText(
                            [
                              {
                                interval: _.toString(
                                  plan?.deliveryPolicies?.[0]?.intervalValue ||
                                    0,
                                ),
                                unit:
                                  plan?.deliveryPolicies?.[0]?.intervalUnit ||
                                  "weekly",
                              },
                            ],
                            t,
                          )
                        : t(
                            `${i18nPrefix}.table.${_.toNumber(plan?.frequencyCount || 1) > 1 ? "frequencies" : "frequency"}-count`,
                            {
                              count: plan?.frequencyCount || 1,
                            },
                          )}
                    </TableCell>
                    <TableCell>{plan.discountDisplay}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleDetails(plan.id)}
                        className="text-secondary-foreground font-semibold text-[13px] hover:bg-transparent"
                      >
                        {t("subscription-orders.list.table.details")}
                        {expandedRow === plan.id ? (
                          <ChevronUp className="!w-5 !h-5" strokeWidth={3} />
                        ) : (
                          <ChevronDown className="!w-5 !h-5" strokeWidth={3} />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRow === plan.id && (
                    <TableRow className="border-none">
                      <TableCell colSpan={7} className="p-0">
                        <SubscriptionPlanTableExpand
                          subscriptionPlanId={_.toString(plan.id)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t(`${i18nPrefix}.table.no-data`)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* mobile */}
      <MobileCard
        data={data}
        isLoading={isSubscriptionPlanLoading}
        handleToggleDetails={handleToggleDetails}
        expandedRow={expandedRow}
      />

      {_.toNumber(subscriptionPlanData?.totalCount || 0) > 10 && (
        <CustomPaginationNew
          currentPage={params.pagination?.page || 1}
          totalPages={totalPages}
          itemsPerPage={params.pagination?.pageSize || 10}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          hasNextButton={hasNextPage}
          hasPreviousButton={hasPreviousPage}
        />
      )}
    </div>
  );
}
