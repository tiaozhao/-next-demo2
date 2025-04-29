import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

export function SubscriptionPlanActionBox({
  title,
  description,
  onApply,
}: {
  title: string;
  description?: string;
  onApply: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white flex justify-between items-center px-4 py-[10px] border rounded-lg border-border">
      <div className="text-sm font-bold text-gray-700">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
      <Button variant={"outline"} onClick={onApply}>
        {t("subscription-orders.choose-plan.action.apply")}
      </Button>
    </div>
  );
}
