import { useParams } from "@remix-run/react";
import { useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { CustomPagination } from "~/components/common/CustomPagination";
import { FilterValues } from "~/components/common/DynamicFilterBuilder";
import { DynamicFilterBuilderHeaderControlButton } from "~/components/common/DynamicFilterBuilderHeader";
import {
  DesktopDynamicFilterV2,
  MobileDynamicFilterV2,
} from "~/components/common/DynamicFilterV2";
import { ShoppingListAggregationCard } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListAggregationCard";
import { ShoppingListDetailMobileTableHead } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListDetailMobileTableHead";
import { ShoppingListDetailActions } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListsDetailAction";
import { ShoppingListDetailHeader } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListsDetailHeader";
import { ShoppingListDetailProductCard } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListsDetailProductCard";
import { ShoppingListDetailProductTable2 } from "~/components/shopping-lists/shopping-lists-detail/ShoppingListsDetailProductTable2";
import { Separator } from "~/components/ui/separator";
import {
  shoppingListItemsFilterConfig,
  ShoppingListItemsFilterType,
} from "~/config/filterConfig";
import {
  QUERY_ALL_SHOPPING_LISTS,
  QUERY_SHOPPING_LIST_AGGREGATION,
} from "~/constant/react-query-keys";
import { useCustomerPartnerNumberBySku } from "~/hooks/use-product-search";
import {
  useDeleteShoppingListItems,
  useGetShoppingListItems,
  useUpdateShoppingListItems,
} from "~/hooks/use-shopping-lists";
import { isEmptyFilterInput } from "~/lib/filter";
import { useShopifyInformation } from "~/lib/shopify";
import { DynamicFilterValueTypes, FilterTag } from "~/types/filter";
import {
  ShoppingListItem,
  ShoppingListWithItems,
  UpdateShoppingListItem,
} from "~/types/shopping-lists/shopping-list-items.schema";
import { useTranslation } from "react-i18next";
import Decimal from "decimal.js";

export default function ShoppingListDetails() {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const [nowDeleting, setNowDeleting] = useState<number[]>([]);

  const { id } = useParams();

  const {
    shopifyCustomerId,
    shopifyCompanyLocationId,
    shopifyCompanyId,
    storeName,
  } = useShopifyInformation();

  const { mutateAsync: getShoppingListItems, isPending } =
    useGetShoppingListItems();

  const [detail, setDetail] = useState<ShoppingListWithItems>();
  const { data: customerPartnerNumberBySku } = useCustomerPartnerNumberBySku({
    storeName,
    companyId: shopifyCompanyId,
    skuIds: detail?.listItems?.map((item) => item.skuId) || [],
  });

  const [filters, setFilters] = useState<FilterValues>({
    productName: "",
    skuId: "",
  });

  const fetchShoppingListItems = async () => {
    if (!id) return;
    getShoppingListItems({
      storeName,
      customerId: shopifyCustomerId,
      companyLocationId: shopifyCompanyLocationId,
      pagination: {
        page: detail?.page || 1,
        pageSize: detail?.pageSize || 10,
      },
      shoppingListId: Number(id),
      sort: [
        {
          field: "createdAt",
          order: "desc",
        },
      ],
      filters,
    })
      .then((res) => {
        if (
          res.shoppingList?.listItems?.length === 0 &&
          (detail?.page || 1) > 1
        ) {
          handlePageChange((detail?.page || 1) - 1);
          return;
        }
        setDetail(res.shoppingList);
      })
      .catch((err) => {
        toast.error(t("shopping-list.detail.get-items-failed"));
      })
      .finally(() => {
        setSelectedItems([]);
        setNowDeleting([]);
        setModalItemIds([]);
        setShowDeleteDialog(false);
      });
  };

  const handlePageChange = (page: number) => {
    setSelectedItems([]);
    setDetail({ ...detail, page });
  };

  const handleItemsPerPageChange = (pageSize: number) => {
    setSelectedItems([]);
    setDetail({ ...detail, pageSize, page: 1 });
  };

  const { mutateAsync: updateShoppingListItems, isPending: isUpdating } =
    useUpdateShoppingListItems();

  const { mutateAsync: deleteShoppingListItems, isPending: isDeleting } =
    useDeleteShoppingListItems();

  const debouncedUpdate = useCallback(
    _.debounce(
      (itemId: number, quantity: number, newProducts: ShoppingListItem[]) => {
        const product = newProducts.find((p) => p.id === itemId);
        if (!product) return;

        const listItems: UpdateShoppingListItem[] = [
          {
            id: product.id,
            productId: product.productId,
            productVariantId: product.productVariantId,
            productName: product.productName,
            updatedAt: product.updatedAt,
            skuId: product.skuId,
            productImageUrl: product.productImageUrl,
            url: product.url,
            customerPartnerNumber: product.customerPartnerNumber,
            quantity,
          },
        ];

        updateShoppingListItems({
          storeName,
          customerId: shopifyCustomerId,
          companyLocationId: shopifyCompanyLocationId,
          shoppingListId: Number(id),
          companyId: shopifyCompanyId,
          data: {
            listItems,
          },
        })
          .then((res) => {
            toast.success(
              t("shopping-list.detail.update-quantity-success", {
                productName: product.productName,
              }),
            );
            queryClient.invalidateQueries({
              queryKey: [QUERY_ALL_SHOPPING_LISTS],
            });
            queryClient.invalidateQueries({
              queryKey: [QUERY_SHOPPING_LIST_AGGREGATION],
            });
          })
          .catch((err) => {
            console.error("update quantity error", err);
            toast.error(
              t("shopping-list.detail.update-quantity-failed", {
                productName: product.productName,
              }),
            );
            fetchShoppingListItems();
          });
      },
      500,
    ),
    [id],
  );

  const handleUpdateQuantity = (itemId: number, quantity: number) => {
    const newProducts = detail?.listItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          subtotal: Decimal.mul(item.price, quantity).toNumber(),
        };
      }
      return item;
    });
    setDetail({ ...detail, listItems: newProducts || [] });
    debouncedUpdate(itemId, quantity, newProducts || []);
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modalItemIds, setModalItemIds] = useState<number[]>([]);

  const queryClient = useQueryClient();
  const handleOpenDeleteDialog = (itemIds: number[], skipModal?: boolean) => {
    setModalItemIds(itemIds);
    if (!skipModal) {
      setShowDeleteDialog(true);
    } else {
      handleDeleteShoppingListItems(itemIds, true);
    }
  };

  const handleDeleteShoppingListItems = async (
    itemId: number[],
    skipToast?: boolean,
  ) => {
    // for each item id, set the nowDeleting state to true
    setNowDeleting(itemId);
    deleteShoppingListItems({
      storeName,
      customerId: shopifyCustomerId,
      shoppingListId: Number(id),
      listItems: itemId,
    })
      .then((res) => {
        if (!skipToast) {
          toast.success(t("shopping-list.detail.remove-items-success"));
        }
        setSelectedItems([]);
        fetchShoppingListItems();
        setShowDeleteDialog(false);
        queryClient.invalidateQueries({
          queryKey: [QUERY_ALL_SHOPPING_LISTS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_SHOPPING_LIST_AGGREGATION],
        });
      })
      .catch((err) => {
        setNowDeleting([]);
        toast.error(t("shopping-list.detail.remove-items-failed"));
      });
  };

  useEffect(() => {
    fetchShoppingListItems();
  }, [id, detail?.page, filters]);

  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const handleSearch = (filters: FilterValues) => {
    setFilters(filters);
    setSelectedItems([]);
    setDetail({ ...detail, page: 1 });
  };

  const [filterValue, setFilterValue] = useState<
    Record<ShoppingListItemsFilterType, DynamicFilterValueTypes>
  >({
    productName: "",
    skuId: "",
    customerPartnerNumber: "",
  });

  const handleApplyV2 = (
    filterValue: Record<ShoppingListItemsFilterType, DynamicFilterValueTypes>,
  ) => {
    const filters = {
      ...isEmptyFilterInput("productName", filterValue.productName as string),
      ...isEmptyFilterInput("skuId", filterValue.skuId as string),
      ...isEmptyFilterInput(
        "customerPartnerNumber",
        filterValue.customerPartnerNumber as string,
      ),
    };
    handleSearch(filters);
  };

  const handleClearV2 = () => {
    handleSearch({});
  };

  const handleRemoveFilterV2 = (
    tag: FilterTag<ShoppingListItemsFilterType>,
    filterValue: Record<ShoppingListItemsFilterType, DynamicFilterValueTypes>,
  ) => {
    const filters = {
      ...isEmptyFilterInput("productName", filterValue.productName as string),
      ...isEmptyFilterInput("skuId", filterValue.skuId as string),
    };
    handleSearch(filters);
  };

  const filterConfig = shoppingListItemsFilterConfig();

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4">
      <div className="flex-1">
        {/* header */}
        {detail && (
          <>
            <ShoppingListDetailHeader
              detail={detail}
              shoppingListId={Number(id)}
              setDetail={setDetail}
            />
            <div className="flex items-center gap-2 py-5 justify-between lg:justify-start">
              <DynamicFilterBuilderHeaderControlButton
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                setShowMobileFilter={setShowMobileFilter}
              />
              <Separator
                orientation="vertical"
                className="app-hidden lg:block"
              />
              <span className="text-sm text-main-text-color">
                <span className="font-bold">{detail?.totalCount || 0}</span>{" "}
                {t("shopping-list.detail.total-items")}
              </span>
            </div>

            {showFilters && (
              <DesktopDynamicFilterV2
                onSearch={handleApplyV2}
                onClearAllFilters={handleClearV2}
                onRemoveFilter={handleRemoveFilterV2}
                filterConfig={filterConfig}
                filterValue={filterValue}
                setFilterValue={setFilterValue}
              />
            )}

            {showMobileFilter && (
              <MobileDynamicFilterV2
                isOpen={showMobileFilter}
                onClose={() => setShowMobileFilter(false)}
                onMobileApply={handleApplyV2}
                filterConfig={filterConfig}
                filterValue={filterValue}
                setFilterValue={setFilterValue}
              />
            )}
          </>
        )}

        {/* product table */}
        <div className="app-hidden lg:block mt-4">
          <ShoppingListDetailProductTable2
            listId={id as string}
            products={detail?.listItems || []}
            selectedItems={selectedItems}
            onSelectItems={setSelectedItems}
            onUpdateQuantity={handleUpdateQuantity}
            onDeleteItems={(itemIds, skipModal) => {
              handleOpenDeleteDialog(itemIds, skipModal);
            }}
            isDeleting={isDeleting}
            nowDeleting={nowDeleting}
            isLoading={isPending}
            customerPartnerNumberBySku={
              customerPartnerNumberBySku?.customerPartnerNumberDetails || []
            }
          />
        </div>

        <div className="block lg:hidden space-y-[10px]">
          <ShoppingListDetailMobileTableHead
            shoppingListId={Number(id)}
            selectedItems={selectedItems}
            onSelectItems={setSelectedItems}
            products={detail?.listItems || []}
            onDeleteItems={(itemIds, skipModal) =>
              handleOpenDeleteDialog(itemIds, skipModal)
            }
            isDeleting={isDeleting}
          />
          {isPending ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : detail?.listItems.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-sm text-gray-300">
                {t("shopping-list.detail.no-items-found")}
              </p>
            </div>
          ) : (
            detail?.listItems.map((product) => (
              <ShoppingListDetailProductCard
                customerPartnerNumberBySku={
                  customerPartnerNumberBySku?.customerPartnerNumberDetails || []
                }
                key={product.id}
                product={product}
                onUpdateQuantity={handleUpdateQuantity}
                onDeleteItems={(itemIds, skipModal) =>
                  handleOpenDeleteDialog(itemIds, skipModal)
                }
                isDeleting={isDeleting}
                nowDeleting={nowDeleting}
                selectedItems={selectedItems}
                onSelectItems={setSelectedItems}
              />
            ))
          )}
        </div>

        <ShoppingListDetailActions
          selectedItems={selectedItems}
          products={detail?.listItems || []}
        />

        {/* pagination */}
        {(detail?.totalCount || 0) > 10 && (
          <CustomPagination
            currentPage={detail?.page || 1}
            totalPages={Math.ceil(
              (detail?.totalCount || 0) / (detail?.pageSize || 10),
            )}
            onPageChange={handlePageChange}
            itemsPerPage={detail?.pageSize || 10}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      {/* aggregation card */}
      {/* <ShoppingListAggregationCard
        shoppingListId={id as string}
        totalListItemsCount={detail?.totalCount || 0}
      /> */}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t("shopping-list.detail.confirm-delete-items-title")}
        description={t(
          "shopping-list.detail.confirm-delete-items-description",
          {
            count: modalItemIds.length,
            itemText:
              modalItemIds.length === 1
                ? t("common.text.item")
                : t("common.text.items"),
          },
        )}
        onCancel={() => {
          setModalItemIds([]);
          setShowDeleteDialog(false);
        }}
        onOK={() => handleDeleteShoppingListItems(modalItemIds)}
        okText="Delete"
        okDisabled={isDeleting}
        okLoading={isDeleting}
      />
    </div>
  );
}
