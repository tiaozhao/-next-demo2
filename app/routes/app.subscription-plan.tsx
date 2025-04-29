import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, Scripts, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Button,
  Card,
  EmptySearchResult,
  IndexFilters,
  IndexFiltersProps,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { IndexTableHeading } from "@shopify/polaris/build/ts/src/components/IndexTable";
import { NonEmptyArray } from "@shopify/polaris/build/ts/src/types";
import { useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ChangeLanguageSelector from "~/components/admin-portal/ChangeLanguageSelctor";
import { SubscriptionPlanFilter } from "~/components/admin-portal/subscription-plan/SubscriptionPlanFilter";
import { CustomPagination } from "~/components/common/CustomPagination";
import {
  QUERY_ALL_SUBSCRIPTION_PLANS,
  QUERY_SUBSCRIPTION_PLAN_BY_ID,
} from "~/constant/react-query-keys";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";
import {
  useDeleteSubscriptionPlan,
  useGetSubscriptionPlan,
} from "~/hooks/use-subscription-plan";
import {
  formatSubscriptionFrequencyText,
  SubscriptionPlanCustomerId,
} from "~/lib/subscription-plan";
import { extractIdFromGid } from "~/lib/utils";
import { authenticate } from "~/shopify.server";
import { FetchSellingPlansRequest } from "~/types/selling-plans/selling-plan.schema";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function SubscriptionPlan() {
  const { shop: storeName } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const i18nPrefix = "admin-portal.subscription-plan.list";
  const navigate = useNavigate();
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);

  const sortOptions: IndexFiltersProps["sortOptions"] = [
    {
      label: t(`${i18nPrefix}.sort.created-at`),
      value: "createdAt asc",
      directionLabel: t(`${i18nPrefix}.sort.ascending`),
    },
    {
      label: t(`${i18nPrefix}.sort.created-at`),
      value: "createdAt desc",
      directionLabel: t(`${i18nPrefix}.sort.descending`),
    },
    {
      label: t(`${i18nPrefix}.sort.updated-at`),
      value: "updatedAt asc",
      directionLabel: t(`${i18nPrefix}.sort.ascending`),
    },
    {
      label: t(`${i18nPrefix}.sort.updated-at`),
      value: "updatedAt desc",
      directionLabel: t(`${i18nPrefix}.sort.descending`),
    },
  ];
  const [sortSelected, setSortSelected] = useState(["createdAt desc"]);

  const [params, setParams] = useState<FetchSellingPlansRequest>({
    storeName: storeName,
    pagination: {
      page: 1,
      pageSize: 10,
    },
    sort: [
      {
        field: "createdAt",
        direction: "desc",
      },
    ],
  });
  const shouldFetchData = useMemo(
    () => breadcrumbRoute.length === 0,
    [breadcrumbRoute.length],
  );
  const { data: subscriptionPlanData, isLoading: isSubscriptionPlanLoading } =
    useGetSubscriptionPlan(params, shouldFetchData);

  const data = subscriptionPlanData?.sellingPlans || [];

  const handleFilter = (filter: {
    name?: string;
    companyLocationId?: string;
  }) => {
    setParams((prev) => ({
      ...prev,
      pagination: {
        page: 1,
        pageSize: prev?.pagination?.pageSize || 10,
      },
      filters: filter,
    }));
  };

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

  // go to edit page
  const handleGoEdit = (id: string) => {
    navigate(`/app/subscription-plan/${id}`);
  };

  //   delete plan modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { mutateAsync: deletePlan, isPending: isDeletingPlan } =
    useDeleteSubscriptionPlan();
  const handleDeletePlan = () => {
    if (deletePlanId) {
      deletePlan({
        storeName: storeName,
        id: _.toNumber(deletePlanId),
        customerId: SubscriptionPlanCustomerId,
      })
        .then((res) => {
          setModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: [QUERY_ALL_SUBSCRIPTION_PLANS],
          });
          queryClient.invalidateQueries({
            queryKey: [
              QUERY_SUBSCRIPTION_PLAN_BY_ID,
              {
                id: _.toNumber(deletePlanId),
                storeName: storeName,
              },
            ],
          });
          toast.success(t(`${i18nPrefix}.modal.delete-plan.delete-success`));
        })
        .catch((err) => {
          console.error("delete plan error", err);
          toast.error(
            t(`${i18nPrefix}.modal.delete-plan.delete-error`, {
              error: err?.message || "",
            }),
          );
        });
    }
  };

  const { mode, setMode } = useSetIndexFiltersMode();

  const tableConfig = {
    resourceName: {
      singular: "Subscription Plan",
      plural: "Subscription Plan",
    },
    headings: [
      {
        title: t(`${i18nPrefix}.table.name`),
        key: "name",
        render: (value: any, item: any) => (
          <div
            className="w-36 cursor-pointer hover:underline"
            onClick={() => handleGoEdit(item.id)}
          >
            <Text variant="bodyMd" fontWeight="bold" as="span" truncate>
              {value}
            </Text>
          </div>
        ),
      },
      {
        title: t(`${i18nPrefix}.table.description`),
        key: "description",
        render: (value: any) => (
          <div className="w-36">
            <Text variant="bodyMd" fontWeight="regular" as="span" truncate>
              {value}
            </Text>
          </div>
        ),
      },
      {
        title: t(`${i18nPrefix}.table.company-location`),
        key: "companyLocation",
        render: (value: any, item: any) => (
          <div>
            <Text variant="bodyMd" fontWeight="regular" as="span">
              {`${item?.companyLocation?.name} - ${item?.companyLocation?.externalId || extractIdFromGid(item?.companyLocation?.id, "CompanyLocation")}`}
            </Text>
          </div>
        ),
      },
      {
        title: t(`${i18nPrefix}.table.products`),
        key: "products",
        render: (value: any, item: any) => {
          const length = item?.lineCount || 1;
          const plural = length > 1 ? "products" : "product";
          return (
            <Text variant="bodyMd" fontWeight="regular" as="span">
              {t(`${i18nPrefix}.table.${plural}-count`, {
                count: length,
              })}
            </Text>
          );
        },
      },
      {
        title: t(`${i18nPrefix}.table.frequency`),
        key: "frequency",
        render: (value: any, item: any) => {
          const length = item?.frequencyCount || 1;
          const plural = length > 1 ? "frequencies" : "frequency";
          if (
            item?.frequencyCount === 1 &&
            item?.deliveryPolicies?.[0]?.intervalValue
          ) {
            return formatSubscriptionFrequencyText(
              [
                {
                  interval: _.toString(
                    item?.deliveryPolicies?.[0]?.intervalValue || 0,
                  ),
                  unit: item?.deliveryPolicies?.[0]?.intervalUnit || "weekly",
                },
              ],
              t,
            );
          }
          return (
            <Text variant="bodyMd" fontWeight="regular" as="span">
              {t(`${i18nPrefix}.table.${plural}-count`, {
                count: length,
              })}
            </Text>
          );
        },
      },
      {
        title: t(`${i18nPrefix}.table.discount`),
        key: "discountDisplay",
        render: (value: any, item: any) => {
          return (
            <Text variant="bodyMd" fontWeight="regular" as="span">
              {value}
            </Text>
          );
        },
      },

      {
        title: "",
        key: "",
        render: (value: any, item: any) => (
          <InlineStack gap={"200"} align="center" blockAlign="center">
            <Button
              variant="plain"
              size="slim"
              onClick={() => {
                setDeletePlanId(item.id);
                setModalOpen(true);
              }}
            >
              <div className="underline font-bold">
                {t(`${i18nPrefix}.table.action.delete`)}
              </div>
            </Button>
          </InlineStack>
        ),
      },
    ],
  };

  const tableHeadings = tableConfig.headings.map(({ title }) => ({ title }));

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      data?.map((item) => ({ id: String(item?.id) })) || [],
    );
  const rowMarkup = useMemo(() => {
    if (!data) return [];
    if (data?.length === 0) return [];

    return data.map((item, index) => {
      return (
        <IndexTable.Row
          key={item.id}
          id={String(item.id)}
          selected={selectedResources.includes(String(item.id))}
          position={index}
        >
          {tableConfig.headings.map((heading) => (
            <IndexTable.Cell key={heading.key}>
              {heading.render(item[heading.key as keyof typeof item], item)}
            </IndexTable.Cell>
          ))}
        </IndexTable.Row>
      );
    });
  }, [data, tableConfig.headings, selectedResources]);

  const emptyStateMarkup = (
    <EmptySearchResult
      title={t(`${i18nPrefix}.table.no-subscription-plans-found`)}
      description={t(`${i18nPrefix}.table.create-subscription-plan`)}
      withIllustration
    />
  );

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

  const handleOnSort = (value: string[]) => {
    setSortSelected(value);
    const sort = value[0].split(" ");
    setParams((prev) => ({
      ...prev,
      sort: [
        {
          field: sort[0] as "createdAt" | "updatedAt",
          direction: sort[1] as "asc" | "desc",
        },
      ],
    }));
  };

  if (breadcrumbRoute.length !== 0) {
    return (
      <>
        <Outlet />
        <Scripts />
      </>
    );
  }

  return (
    <Page
      title={t(`${i18nPrefix}.title`)}
      primaryAction={
        <Button
          variant="primary"
          onClick={() => {
            navigate("/app/subscription-plan/create");
          }}
        >
          {t(`${i18nPrefix}.action.create-new-plan`)}
        </Button>
      }
    >
      <Modal
        open={modalOpen}
        title={t(`${i18nPrefix}.modal.delete-plan.title-singular`)}
        primaryAction={{
          loading: isDeletingPlan,
          content: t(`${i18nPrefix}.modal.delete-plan.confirm`),
          onAction: handleDeletePlan,
        }}
        secondaryActions={[
          {
            content: t(`${i18nPrefix}.modal.delete-plan.cancel`),
            onAction: () => {
              setModalOpen(false);
            },
          },
        ]}
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <div className="p-6">
          <div className="text-gray-600 mb-2">
            {t(`${i18nPrefix}.modal.delete-plan.description`)}
          </div>
        </div>
      </Modal>
      <div className="flex justify-end mb-4">
        <ChangeLanguageSelector />
      </div>
      <Card>
        <div className="mb-4">
          <SubscriptionPlanFilter onFilter={handleFilter} />
        </div>
        <IndexFilters
          mode={mode}
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          setMode={setMode}
          onSort={handleOnSort}
          onQueryChange={() => {}}
          onQueryClear={() => {}}
          selected={0}
          tabs={[
            {
              content: t(`${i18nPrefix}.filter.tabs.all`),
              id: "all",
            },
          ]}
          hideFilters
          hideQueryField
          canCreateNewView={false}
          filters={[]}
          onClearAll={() => {}}
        ></IndexFilters>
        <IndexTable
          selectable={false}
          loading={isSubscriptionPlanLoading}
          resourceName={tableConfig.resourceName}
          itemCount={subscriptionPlanData?.totalCount || 0}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          emptyState={emptyStateMarkup}
          onSelectionChange={handleSelectionChange}
          headings={tableHeadings as NonEmptyArray<IndexTableHeading>}
          promotedBulkActions={[
            {
              content: t(`${i18nPrefix}.action.delete-plan`),
              onAction: () => {
                setModalOpen(true);
              },
            },
          ]}
        >
          {rowMarkup}
        </IndexTable>
        {_.toNumber(subscriptionPlanData?.totalCount || 0) > 0 && (
          <CustomPagination
            paginationText={
              <div className="flex items-center">
                {t(`${i18nPrefix}.pagination.total-records`, {
                  count: subscriptionPlanData?.totalCount || 0,
                })}
              </div>
            }
            currentPage={params.pagination?.page || 1}
            totalPages={
              subscriptionPlanData?.totalCount
                ? Math.ceil(
                    subscriptionPlanData?.totalCount /
                      (params.pagination?.pageSize || 10),
                  )
                : 0
            }
            itemsPerPage={params.pagination?.pageSize || 10}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </Card>
    </Page>
  );
}
