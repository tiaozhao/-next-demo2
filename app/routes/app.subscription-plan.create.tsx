import { Page } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { ModifySubsctiptionPlan } from "~/components/admin-portal/subscription-plan/ModifySubsctiptionPlan";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { useAdminPortalShop } from "~/hooks/use-shop";
import ChangeLanguageSelector from "~/components/admin-portal/ChangeLanguageSelctor";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function SubscriptionPlanCreate() {
  const { shop: storeName } = useLoaderData<typeof loader>();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: shop } = useAdminPortalShop();

  const handleBackAction = () => {
    navigate("/app/subscription-plan");
  };

  return (
    <Page
      title="Create Subscription Plan"
      backAction={{
        id: "subscription-plan-create",
        content: t("common.text.back"),
        accessibilityLabel: t("common.text.back"),
        onAction: handleBackAction,
      }}
    >
      <div className="flex justify-end mb-4">
        <ChangeLanguageSelector />
      </div>
      <ModifySubsctiptionPlan
        onBackAction={handleBackAction}
        currencyCode={shop?.currencyCode || "USD"}
        storeName={storeName}
      />
    </Page>
  );
}
