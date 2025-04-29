import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { SubscriptionPlanList } from "./SubscriptionPlanList";
import { useAddLocalePath } from "~/hooks/utils.hooks";
import { Button } from "~/components/ui/button";
import RequestQuoteNew from "~/components/icons/RequestQuoteNew";

export function SubscriptionPlanChooseRoute() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { addLocalePath } = useAddLocalePath();
  const handleShowCreateForm = () => {
    navigate(
      addLocalePath(
        "/apps/customer-account/subscription-orders/create-subscription",
      ),
    );
  };
  return (
    <div className="container mx-auto">
      <div className="space-y-5">
        {/* title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">
            {t("subscription-orders.choose-plan.title")}
          </h1>
          {/* no plan */}
          <div>
            <Button
              onClick={handleShowCreateForm}
              variant={"link"}
              size={"sm"}
              className="text-secondary-foreground hover:text-secondary-foreground gap-1 font-bold px-0 truncate"
            >
              {" "}
              <RequestQuoteNew className="!w-6 !h-6" />
              <div className="truncate">
                {t(
                  "subscription-orders.choose-plan.create-empty-subscription-order",
                )}
              </div>
            </Button>
          </div>
        </div>

        {/* plan list */}
        <SubscriptionPlanList />
      </div>
    </div>
  );
}
