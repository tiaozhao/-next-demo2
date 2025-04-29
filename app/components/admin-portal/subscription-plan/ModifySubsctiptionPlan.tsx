import { useTranslation } from "react-i18next";
import {
  Button,
  Form,
  FormLayout,
  InlineStack,
  PageActions,
  Spinner,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import _ from "lodash";
import {
  initFrequencies,
  SubscriptionPlanCustomerId,
  SubscriptionPlanDiscountTypeMap,
  validSubscriptionPlanForm,
} from "~/lib/subscription-plan";
import { toast } from "sonner";
import { SubscriptionPlanFields } from "./SubscriptionPlanFields";
import {
  SubscriptionPlanFrequencyUnit,
  SubscriptionPlanFormData,
  SubscriptionPlanFormDataError,
  SubscriptionPlanFrequencyOption,
  SubscriptionPlanProductOption,
  SubscriptionPlanDiscountType,
} from "~/types/subscription-plan.types";
import { QuickOrderFormSchema } from "~/types/quick-order";
import { formatPrice } from "~/lib/utils";
import {
  CreateSellingPlanRequest,
  DeliveryPolicy,
  SellingPlanWithLines,
} from "~/types/selling-plans/selling-plan.schema";
import {
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
} from "~/hooks/use-subscription-plan";
import { useQueryClient } from "@tanstack/react-query";
import {
  QUERY_ALL_SUBSCRIPTION_PLANS,
  QUERY_SUBSCRIPTION_PLAN_BY_ID,
} from "~/constant/react-query-keys";

interface ModifySubsctiptionPlanProps {
  storeName: string;
  onBackAction: () => void;
  currencyCode: string;
  editData?: SellingPlanWithLines; // for edit page
  loading?: boolean; // for edit page
  id?: number; // for edit page
}

export function ModifySubsctiptionPlan({
  onBackAction,
  currencyCode,
  storeName,
  editData,
  loading,
  id,
}: ModifySubsctiptionPlanProps) {
  const { t } = useTranslation();

  const frequencyOption: {
    label: string;
    value: SubscriptionPlanFrequencyUnit;
  }[] = [
    {
      label: t(
        "admin-portal.subscription-plan.create.form.frequency-options.day",
      ),
      value: "daily",
    },
    {
      label: t(
        "admin-portal.subscription-plan.create.form.frequency-options.week",
      ),
      value: "weekly",
    },
    {
      label: t(
        "admin-portal.subscription-plan.create.form.frequency-options.month",
      ),
      value: "monthly",
    },
    {
      label: t(
        "admin-portal.subscription-plan.create.form.frequency-options.year",
      ),
      value: "annually",
    },
  ];

  // frequencies and products
  const [frequencies, setFrequencies] =
    useState<SubscriptionPlanFrequencyOption[]>(initFrequencies());
  const [products, setProducts] = useState<SubscriptionPlanProductOption[]>([]);

  const [productSearchModalOpen, setProductSearchModalOpen] =
    useState<boolean>(true);

  // form data
  const [formData, setFormData] = useState<SubscriptionPlanFormData>({
    title: "",
    description: "",
    company: "",
    companyLocation: "",
    offerDiscount: true,
    discountType: "percentage",
  });

  const [formDataError, setFormDataError] =
    useState<SubscriptionPlanFormDataError>({
      title: {
        isError: false,
        msg: "",
      },
      description: {
        isError: false,
        msg: "",
      },
      offerDiscount: {
        isError: false,
        msg: "",
      },
      discountType: {
        isError: false,
        msg: "",
      },
      company: {
        isError: false,
        msg: "",
      },
      companyLocation: {
        isError: false,
        msg: "",
      },
    });

  // init form data,for edit page
  useEffect(() => {
    if (editData) {
      setFormData({
        title: editData.name,
        description: editData.description,
        company: editData?.companyLocation?.company?.id || "",
        companyLocation: editData?.companyLocation?.id || "",
        offerDiscount: editData.deliveryPolicies?.[0]?.offerDiscount || false,
        discountType: SubscriptionPlanDiscountTypeMap[
          editData.deliveryPolicies?.[0]?.discountType || "percentage"
        ] as SubscriptionPlanDiscountType,
      });

      const frequencies = editData.deliveryPolicies?.map((policy) => ({
        lineId: _.toString(policy.id),
        interval: _.toString(policy.intervalValue),
        unit: policy.intervalUnit as SubscriptionPlanFrequencyUnit,
        value: _.toString(policy.discountValue),
      }));

      const products = editData.lines?.map((line) => {
        const variant = line?.variant;
        const item = {
          productId: _.toString(line.id),
          variantId: _.toString(variant?.id),
          sku: _.toString(variant?.sku),
          quantity: _.toNumber(variant?.quantity || 1),
          title: _.toString(line?.title),
          price: formatPrice(
            _.toNumber(variant?.price || 0),
            _.toString(currencyCode || "USD"),
          ),
          uom: _.toString(variant?.metafield?.value || ""),
          quantityAvailable: _.toNumber(variant?.quantityAvailable || 0),
          imageUrl: _.toString(line?.image?.[0]?.url || ""),
        };
        return item;
      });

      setFrequencies(frequencies);
      setProducts(products);
    }
  }, [editData]);

  const handleAddFrequency = () => {
    setFrequencies([...frequencies, ...initFrequencies()]);
  };

  const handleRemoveFrequency = (id: string) => {
    const index = frequencies.findIndex((frequency) => frequency.lineId === id);
    if (frequencies.length > 1) {
      const newFrequencies = [...frequencies];
      newFrequencies.splice(index, 1);
      setFrequencies(newFrequencies);
    }
  };

  const handleProductSearch = async () => {
    setProductSearchModalOpen(true);
  };

  const handleProductSelect = (
    product: QuickOrderFormSchema["productLines"][string]["product"],
  ) => {
    // check if the product already exists
    const isProductExists = products.some(
      (p) =>
        p.productId === _.toString(product.id) &&
        p.variantId === _.toString(product.variantId),
    );

    if (isProductExists) {
      toast.error(
        t(
          "admin-portal.subscription-plan.create.form.product-search.product-already-selected",
        ),
      );
      return;
    }

    const item = {
      productId: _.toString(product.id),
      variantId: _.toString(product.variantId),
      sku: _.toString(product?.sku),
      title: _.toString(product.name),
      variantTitle: _.toString(product?.variantName),
      imageUrl: _.toString(product?.image),
      quantityAvailable: _.toNumber(product?.quantityAvailable || 0),
      price: formatPrice(
        _.toNumber(product.price.amount || 0),
        _.toString(product.price.currencyCode || "USD"),
      ),
      quantity: _.toNumber(product?.quantityRule?.minimum || 1),
      quantityRule: product?.quantityRule,
      uom: _.toString(product?.uom?.[0] || ""),
    };

    setProducts([...products, item]);
  };

  const handleRemoveProduct = (productId: string) => {
    const newProducts = products.filter(
      (p) =>
        p.productId !== productId.split("-")[0] ||
        p.variantId !== productId.split("-")[1],
    );
    setProducts(newProducts);
  };

  const { mutateAsync: createSubscriptionPlan, isPending: isCreatePending } =
    useCreateSubscriptionPlan();
  const { mutateAsync: updateSubscriptionPlan, isPending: isUpdatePending } =
    useUpdateSubscriptionPlan();
  const queryClient = useQueryClient();
  // save after form custom validation
  const handleSave = () => {
    validSubscriptionPlanForm({
      frequencies,
      setFrequencies,
      formData,
      formDataError,
      setFormDataError,
      products,
      setProducts,
      t,
    })
      .then((isValid) => {
        if (isValid) {
          const baseParams: CreateSellingPlanRequest = {
            storeName: storeName,
            companyLocationId: formData.companyLocation,
            name: formData.title,
            description: formData.description,
            currencyCode: currencyCode,
            lines: products.map((product) => ({
              variantId: product.variantId,
              sku: _.toString(product.sku),
              quantity: _.toNumber(product.quantity),
            })),
            deliveryPolicies: frequencies.map((frequency) => ({
              offerDiscount: formData.offerDiscount,
              intervalValue: _.toNumber(frequency.interval) || 1,
              intervalUnit: frequency.unit as DeliveryPolicy["intervalUnit"],
              discountType: SubscriptionPlanDiscountTypeMap[
                formData.discountType
              ] as DeliveryPolicy["discountType"],
              discountValue: _.toNumber(frequency.value) || 0,
            })),
          };

          // create
          if (!id) {
            const createParams = {
              ...baseParams,
              customerId: SubscriptionPlanCustomerId,
            };
            createSubscriptionPlan(createParams)
              .then((res) => {
                toast.success(
                  t(
                    "admin-portal.subscription-plan.create.form.submit.submit-success",
                  ),
                );
                queryClient.invalidateQueries({
                  queryKey: [QUERY_ALL_SUBSCRIPTION_PLANS],
                });
                onBackAction();
              })
              .catch((error) => {
                console.error("subscription plan create error", error);
                toast.error(
                  t(
                    "admin-portal.subscription-plan.create.form.submit.submit-error",
                    {
                      error: error.message,
                    },
                  ),
                );
              });
          } else {
            // update

            const updateParams = {
              ...baseParams,
              id: _.toNumber(id),
              updatedById: SubscriptionPlanCustomerId,
            };
            updateSubscriptionPlan(updateParams)
              .then((res) => {
                toast.success(
                  t(
                    "admin-portal.subscription-plan.create.form.submit.update-success",
                  ),
                );
                queryClient.invalidateQueries({
                  queryKey: [QUERY_ALL_SUBSCRIPTION_PLANS],
                });
                queryClient.invalidateQueries({
                  queryKey: [QUERY_SUBSCRIPTION_PLAN_BY_ID, { id: id }],
                });
                // onBackAction();
              })
              .catch((err) => {
                console.error("subscription plan update error", err);
                toast.error(
                  t(
                    "admin-portal.subscription-plan.create.form.submit.update-error",
                    {
                      error: err.message,
                    },
                  ),
                );
              });
          }
        } else {
          console.error(
            "subscription plan form validation error",
            formDataError,
          );
          toast.error(
            t("admin-portal.subscription-plan.create.form.submit.vaild-error"),
          );
        }
      })
      .catch((error) => {
        console.error("subscription plan form validation error", error);
      });
  };

  if (loading) {
    return (
      <InlineStack align="center" blockAlign="center">
        <Spinner accessibilityLabel="Small spinner example" size="small" />
      </InlineStack>
    );
  }

  return (
    <Form onSubmit={handleSave}>
      <FormLayout>
        {/* <ProductSearchModal
          open={productSearchModalOpen}
          setOpen={setProductSearchModalOpen}
          storeName={storeName}
          companyLocationId={formData.companyLocation}
          companyId={formData.company}
          onProductSelect={handleProductSelect}
        /> */}
        <SubscriptionPlanFields
          storeName={storeName}
          formData={formData}
          setFormData={setFormData}
          formDataError={formDataError}
          setFormDataError={setFormDataError}
          frequencies={frequencies}
          setFrequencies={setFrequencies}
          productSearchFieldOnChange={handleProductSearch}
          handleRemoveFrequency={handleRemoveFrequency}
          handleAddFrequency={handleAddFrequency}
          currencyCode={editData?.currencyCode || currencyCode}
          frequencyOption={frequencyOption}
          products={products}
          setProducts={setProducts}
          onProductSelect={handleProductSelect}
          onRemoveProduct={handleRemoveProduct}
        />
        <PageActions
          primaryAction={
            <Button
              variant="primary"
              submit
              disabled={products.length === 0}
              loading={isCreatePending || isUpdatePending}
            >
              {t("admin-portal.subscription-plan.create.form.submit.label")}
            </Button>
          }
        />
      </FormLayout>
    </Form>
  );
}
