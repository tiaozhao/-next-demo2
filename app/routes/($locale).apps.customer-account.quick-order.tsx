import { zodResolver } from "@hookform/resolvers/zod";
import _ from "lodash";
import { useEffect, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { Card } from "~/components/ui/card";
import { Form } from "~/components/ui/form";

import { QuickOrderListHead } from "~/components/quick-order/QuickOrderListHead";
import type { QuickOrderFormSchema } from "~/types/quick-order";
import { quickOrderFormSchema } from "~/types/quick-order";

import { QuickOrderActionButtons } from "~/components/quick-order/QuickOrderActionButtons";
import { QuickOrderSlider } from "~/components/quick-order/QuickOrderSlider";
import { useAddToCartAjax } from "~/hooks/use-cart";
import {
  createEmptyProductLine,
  extractVariantId,
  filterValidLines,
  getExistingLineWhenSelectProduct,
  getValidQuantity,
  initialProductLines,
} from "~/lib/quick-order";
import type { CartInput } from "~/types/cart";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { QuickOrderListActions } from "~/components/quick-order/QuickOrderActions";
import { QuickOrderMobileList } from "~/components/quick-order/QuickOrderMobileList";
import { QuickOrderTable } from "~/components/quick-order/QuickOrderTable";
import { useShopifyInformation } from "~/lib/shopify";

export default function QuickOrderRoute() {
  const [showWarning, setShowWarning] = useState(false);

  const { storeName } = useShopifyInformation();

  // Initialize form
  const form = useForm<QuickOrderFormSchema>({
    resolver: zodResolver(quickOrderFormSchema),
    // defaultValues: {
    //   productLines: initialProductLines(),
    // },
  });

  useEffect(() => {
    form.setValue("productLines", initialProductLines());
  }, []);

  // Add more lines
  const addMoreLines = () => {
    const currentLines = form.getValues("productLines");

    const lineId = _.uniqueId("product_");
    form.setValue("productLines", {
      ...currentLines,
      [lineId]: createEmptyProductLine(),
    });
  };

  // Remove line
  const removeLine = (id: string) => {
    const currentLines = form.getValues("productLines");
    const { [id]: removed, ...updatedLines } = currentLines;
    form.setValue("productLines", updatedLines);
  };

  // Select product
  const selectProduct = (
    product: QuickOrderFormSchema["productLines"][string]["product"],
    lineId: string,
  ) => {
    const existingLine = getExistingLineWhenSelectProduct(
      form.getValues("productLines"),
      product?.sku,
    );
    if (existingLine) {
      const [existingLineId, existingLineData] = existingLine;

      const newQuantity = getValidQuantity(
        existingLineData?.quantity || 0,
        product.quantityRule?.increment || 1,
        true,
      );

      form.setValue("productLines", {
        ...form.getValues("productLines"),
        [existingLineId]: {
          ...existingLineData,
          quantity: newQuantity,
        },
        [lineId]: createEmptyProductLine(),
      });

      return;
    }

    form.setValue(`productLines.${lineId}`, {
      product: {
        id: product.id,
        variantId: product.variantId,
        name: `${extractVariantId(product.sku || "")}-${product.name}`,
        originalName: product.name,
        sku: product.sku,
        price: product.price,
        uom: product.uom,
        description: product.description,
        quantityAvailable: product.quantityAvailable,
        image: product.image,
        updatedAt: product.updatedAt,
        onlineStoreUrl: product.handle
          ? `${storeName}/products/${product.handle}`
          : "",
        quantityRule: product.quantityRule,
      },
      quantity: product.quantityRule?.minimum || 1,
      selectedUom: product?.uom?.[0] || "",
    });
  };

  const { mutateAsync: addToCartAjax, isPending: isAddingToCart } =
    useAddToCartAjax();
  // Create order
  const addToCart = async (
    values: (QuickOrderFormSchema["productLines"][string] & {
      lineId: string;
    })[],
  ) => {
    const lines: CartInput["lines"] = [];

    values.forEach((line) => {
      if (line.product.variantId) {
        lines.push({
          merchandiseId: line.product.variantId,
          quantity: line?.quantity || 0,
        });
      }
    });

    const goToCart = () => {
      window.location.href = `https://${storeName}/cart`;
    };

    const successToast = () => {
      toast.success("Success", {
        description: (
          <div className="flex flex-col gap-1">
            <span>
              {t("quick-order.table.add-to-cart-success", {
                count: values.length,
              })}
            </span>
            <div
              onClick={goToCart}
              className="text-primary hover:underline cursor-pointer"
            >
              {t("quick-order.table.view-cart")}
            </div>
          </div>
        ),
      });
    };

    const errorToast = (msg?: string) => {
      toast.error(`Failed to add to cart ${msg ? `: ${msg}` : ""}`);
    };

    addToCartAjax(
      lines.map((line) => ({
        id: Number(extractVariantId(line.merchandiseId)),
        quantity: line?.quantity || 0,
      })),
    )
      .then((res) => {
        if (res?.status === 422) {
          errorToast(
            `${res?.message} ${t("quick-order.table.add-to-cart-error-description")}`,
          );
          return;
        }
        if (res?.items) {
          localStorage.removeItem("quick-order-success-lines");
          successToast();
        } else {
          console.error("addToCartAjax ~ res:", res);
          errorToast();
        }
        return;
      })
      .catch((err) => {
        console.error("addToCartAjax ~ err:", err);
        errorToast();
      });
  };

  const validateLines = (values: QuickOrderFormSchema) => {
    setShowWarning(false);
    const { successLines, errorLines } = filterValidLines(values);

    if (errorLines.length > 0) {
      errorLines.forEach((line) => {
        if (line.product.variantId) {
          form.setError(`productLines.${line.lineId}.quantity`, {
            message: line?.msg || "Invalid quantity",
          });
        }
      });

      toast.error(t("quick-order.table.add-to-cart-error-description"));
      return false;
    }

    if (successLines.length === 0) {
      setShowWarning(true);
      toast.error(t("quick-order.table.add-to-cart-error-description"));
      return false;
    }

    form.clearErrors();

    return successLines;
  };

  const handleAddToList = () => {
    setShowWarning(false);
    const lines = Object.values(form.getValues("productLines")).filter(
      (line) => line.product.variantId,
    );
    if (lines.length === 0) {
      setShowWarning(true);
      toast.error(t("quick-order.table.add-to-cart-warning"));
      return false;
    }
    const validateLinesResult = validateLines(form.getValues());
    if (!validateLinesResult) {
      return false;
    }

    return true;
  };

  const validateSuccess = (values: QuickOrderFormSchema) => {
    const successLines = validateLines(values);

    if (!successLines) {
      return false;
    }

    form.clearErrors();
    addToCart(successLines);
  };

  const validateError = (errors: FieldErrors<QuickOrderFormSchema>) => {
    console.error("validateError ~ errors:", errors);
  };

  const { t } = useTranslation();

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4 lg:mb-5">
        {t("quick-order.page-title")}
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
        <FormProvider {...form}>
          <Card className="lg:px-6 lg:py-4 lg:col-span-2 bg-white lg:bg-gray-50 shadow-none border-0 rounded-lg">
            <QuickOrderListHead showWarning={showWarning} />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(validateSuccess, validateError)}
                id="quick-order-form"
              >
                <div className="bg-white lg:border lg:rounded-sm lg:shadow-custom">
                  <QuickOrderTable
                    form={form}
                    selectProduct={selectProduct}
                    removeLine={removeLine}
                  />

                  <QuickOrderMobileList
                    form={form}
                    selectProduct={selectProduct}
                    removeLine={removeLine}
                  />

                  <QuickOrderListActions
                    form={form}
                    onAddMoreLines={addMoreLines}
                    isLoadingProductVariants={false}
                  />
                </div>
                <QuickOrderActionButtons
                  values={form.getValues("productLines")}
                  onAddToCart={form.handleSubmit(
                    validateSuccess,
                    validateError,
                  )}
                  onAddToList={handleAddToList}
                  isLoading={isAddingToCart}
                />
                <div className="h-[1px] bg-border !mt-8 lg:hidden" />
              </form>
            </Form>
          </Card>
          <QuickOrderSlider />
        </FormProvider>
      </div>
    </div>
  );
}
