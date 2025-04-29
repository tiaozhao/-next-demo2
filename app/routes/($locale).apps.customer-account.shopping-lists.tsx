import { useEffect, useMemo, useState } from "react";
import ShoppingListCard from "~/components/shopping-lists/ShoppingListCard";
import ShoppingListsHeader from "~/components/shopping-lists/ShoppingListsHeader";
import type { ShoppingList, ShoppingListFilter } from "~/types";

import { Outlet, Scripts, useNavigate, useParams } from "@remix-run/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import type { FilterValues } from "~/components/common/DynamicFilterBuilder";
import ShoppingListsTable2 from "~/components/shopping-lists/ShoppingListsTable2";
import { QUERY_ALL_SHOPPING_LISTS } from "~/constant/react-query-keys";
import { useRouteBreadcrumbs } from "~/hooks/use-route-breadcrumbs";
import {
  useDeleteShoppingList,
  useGetAllShoppingLists,
  useUpdateShoppingList,
} from "~/hooks/use-shopping-lists";
import { useShopifyInformation } from "~/lib/shopify";
import { CustomPaginationNew } from "~/components/common/CustomPaginationNew";
import { useTranslation } from "react-i18next";
import { useAddLocalePath } from "~/hooks/utils.hooks";

export default function ShoppingListsRoute() {
  const { t } = useTranslation();
  const breadcrumbRoute = useRouteBreadcrumbs().slice(2);
  const { storeName, shopifyCustomerId, shopifyCompanyLocationId } =
    useShopifyInformation();
  const { locale } = useParams();
  const queryClient = useQueryClient();

  const itemsPerPageDefault = 10;
  const [params, setParams] = useState<ShoppingListFilter>({
    customerId: shopifyCustomerId,
    companyLocationId: shopifyCompanyLocationId,
    storeName,
    data: {
      filters: {},
      pagination: {
        page: 1,
        pageSize: itemsPerPageDefault,
      },
    },
  });

  const { data, isLoading, refetch, isRefetching } = useGetAllShoppingLists(
    params,
    breadcrumbRoute.length === 1,
  );

  useEffect(() => {
    if (!isLoading && !isRefetching && data?.shoppingLists.length === 0) {
      const prevPage = (params.data?.pagination?.page || 1) - 1;
      const newCurrentPage = prevPage > 0 ? prevPage : 1;
      setParams({
        ...params,
        data: {
          ...params.data,
          pagination: {
            pageSize: params.data?.pagination?.pageSize || itemsPerPageDefault,
            page: newCurrentPage,
          },
        },
      });
    }
  }, [data, isLoading, isRefetching]);

  const totalPages = useMemo(() => {
    return Math.ceil(
      (data?.totalCount ?? 0) / (data?.pageSize || itemsPerPageDefault),
    );
  }, [data]);

  const hasNextPage = useMemo(() => {
    return (data?.page || 1) < totalPages;
  }, [data?.page, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return (data?.page || 1) > 1;
  }, [data?.page]);

  const [deleteIds, setDeleteIds] = useState<ShoppingList["id"][]>([]);
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("batch");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const doSearch = (values: FilterValues) => {
    setParams({
      ...params,
      data: {
        ...params.data,
        filters: values,
        pagination: {
          ...params.data?.pagination,
          page: 1,
          pageSize: params.data?.pagination?.pageSize || itemsPerPageDefault,
        },
      },
    });
  };

  const doClear = () => {
    setParams({
      ...params,
      data: {
        ...params.data,
        filters: {},
        pagination: {
          ...params.data?.pagination,
          page: 1,
          pageSize: params.data?.pagination?.pageSize || itemsPerPageDefault,
        },
      },
    });
  };

  const { mutateAsync: deleteShoppingList, isPending: isDeleting } =
    useDeleteShoppingList();
  const { mutateAsync: updateShoppingList } = useUpdateShoppingList();
  const handleConfirmDelete = () => {
    const filter = {
      storeName,
      customerId: shopifyCustomerId,
      companyLocationId: shopifyCompanyLocationId,
    };
    try {
      deleteShoppingList({ id: deleteIds[0], ...filter }).then(() => {
        setShowDeleteDialog(false);
        setDeleteIds([]);
        queryClient.invalidateQueries({
          queryKey: [QUERY_ALL_SHOPPING_LISTS],
        });
        toast.success(t("shopping-list.list.delete-success"), {
          description: t("shopping-list.list.delete-success-description"),
        });
      });
    } catch (error) {
      toast.error(t("shopping-list.list.delete-failed"), {
        description: t("shopping-list.list.delete-failed-description"),
      });
    }
  };

  const handleBatchDelete = () => {
    if (deleteIds.length === 0) return;
    setDeleteMode("batch");
    setShowDeleteDialog(true);
  };

  const handleSingleDelete = (id: number) => {
    setDeleteIds([id]);
    setDeleteMode("single");
    setShowDeleteDialog(true);
  };

  const doSetAsDefault = (id: number) => {
    const filter = {
      storeName,
      customerId: shopifyCustomerId,
      companyLocationId: shopifyCompanyLocationId,
    };
    updateShoppingList({ id, ...filter, data: { isDefault: true } })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: [QUERY_ALL_SHOPPING_LISTS],
        });
        toast.success(t("shopping-list.list.set-default-success"), {
          description: t("shopping-list.list.set-default-success-description"),
        });
      })
      .catch(() => {
        toast.error(t("shopping-list.list.set-default-failed"), {
          description: t("shopping-list.list.set-default-failed-description"),
        });
      });
  };

  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  const handleEdit = (id: number, name: string) => {
    navigate(
      addLocalePath(
        `/apps/customer-account/shopping-lists/${id}?routeName=${encodeURIComponent(name)}`,
      ),
    );
    setTimeout(() => {
      setParams({
        ...params,
        data: { ...params.data, filters: {} },
      });
    }, 100);
  };

  return (
    <div className="w-full">
      {breadcrumbRoute.length === 1 ? (
        <>
          <div className="w-full">
            <ShoppingListsHeader
              onSearch={doSearch}
              onClear={doClear}
              onDelete={handleBatchDelete}
              refetch={refetch}
              totalItems={data?.totalCount}
            />

            {/* PC */}
            <div className="app-hidden lg:block">
              <ShoppingListsTable2
                isLoading={isLoading || isRefetching}
                shoppingLists={data?.shoppingLists ?? []}
                setDeleteIds={setDeleteIds}
                onDelete={handleSingleDelete}
                onSetAsDefault={doSetAsDefault}
                onEdit={handleEdit}
              />
            </div>

            {/* Mobile */}
            <div className="lg:hidden space-y-4">
              {data?.shoppingLists.map((list) => (
                <ShoppingListCard
                  key={list.id}
                  shoppingList={list}
                  onEdit={() => handleEdit(list.id, list.name)}
                  onDelete={() => handleSingleDelete(list.id)}
                  onSetAsDefault={() => doSetAsDefault(list.id)}
                />
              ))}
              {data?.shoppingLists.length === 0 && (
                <div className="text-center text-gray-500">
                  {t("shopping-list.list.no-lists-found")}
                </div>
              )}
            </div>

            {(data?.totalCount || 0) > 10 && (
              <CustomPaginationNew
                hasNextButton={hasNextPage}
                hasPreviousButton={hasPreviousPage}
                currentPage={params.data?.pagination?.page || 1}
                totalPages={totalPages}
                itemsPerPage={data?.pageSize || itemsPerPageDefault}
                onPageChange={(page) => {
                  setParams({
                    ...params,
                    data: {
                      ...params.data,
                      pagination: {
                        ...params.data?.pagination,
                        page,
                      },
                    },
                  });
                }}
                onItemsPerPageChange={(pageSize) => {
                  setParams({
                    ...params,
                    data: {
                      ...params.data,
                      pagination: {
                        ...params.data?.pagination,
                        pageSize,
                        page: 1,
                      },
                    },
                  });
                }}
              />
            )}

            <ConfirmDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              title={t("shopping-list.list.confirm-delete-title")}
              description={
                deleteMode === "single"
                  ? t("shopping-list.list.confirm-delete-description-single")
                  : t("shopping-list.list.confirm-delete-description-batch", {
                      count: deleteIds.length,
                    })
              }
              onCancel={() => setShowDeleteDialog(false)}
              onOK={handleConfirmDelete}
              okText={t("shopping-list.list.confirm-delete-ok-button")}
              okDisabled={isDeleting}
              okLoading={isDeleting}
            />
          </div>
        </>
      ) : (
        <>
          <Outlet />
          <Scripts></Scripts>
        </>
      )}
    </div>
  );
}
