import { useNavigate, useSearchParams } from "@remix-run/react";
import _ from "lodash";
import { ChevronLeft } from "lucide-react";
import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import SubscriptionOrderCreateInformationForm, {
  type SubscriptionOrderCreateInformationFormRef,
} from "~/components/subscription-orders/create/SubscriptionOrderCreateInformationForm";
import RecommendForYou from "~/components/subscription-orders/recommend-for-you/RecommendForYou";
import { SubscriptionOrderContext } from "~/context/subscription-order.context";
import { useCheckIsValidSubscriptionPlanV2 } from "~/hooks/use-subscription-plan";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { useShopifyInformation } from "~/lib/shopify";
import { cn } from "~/lib/utils";

export function SubsciptionCreateOrder({ className }: { className?: string }) {
  const { t } = useTranslation();
  const context = useContext(SubscriptionOrderContext);
  const { storeName } = useShopifyInformation();
  const [searchParams] = useSearchParams();
  const subscriptionPlanId = searchParams.get("subscriptionPlanId");
  const frequencyId = searchParams.get("frequencyId");
  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();

  const ref = useRef<SubscriptionOrderCreateInformationFormRef>(null);

  const handleAddRecommendedProductAtForm = (skus: string[]) => {
    ref.current?.handleAddRecommendedProductAtForm(
      skus,
      context?.companyLocationId || "",
      {
        addType: "to-the-end",
        cleanStorage: true,
      },
    );
  };

  const {
    data: isValidSubscriptionPlan,
    isLoading: isLoadingSubscriptionPlan,
  } = useCheckIsValidSubscriptionPlanV2({
    storeName,
    id: _.toNumber(subscriptionPlanId),
    frequencyId: _.toString(frequencyId),
  });

  const handleRechoosePlan = () => {
    navigate(
      addLocalePath(`/apps/customer-account/subscription-orders/choose-plan`),
    );
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center gap-x-4">
        <div
          className="text-secondary-foreground font-bold flex items-center gap-0 cursor-pointer text-sm no-print"
          onClick={handleRechoosePlan}
        >
          <ChevronLeft size={28} strokeWidth={3} />
          {t("common.text.back")}
        </div>
        <h1 className="text-2xl font-bold">
          {t("subscription-orders.create.title")}
        </h1>
      </div>
      <SubscriptionOrderCreateInformationForm
        ref={ref}
        type="create"
        plan={isValidSubscriptionPlan}
        usedPlan={!!isValidSubscriptionPlan}
      />
      {!isValidSubscriptionPlan && !isLoadingSubscriptionPlan && (
        <RecommendForYou
          handleAddRecommendedProductAtForm={handleAddRecommendedProductAtForm}
          companyLocationId={context?.companyLocationId || undefined}
          isAddingRecommendedProduct={context?.isAddingRecommendedProduct}
          isAddingRecommendedProductSkus={
            context?.isAddingRecommendedProductSkus || []
          }
        />
      )}
    </div>
  );
}
