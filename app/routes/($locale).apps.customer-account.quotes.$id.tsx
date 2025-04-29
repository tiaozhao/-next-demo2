import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "@remix-run/react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Decimal from "decimal.js";
import _ from "lodash";
import { useEffect, useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { QuoteDetailActionCard } from "~/components/request-for-quotes/detail/QuoteDetailActionCard";
import QuoteDetailAddProductButton from "~/components/request-for-quotes/detail/QuoteDetailAddProductButton";
import QuoteDetailHeader from "~/components/request-for-quotes/detail/QuoteDetailHeader";
import QuoteDetailInformationCard from "~/components/request-for-quotes/detail/QuoteDetailInformationCard";
import { QuoteDetailProductCard } from "~/components/request-for-quotes/detail/QuoteDetailProductCard";
import QuoteDetailProductTable from "~/components/request-for-quotes/detail/QuoteDetailProductTable";
import {
  QUERY_QUOTES_BY_ID,
  QUERY_QUOTES_LIST,
} from "~/constant/react-query-keys";
import { useCustomerPartnerNumberBySkuMutation } from "~/hooks/use-product-search";
import { useGetQuoteById, useUpdateQuoteItems } from "~/hooks/use-quotes";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import {
  RESUBMIT_QUOTE_ITEMS_STORAGE_KEY,
  setNewCloneDataWhileAddProduct,
  updateValidLines,
} from "~/lib/quote";
import {
  QuoteDetailInformationFormData,
  QuoteDetailInformationSchemaFunction,
} from "~/lib/schema/request-for-quote.schema";
import { useShopifyInformation } from "~/lib/shopify";
import { formatPrice, handlePrint } from "~/lib/utils";
import { QuickOrderFormSchema } from "~/types/quick-order";
import { UpdateQuoteItemsRequest, QuoteWithCustomer } from "~/types/quotes/quote.schema";

export default function QuoteDetail() {
  const { t } = useTranslation();
  const { addLocalePath } = useAddLocalePath();
  const {
    storeName,
    shopifyCustomerId,
    shopifyCompanyLocationId,
    shopifyCompanyId,
  } = useShopifyInformation();
  const { id } = useParams();
  const { data, isLoading, error } = useGetQuoteById({
    quoteId: Number(id),
    storeName: storeName,
    companyLocationId: shopifyCompanyLocationId,
    customerId: shopifyCustomerId,
  });

  useEffect(() => {
    if (error) {
      navigate(addLocalePath("/apps/customer-account/quotes"));
    }
  }, [error]);

  const type = data?.status === "Submitted" ? "edit" : "view";

  const [cloneData, setCloneData] = useState<QuoteWithCustomer | null>(null);

  const showWhichNotes = () => {
    if (cloneData?.notes) {
      const filterData = cloneData?.notes?.filter(
        (note) => note.noteType === cloneData?.status,
      );
      return filterData[0];
    }
    return "";
  };

  const { mutateAsync: updateQuoteItems, isPending: isItemUpdaing } =
    useUpdateQuoteItems();

  const queryClient = useQueryClient();

  const QuoteDetailInformationSchema = QuoteDetailInformationSchemaFunction();
  const form = useForm<QuoteDetailInformationFormData>({
    resolver: zodResolver(QuoteDetailInformationSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (data) {
      const newData = {
        ...data,
        quoteItems: data?.quoteItems?.map((item) => ({
          ...item,
          offerPriceShow: formatPrice(
            item.offerPrice,
            data?.currencyCode || "USD",
            true,
          ),
          type: "data",
        })),
      };
      setCloneData(newData);
      form.setValue(
        "notes",
        data?.notes?.filter((note) => note.noteType === data?.status)?.[0]
          ?.noteContent,
      );
      form.setValue("poNumber", data?.poNumber);
      form.setValue(
        "expirationDate",
        data?.expirationDate ? new Date(data?.expirationDate) : undefined,
      );
    }
  }, [data]);

  const handleUpdateItems = (
    newQuoteItems: QuoteWithCustomer["quoteItems"],
  ) => {
    const { errorLines, successLines } = updateValidLines(newQuoteItems, {
      enableQuantityRule: true,
      enableAvailableQuantity: true,
    });

    if (errorLines.length > 0) {
      toast.error(
        t("request-for-quote.detail.action-card.submit-action.update-error"),
        {
          description: (
            <div className="flex flex-col gap-1">
              {errorLines.map((item) => (
                <div key={item.errorId}>{item.error}</div>
              ))}
            </div>
          ),
        },
      );
      return;
    }

    const newItems = successLines?.map((item) => ({
      productId: item?.variant?.product?.id,
      variantId: item?.variant?.id,
      quantity: item.quantity,
      originalPrice: _.toNumber(item.originalPrice),
      offerPrice: _.toNumber(item.offerPrice),
    }));

    const params: UpdateQuoteItemsRequest = {
      storeName: storeName,
      quoteId: Number(id),
      companyLocationId: shopifyCompanyLocationId,
      customerId: shopifyCustomerId,
      quoteItems: newItems,
      expirationDate: form.getValues("expirationDate")?.toISOString(),
      poNumber: form.getValues("poNumber"),
      note: {
        id: showWhichNotes()?.id,
        content: form.getValues("notes"),
      },
    };

    updateQuoteItems(params)
      .then((res) => {
        if (res?.success) {
          toast.success(
            t(
              "request-for-quote.detail.action-card.submit-action.update-success",
            ),
          );
          queryClient.invalidateQueries({
            queryKey: [QUERY_QUOTES_LIST],
          });
          queryClient.invalidateQueries({
            queryKey: [QUERY_QUOTES_BY_ID, { quoteId: Number(id) }],
          });
        } else {
          toast.error(res?.message);
        }
      })
      .catch((err) => {
        toast.error(err?.message);
        console.error(err);
      });
  };

  const handleUpdateQuantity = (itemId: number, quantity: number) => {
    const newQuoteItems = cloneData?.quoteItems?.map((item) =>
      item.id === itemId ? { ...item, quantity } : item,
    );
    const newSubtotal = newQuoteItems?.reduce(
      (acc, item) =>
        Decimal.add(
          acc,
          Decimal.mul(_.toNumber(item.offerPrice), item.quantity),
        ).toNumber(),
      0,
    );

    setCloneData({
      ...cloneData,
      quoteItems: newQuoteItems,
      subtotal: newSubtotal,
    });
    // debouncedUpdate(newQuoteItems);
  };

  const handleUpdateTargetPrice = (itemId: number, targetPrice: string) => {
    const newQuoteItems = cloneData?.quoteItems?.map((item) =>
      item.id === itemId
        ? {
          ...item,
          offerPrice: _.toNumber(targetPrice),
          offerPriceShow: targetPrice,
        }
        : item,
    );
    const newSubtotal = newQuoteItems?.reduce(
      (acc, item) =>
        Decimal.add(
          acc,
          Decimal.mul(_.toNumber(item.offerPrice), item.quantity),
        ).toNumber(),
      0,
    );
    setCloneData({
      ...cloneData,
      quoteItems: newQuoteItems,
      subtotal: newSubtotal,
    });
    // debouncedUpdate(newQuoteItems);
  };

  const handleUpdateTargetPriceWhileBlur = (
    itemId: number,
    targetPrice: number,
  ) => {
    const newQuoteItems = cloneData?.quoteItems?.map((item) =>
      item.id === itemId
        ? {
          ...item,
          offerPrice: _.isNaN(_.toNumber(targetPrice))
            ? 0
            : _.toNumber(targetPrice),
          offerPriceShow: formatPrice(
            _.isNaN(_.toNumber(targetPrice)) ? 0 : _.toNumber(targetPrice),
            cloneData?.currencyCode || "USD",
            true,
          ),
        }
        : item,
    );
    const newSubtotal = newQuoteItems?.reduce(
      (acc, item) =>
        Decimal.add(
          acc,
          Decimal.mul(item.offerPrice, item.quantity),
        ).toNumber(),
      0,
    );
    setCloneData({
      ...cloneData,
      quoteItems: newQuoteItems,
      subtotal: newSubtotal,
    });
    // debouncedUpdate(newQuoteItems);
  };

  const handleFormSuccess = () => {
    handleUpdateItems(cloneData?.quoteItems);
  };

  const handleFormError = (
    errors: FieldErrors<QuoteDetailInformationFormData>,
  ) => {
    const errorMessages = Object.entries(errors).map(([key, value]) => {
      return value?.message;
    });
    toast.error(t("request-for-quote.detail.form.submit-error"), {
      description: (
        <div className="flex flex-col gap-1">
          {errorMessages.map((message, index) => (
            <div key={message}>
              {index + 1}. {message}
            </div>
          ))}
        </div>
      ),
    });
  };

  const handleSubmit = () => {
    form.handleSubmit(handleFormSuccess, handleFormError)();
  };
  const navigate = useNavigate();

  // resubmit request
  const handleResubmitRequest = () => {
    const params = {
      notes: cloneData?.notes?.filter(
        (note) => note.noteType === "Submitted",
      )?.[0]?.noteContent,
      poNumber: cloneData?.poNumber,
      currencyCode: cloneData?.currencyCode,
      quoteItems: (cloneData?.quoteItems || []).map((item) => ({
        sku: item.variant?.sku,
        quantity: item.quantity,
        offerPrice: item.offerPrice,
        originalPrice: item.originalPrice,
      })),
    };
    navigate(addLocalePath("/apps/customer-account/request-for-quote"), {
      state: {
        quoteItems: JSON.stringify(params),
      },
    });
    sessionStorage.setItem(
      RESUBMIT_QUOTE_ITEMS_STORAGE_KEY,
      JSON.stringify(params),
    );
  };

  const [deleteComfirmDialogOpen, setDeleteComfirmDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // remove item from quote
  const handleRemoveItem = () => {
    const newCloneData = cloneData?.quoteItems?.filter(
      (item) => item.id !== deleteItemId,
    );
    const newSubtotal = newCloneData?.reduce(
      (acc, item) => acc + item.offerPrice * item.quantity,
      0,
    );
    setCloneData({
      ...cloneData,
      quoteItems: newCloneData,
      subtotal: newSubtotal,
    });
    setDeleteComfirmDialogOpen(false);
  };
  const handleDeleteItem = (itemId: number, skipModal?: boolean) => {
    if (skipModal) {
      handleRemoveItem();
    } else {
      setDeleteComfirmDialogOpen(true);
      setDeleteItemId(itemId);
    }
  };

  const {
    mutateAsync: getCustomerPartnerNumber,
    isPending: isGetCustomerPartnerNumberLoading,
  } = useCustomerPartnerNumberBySkuMutation();

  // add product to quote item
  const handleAddProduct = (
    product: QuickOrderFormSchema["productLines"][string]["product"],
    lineId: string,
  ) => {
    if (!product?.sku) {
      toast.error("Invalid product");
      return;
    }
    const params = {
      skuIds: [product.sku],
      storeName: storeName,
      companyId: shopifyCompanyId,
    };

    getCustomerPartnerNumber(params)
      .then((res) => {
        setNewCloneDataWhileAddProduct(
          cloneData,
          setCloneData,
          res,
          lineId,
          product,
        );
      })
      .catch((err) => {
        toast.error(err?.message);
        console.error(err);
      });
  };

  return (
    <div className="print-section w-full space-y-5 pb-[44px]">
      <QuoteDetailHeader />

      <QuoteDetailInformationCard
        form={form}
        customerId={cloneData?.customer?.id || ""}
        isLoading={isLoading}
        id={cloneData?.id?.toString() || ""}
        status={cloneData?.status || ""}
        createdAt={
          cloneData?.createdAt ? format(cloneData?.createdAt, "MM/dd/yyyy") : ""
        }
        firstName={cloneData?.customer?.firstName || ""}
        lastName={cloneData?.customer?.lastName || ""}
        emailAddress={cloneData?.customer?.email || ""}
        phoneNumber={cloneData?.customer?.phone || ""}
        companyAccount={cloneData?.companyLocationDetails?.name || ""}
        notes={showWhichNotes()?.noteContent || ""}
        poNumber={cloneData?.poNumber || ""}
        handlePrint={handlePrint}
        type={type}
        // todo: change to cloneData?.expirationDate
        expirationDate={cloneData?.expirationDate || ""}
      />

      <QuoteDetailProductTable
        currencyCode={cloneData?.currencyCode || "USD"}
        products={cloneData?.quoteItems || []}
        isLoading={isLoading}
        onUpdateQuantity={handleUpdateQuantity}
        onDeleteItem={handleDeleteItem}
        onUpdateTargetPrice={handleUpdateTargetPrice}
        onUpdateTargetPriceWhileBlur={handleUpdateTargetPriceWhileBlur}
        type={type}
        className="no-print app-hidden lg:flex"
        isDeleting={false}
        onSelect={handleAddProduct}
      />

      <div className="no-print flex flex-col gap-5 lg:hidden">
        {cloneData?.quoteItems?.map((item) => (
          <QuoteDetailProductCard
            key={item.id}
            item={item}
            currencyCode={cloneData?.currencyCode || "USD"}
            isLoading={isLoading}
            onUpdateQuantity={handleUpdateQuantity}
            onDeleteItem={handleDeleteItem}
            onUpdateTargetPrice={handleUpdateTargetPrice}
            onUpdateTargetPriceWhileBlur={handleUpdateTargetPriceWhileBlur}
            type={data?.status === "Submitted" ? "edit" : "view"}
            className="no-print"
            isDeleting={false}
            onSelect={handleAddProduct}
          />
        ))}
        {cloneData?.quoteItems?.length === 0 && (
          <div className="flex items-center justify-center">
            <div className="text-sm text-gray-700">
              {t("request-for-quote.detail.table.empty-product-table")}
            </div>
          </div>
        )}
      </div>

      {/* just for print */}
      <QuoteDetailProductTable
        currencyCode={cloneData?.currencyCode || "USD"}
        products={cloneData?.quoteItems || []}
        isLoading={isLoading}
        onUpdateQuantity={handleUpdateQuantity}
        onDeleteItem={handleDeleteItem}
        onUpdateTargetPrice={handleUpdateTargetPrice}
        onUpdateTargetPriceWhileBlur={handleUpdateTargetPriceWhileBlur}
        type="view"
        className="app-hidden print-only"
        isDeleting={false}
        onSelect={handleAddProduct}
      />

      {data?.status === "Submitted" && (
        <QuoteDetailAddProductButton
          cloneData={cloneData}
          setCloneData={setCloneData}
          isGetCustomerPartnerNumberLoading={isGetCustomerPartnerNumberLoading}
        />
      )}

      <div className="flex justify-end">
        <QuoteDetailActionCard
          id={data?.id?.toString() || ""}
          status={data?.status}
          isLoading={isLoading}
          itemCount={
            cloneData?.quoteItems?.filter((item) => item?.type === "data")
              ?.length || 0
          }
          subtotal={cloneData?.subtotal || 0}
          currencyCode={cloneData?.currencyCode || "USD"}
          onItemUpdateSubmit={handleSubmit}
          isItemUpdaing={isItemUpdaing}
          onItemResubmitRequest={handleResubmitRequest}
          isGetCustomerPartnerNumberLoading={isGetCustomerPartnerNumberLoading}
        />
      </div>

      <ConfirmDialog
        open={deleteComfirmDialogOpen}
        onOpenChange={setDeleteComfirmDialogOpen}
        title={t("request-for-quote.detail.dialog.delete-item.title")}
        description={t(
          "request-for-quote.detail.dialog.delete-item.description",
        )}
        onOK={handleRemoveItem}
        onCancel={() => setDeleteComfirmDialogOpen(false)}
      />

      <div className="print-only app-hidden mt-4 text-right text-xs text-gray-500">
        {t("order-history.detail.printed-on")}:{" "}
        {format(new Date(), "MMMM d, yyyy HH:mm:ss")}
      </div>
    </div>
  );
}
